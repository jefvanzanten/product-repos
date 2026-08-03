import type {
  CatalogBrowseResponse,
  CatalogCategoryRow,
  CatalogProductRow,
  CatalogSearchResponse,
} from "@product-repos/contracts";
import { err, ok, type Result } from "../domain/catalog-domain.ts";
import { findCategoryPath, formatCategoryPath } from "../domain/category-path.ts";
import type { BrandRepository, BrandRow } from "../internal/brands.repository.ts";
import type { CategoryRepository, CategoryRow } from "../internal/category.repository.ts";
import type { ProductPackageRepository } from "../internal/product-packages.repository.ts";
import type { ProductRepository, ProductRow } from "../internal/products.repository.ts";

/** Catalog query capabilities consumed by product routes. */
export type CatalogQueryService = {
  readonly browseProductCatalog: (input: { readonly categoryId?: number; readonly brandId?: string; readonly limit: number }) => Result<CatalogBrowseResponse>;
  readonly searchProductCatalog: (input: { readonly query: string; readonly productLimit: number; readonly brandLimit: number; readonly categoryLimit: number }) => CatalogSearchResponse;
};

/** Create catalog query use cases from focused persistence capabilities. */
export function createCatalogQueryService(dependencies: {
  readonly brands: Pick<BrandRepository, "findAllBrands" | "findBrandById">;
  readonly categories: Pick<CategoryRepository, "findAllCategories" | "findCategoryById">;
  readonly packages: Pick<ProductPackageRepository, "findProductPackageFullRows" | "toProductPackageDto">;
  readonly products: Pick<ProductRepository, "compareProductRows" | "displayProductName" | "findAllProductRows">;
}): CatalogQueryService {
  const { findAllBrands, findBrandById } = dependencies.brands;
  const { findAllCategories, findCategoryById } = dependencies.categories;
  const { findProductPackageFullRows, toProductPackageDto } = dependencies.packages;
  const { compareProductRows, displayProductName, findAllProductRows } = dependencies.products;

function browseProductCatalog(input: { readonly categoryId?: number; readonly brandId?: string; readonly limit: number }): Result<CatalogBrowseResponse> {
  if (input.categoryId !== undefined) return browseCategory(input.categoryId, input.limit);
  if (input.brandId !== undefined) return browseBrand(input.brandId, input.limit);

  const categories = findAllCategories();
  const productRows = findAllProductRows();
  const rootCategories = categories.filter((row) => row.parentId === null).map((row) => toCatalogCategoryRow(row, categories, productRows));
  return ok({ state: "root", categories: rootCategories, isEmpty: rootCategories.length === 0 });
}

function searchProductCatalog(input: {
  readonly query: string;
  readonly productLimit: number;
  readonly brandLimit: number;
  readonly categoryLimit: number;
}): CatalogSearchResponse {
  const trimmedQuery = input.query.trim().toLowerCase();
  if (trimmedQuery.length < 2) return emptySearchResponse();

  const categories = findAllCategories();
  const productRows = findAllProductRows();
  const brands = findAllBrands();
  const productRowsWithMeta = productRows.map((row) => ({
    row,
    brandRow: row.brandId ? brands.find((candidate) => candidate.id === row.brandId) ?? null : null,
    categoryPath: formatCategoryPath(findCategoryPath(row.categoryId, categories)),
  }));

  const matchedProducts = productRowsWithMeta
    .filter(({ row, brandRow, categoryPath }) => [row.name, brandRow?.name ?? "", categoryPath].some((value) => value.toLowerCase().includes(trimmedQuery)))
    .sort((left, right) => displayProductName(left.row, left.brandRow).localeCompare(displayProductName(right.row, right.brandRow), "nl", { sensitivity: "base" }));

  const matchedBrands = brands
    .filter((row) => row.name.toLowerCase().includes(trimmedQuery))
    .sort((left, right) => left.name.localeCompare(right.name, "nl", { sensitivity: "base" }));

  const matchedCategories = categories
    .map((row) => toCatalogCategoryRow(row, categories, productRows))
    .filter((row) => row.path.toLowerCase().includes(trimmedQuery))
    .sort((left, right) => left.path.localeCompare(right.path, "nl", { sensitivity: "base" }));

  return {
    products: matchedProducts.slice(0, input.productLimit).map(({ row, brandRow, categoryPath }) => toCatalogProductRow(row, brandRow, categoryPath)),
    brands: matchedBrands.slice(0, input.brandLimit).map((row) => ({ id: row.id, name: row.name, productCount: productRows.filter((productRow) => productRow.brandId === row.id).length })),
    categories: matchedCategories.slice(0, input.categoryLimit),
    hasMore: {
      products: matchedProducts.length > input.productLimit,
      brands: matchedBrands.length > input.brandLimit,
      categories: matchedCategories.length > input.categoryLimit,
    },
  };
}

function browseCategory(categoryId: number, limit: number): Result<CatalogBrowseResponse> {
  const categoryRow = findCategoryById(categoryId);
  if (!categoryRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Category not found" });

  const categories = findAllCategories();
  const productRows = findAllProductRows();
  const categoryPath = findCategoryPath(categoryId, categories);
  const subcategories = categories.filter((row) => row.parentId === categoryId).map((row) => toCatalogCategoryRow(row, categories, productRows));
  const directProducts = productRows.filter((row) => row.categoryId === categoryId).sort(compareProductRows).slice(0, limit + 1);

  return ok({
    state: "category",
    category: toCatalogCategoryRow(categoryRow, categories, productRows),
    categoryPath,
    subcategories,
    products: {
      items: directProducts.slice(0, limit).map((row) => toCatalogProductRow(row, row.brandId ? findBrandById(row.brandId) ?? null : null, formatCategoryPath(categoryPath))),
      hasMore: directProducts.length > limit,
      cursor: directProducts.length > limit ? String(limit * 2) : null,
    },
  });
}

function browseBrand(brandId: string, limit: number): Result<CatalogBrowseResponse> {
  const brandRow = findBrandById(brandId);
  if (!brandRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Brand not found" });

  const categories = findAllCategories();
  const brandProducts = findAllProductRows().filter((row) => row.brandId === brandId).sort(compareProductRows).slice(0, limit + 1);
  const groupsByCategoryId = new Map<number, CatalogProductRow[]>();

  for (const row of brandProducts.slice(0, limit)) {
    const categoryPath = formatCategoryPath(findCategoryPath(row.categoryId, categories));
    const products = groupsByCategoryId.get(row.categoryId) ?? [];
    products.push(toCatalogProductRow(row, brandRow, categoryPath));
    groupsByCategoryId.set(row.categoryId, products);
  }

  const productGroups = [...groupsByCategoryId.entries()].map(([categoryId, products]) => {
    const categoryRow = categories.find((row) => row.id === categoryId);
    return {
      category: categoryRow ? { id: categoryRow.id, name: categoryRow.name, parentId: categoryRow.parentId } : { id: categoryId, name: "Onbekende categorie", parentId: null },
      categoryPath: categoryRow ? formatCategoryPath(findCategoryPath(categoryRow.id, categories)) : "Onbekende categorie",
      products,
    };
  });

  productGroups.sort((left, right) => left.categoryPath.localeCompare(right.categoryPath, "nl", { sensitivity: "base" }));
  return ok({ state: "brand", brand: { id: brandRow.id, name: brandRow.name }, productGroups, hasMore: brandProducts.length > limit, cursor: brandProducts.length > limit ? String(limit * 2) : null });
}

/** Project a product row into the catalog response contract. */
function toCatalogProductRow(productRow: ProductRow, brandRow: BrandRow | null, categoryPath: string): CatalogProductRow {
  const firstPackage = findProductPackageFullRows(productRow.id)[0];
  return {
    id: productRow.id,
    displayName: displayProductName(productRow, brandRow),
    brand: brandRow ? { id: brandRow.id, name: brandRow.name } : null,
    consumptionType: productRow.consumptionType,
    categoryPath,
    packageSummary: firstPackage ? toProductPackageDto(firstPackage).summary : "Geen verpakking",
  };
}

function toCatalogCategoryRow(categoryRow: CategoryRow, categories: ReadonlyArray<CategoryRow>, productRows: ReadonlyArray<ProductRow>): CatalogCategoryRow {
  return {
    id: categoryRow.id,
    name: categoryRow.name,
    parentId: categoryRow.parentId,
    path: formatCategoryPath(findCategoryPath(categoryRow.id, categories)),
    productCount: countProductsInSubtree(categoryRow.id, categories, productRows),
  };
}

function countProductsInSubtree(categoryId: number, categories: ReadonlyArray<CategoryRow>, productRows: ReadonlyArray<ProductRow>): number {
  const categoryIds = new Set<number>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of categories) {
      if (row.parentId === null || !categoryIds.has(row.parentId) || categoryIds.has(row.id)) continue;
      categoryIds.add(row.id);
      changed = true;
    }
  }
  return productRows.filter((row) => categoryIds.has(row.categoryId)).length;
}

function emptySearchResponse(): CatalogSearchResponse {
  return { products: [], brands: [], categories: [], hasMore: { products: false, brands: false, categories: false } };
}

  return { browseProductCatalog, searchProductCatalog };
}
