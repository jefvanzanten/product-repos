import { type CatalogBrowseResponse, type CatalogProductGroup, type CatalogProductList, type CatalogProductRow, type CatalogSearchResponse } from "@product-repos/contracts";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { brand, product } from "../db/schema";
import { err, ok, type Result } from "../domain";
import { findBrandById } from "./brands.repository";
import { buildCatalogCategoryContext, findCatalogCategoryByPath, findCatalogCategoryRowById, findCategoryById, findCategoryPath, type CategoryContext } from "./category.repository";
import { findProductPackages } from "./product-packages.repository";

export type BrowseCatalogInput = {
  readonly categoryId?: number;
  readonly brandId?: string;
  readonly limit: number;
};

export type SearchCatalogInput = {
  readonly query: string;
  readonly productLimit: number;
  readonly brandLimit: number;
  readonly categoryLimit: number;
};

const productListLimit = 50;

/** Search catalog products, brands and categories for the admin product catalog. */
export function searchCatalog(input: SearchCatalogInput): CatalogSearchResponse {
  const query = input.query.trim().toLowerCase();
  if (query.length < 2) return { products: [], brands: [], categories: [], hasMore: { products: false, brands: false, categories: false } };

  const categoryContext = buildCatalogCategoryContext();
  const matchingProductRows = findCatalogProductRows()
    .filter((row) => {
      const categoryPath = categoryContext.pathById.get(row.categoryId) ?? "";
      return row.name.toLowerCase().includes(query)
        || (row.brandName?.toLowerCase().includes(query) ?? false)
        || categoryPath.toLowerCase().includes(query);
    });
  const products = matchingProductRows
    .slice(0, input.productLimit)
    .map((row) => makeCatalogProductRow(row, categoryContext));

  const matchingBrands = db.select({ id: brand.id, name: brand.name }).from(brand).orderBy(asc(sql`lower(${brand.name})`)).all()
    .filter((row) => row.name.toLowerCase().includes(query));
  const brands = matchingBrands
    .slice(0, input.brandLimit)
    .map((row) => ({ ...row, productCount: countProductsForBrand(row.id) }));

  const matchingCategories = [...categoryContext.categoryRows]
    .filter((row) => row.path.toLowerCase().includes(query))
    .sort((left, right) => left.path.localeCompare(right.path, "nl", { sensitivity: "base" }));
  const categories = matchingCategories.slice(0, input.categoryLimit);

  return {
    products,
    brands,
    categories,
    hasMore: {
      products: products.length < matchingProductRows.length,
      brands: brands.length < matchingBrands.length,
      categories: categories.length < matchingCategories.length,
    },
  };
}

/** Browse the catalog root, one category, or one selected brand. */
export function browseCatalog(input: BrowseCatalogInput): Result<CatalogBrowseResponse> {
  const categoryContext = buildCatalogCategoryContext();
  if (input.categoryId !== undefined) return browseCategory(input.categoryId, input.limit, categoryContext);
  if (input.brandId !== undefined) return browseBrand(input.brandId, input.limit, categoryContext);

  const totalProductCount = countAllProducts();
  return ok({
    state: "root",
    categories: categoryContext.categoryRows.filter((row) => row.parentId === null && row.productCount > 0),
    isEmpty: totalProductCount === 0,
  });
}

function browseCategory(categoryId: number, limit: number, categoryContext: CategoryContext): Result<CatalogBrowseResponse> {
  const categoryRow = findCategoryById(categoryId);
  if (!categoryRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Category not found" });
  const categoryPath = findCategoryPath(categoryRow.id);
  const categoryItem = findCatalogCategoryRowById(categoryId, categoryContext);
  if (!categoryItem) return err({ code: "REFERENCE_NOT_FOUND", message: "Category not found" });
  const directProducts = findCatalogProductRows()
    .filter((row) => row.categoryId === categoryId)
    .map((row) => makeCatalogProductRow(row, categoryContext));
  const page = paginateProducts(directProducts, limit);

  return ok({
    state: "category",
    category: categoryItem,
    categoryPath,
    subcategories: categoryContext.categoryRows.filter((row) => row.parentId === categoryId),
    products: page,
  });
}

function browseBrand(brandId: string, limit: number, categoryContext: CategoryContext): Result<CatalogBrowseResponse> {
  const brandRow = findBrandById(brandId);
  if (!brandRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Brand not found" });
  const rows = findCatalogProductRows()
    .filter((row) => row.brandId === brandId)
    .map((row) => makeCatalogProductRow(row, categoryContext));
  const page = paginateProducts(rows, limit);
  const productGroups = groupProductsByCategory(page.items, categoryContext);

  return ok({
    state: "brand",
    brand: { id: brandRow.id, name: brandRow.name },
    productGroups,
    hasMore: page.hasMore,
    cursor: page.cursor,
  });
}

type CatalogProductRecord = {
  readonly id: string;
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
  readonly brandName: string | null;
};

function findCatalogProductRows(): CatalogProductRecord[] {
  return db.select({
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    brandId: product.brandId,
    brandName: brand.name,
  })
    .from(product)
    .leftJoin(brand, eq(product.brandId, brand.id))
    .orderBy(asc(sql`lower(${brand.name})`), asc(sql`lower(${product.name})`))
    .all()
    .sort((left, right) => compareProductRecords(left, right));
}

function compareProductRecords(left: CatalogProductRecord, right: CatalogProductRecord): number {
  const leftCategoryPath = findCategoryPath(left.categoryId).map((item) => item.name).join(" > ");
  const rightCategoryPath = findCategoryPath(right.categoryId).map((item) => item.name).join(" > ");
  const categoryOrder = leftCategoryPath.localeCompare(rightCategoryPath, "nl", { sensitivity: "base" });
  if (categoryOrder !== 0) return categoryOrder;
  const brandOrder = (left.brandName ?? "").localeCompare(right.brandName ?? "", "nl", { sensitivity: "base" });
  if (brandOrder !== 0) return brandOrder;
  return left.name.localeCompare(right.name, "nl", { sensitivity: "base" });
}

function makeCatalogProductRow(row: CatalogProductRecord, categoryContext: CategoryContext): CatalogProductRow {
  return {
    id: row.id,
    displayName: formatProductDisplayName(row.name, row.brandName),
    brand: row.brandId === null || row.brandName === null ? null : { id: row.brandId, name: row.brandName },
    categoryPath: categoryContext.pathById.get(row.categoryId) ?? "",
    packageSummary: summarizeProductPackages(row.id),
  };
}

function summarizeProductPackages(productId: string): string {
  const packages = findProductPackages(productId);
  const firstPackage = packages[0];
  if (packages.length === 0) return "Geen verpakking";
  if (packages.length === 1 && firstPackage) return firstPackage.summary;
  return `${packages.length} verpakkingen`;
}

function paginateProducts(products: ReadonlyArray<CatalogProductRow>, limit: number): CatalogProductList {
  const pageLimit = Number.isInteger(limit) && limit > 0 ? limit : productListLimit;
  const items = products.slice(0, pageLimit);
  const nextLimit = items.length + productListLimit;
  return { items, hasMore: items.length < products.length, cursor: items.length < products.length ? String(nextLimit) : null };
}

function groupProductsByCategory(products: ReadonlyArray<CatalogProductRow>, categoryContext: CategoryContext): CatalogProductGroup[] {
  const groups = new Map<string, CatalogProductGroup>();
  for (const productRow of products) {
    const categoryPath = productRow.categoryPath;
    const categoryDto = findCatalogCategoryByPath(categoryPath, categoryContext);
    const current = groups.get(categoryPath);
    if (current) {
      current.products.push(productRow);
    } else {
      groups.set(categoryPath, { category: categoryDto, categoryPath, products: [productRow] });
    }
  }
  return [...groups.values()];
}

function countAllProducts(): number {
  const row = db.select({ count: sql<number>`count(*)` }).from(product).get();
  return row?.count ?? 0;
}

function countProductsForBrand(brandId: string): number {
  const row = db.select({ count: sql<number>`count(*)` }).from(product).where(eq(product.brandId, brandId)).get();
  return row?.count ?? 0;
}

function formatProductDisplayName(name: string, brandName: string | null): string {
  return brandName ? `${brandName} ${name}` : name;
}
