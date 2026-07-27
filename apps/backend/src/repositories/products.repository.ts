import { formatProductPackageSummary, type CatalogBrowseResponse, type CatalogCategoryRow, type CatalogProductGroup, type CatalogProductList, type CatalogProductRow, type CatalogSearchResponse, type CategoryDto, type ProductCreatedDto, type ProductDetailDto, type ProductPackageCoreDto, type ProductPackageDetailDto, type ProductPackageDto } from "@product-repos/contracts";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { brand, category, packageType, product, productPackage, unitContent, unitType } from "../db/schema";
import { err, ok, type Result } from "../domain";
import { findBrandById } from "./brands.repository";
import { findCategoryById } from "./category.repository";
import { isSqliteUniqueConstraintViolation } from "./sqlite-errors";
import { findPackageTypeById, findUnitTypeById } from "./units.repository";

export type CreateProductInput = {
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
  readonly package: { readonly packageTypeId: number; readonly amount: string; readonly unitTypeId: number; readonly unitsPerPackage: number };
};

export type UpdateProductInput = {
  readonly productId: string;
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
};

export type ProductPackageMutationInput = {
  readonly productId: string;
  readonly packageTypeId: number;
  readonly amount: string;
  readonly unitTypeId: number;
  readonly unitsPerPackage: number;
};

export type UpdateProductPackageInput = ProductPackageMutationInput & {
  readonly packageId: string;
};

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

export function createProduct(input: CreateProductInput): Result<ProductCreatedDto> {
  const categoryRow = findCategoryById(input.categoryId);
  const brandRow = input.brandId === null ? null : findBrandById(input.brandId);
  const unitTypeRow = findUnitTypeById(input.package.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.package.packageTypeId);
  if (!categoryRow || (input.brandId !== null && !brandRow) || !unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const duplicate = findDuplicateProduct(input);
  if (duplicate) return err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: duplicate.id });

  const created = (() => {
    try {
      return ok(db.transaction((tx) => {
        const amountNumber = Number(input.package.amount);
        let unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.package.unitTypeId), eq(unitContent.amount, amountNumber))).get();
        if (!unitContentRow) {
          try {
            unitContentRow = tx.insert(unitContent).values({ unitTypeId: input.package.unitTypeId, amount: amountNumber }).returning().get();
          } catch (error) {
            if (!isSqliteUniqueConstraintViolation(error)) throw error;
            unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.package.unitTypeId), eq(unitContent.amount, amountNumber))).get();
            if (!unitContentRow) throw error;
          }
        }
        const productRow = tx.insert(product).values({ name: input.name, categoryId: input.categoryId, brandId: input.brandId }).returning().get();
        const productPackageRow = tx.insert(productPackage).values({ productId: productRow.id, unitContentId: unitContentRow.id, packageTypeId: input.package.packageTypeId, unitsPerPackage: input.package.unitsPerPackage }).returning().get();
        return { productRow, unitContentRow, productPackageRow };
      }));
    } catch (error) {
      if (!isSqliteUniqueConstraintViolation(error)) throw error;
      const existingProduct = findDuplicateProduct(input);
      return existingProduct
        ? err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: existingProduct.id })
        : err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists" });
    }
  })();
  if (!created.ok) return created;

  return ok({
    id: created.value.productRow.id,
    name: created.value.productRow.name,
    category: { id: categoryRow.id, name: categoryRow.name, parentId: categoryRow.parentId },
    brand: brandRow ? { id: brandRow.id, name: brandRow.name } : null,
    package: makeProductPackageDto({
      id: created.value.productPackageRow.id,
      packageType: { id: packageTypeRow.id, name: packageTypeRow.name },
      unitContent: { id: created.value.unitContentRow.id, amount: input.package.amount, unitType: { id: unitTypeRow.id, name: unitTypeRow.name } },
      unitsPerPackage: created.value.productPackageRow.unitsPerPackage,
    }),
  });
}

/** Update product identity fields and return the refreshed detail projection. */
export function updateProduct(input: UpdateProductInput): Result<ProductDetailDto> {
  const productRow = db.select().from(product).where(eq(product.id, input.productId)).get();
  if (!productRow) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const categoryRow = findCategoryById(input.categoryId);
  const brandRow = input.brandId === null ? null : findBrandById(input.brandId);
  if (!categoryRow || (input.brandId !== null && !brandRow)) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const duplicate = findDuplicateProduct(input, input.productId);
  if (duplicate) return err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: duplicate.id });

  try {
    db.update(product)
      .set({ name: input.name, categoryId: input.categoryId, brandId: input.brandId })
      .where(eq(product.id, input.productId))
      .run();
  } catch (error) {
    if (!isSqliteUniqueConstraintViolation(error)) throw error;
    const existingProduct = findDuplicateProduct(input, input.productId);
    return existingProduct
      ? err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: existingProduct.id })
      : err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists" });
  }

  return findProductDetailById(input.productId);
}

/** Create one package for an existing product and return its detail projection. */
export function createProductPackage(input: ProductPackageMutationInput): Result<ProductPackageDetailDto> {
  const productRow = db.select({ id: product.id }).from(product).where(eq(product.id, input.productId)).get();
  if (!productRow) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const unitTypeRow = findUnitTypeById(input.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.packageTypeId);
  if (!unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const created = (() => {
    try {
      return db.transaction((tx): Result<{ readonly productPackageId: string }> => {
        const amountNumber = Number(input.amount);
        let unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.unitTypeId), eq(unitContent.amount, amountNumber))).get();
        if (!unitContentRow) {
          try {
            unitContentRow = tx.insert(unitContent).values({ unitTypeId: input.unitTypeId, amount: amountNumber }).returning().get();
          } catch (error) {
            if (!isSqliteUniqueConstraintViolation(error)) throw error;
            unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.unitTypeId), eq(unitContent.amount, amountNumber))).get();
            if (!unitContentRow) throw error;
          }
        }

        const duplicate = tx.select({ id: productPackage.id })
          .from(productPackage)
          .where(and(
            eq(productPackage.productId, input.productId),
            eq(productPackage.packageTypeId, input.packageTypeId),
            eq(productPackage.unitContentId, unitContentRow.id),
            eq(productPackage.unitsPerPackage, input.unitsPerPackage),
          ))
          .get();
        if (duplicate) return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });

        const productPackageRow = tx.insert(productPackage)
          .values({ productId: input.productId, unitContentId: unitContentRow.id, packageTypeId: input.packageTypeId, unitsPerPackage: input.unitsPerPackage })
          .returning({ id: productPackage.id })
          .get();
        return ok({ productPackageId: productPackageRow.id });
      });
    } catch (error) {
      if (!isSqliteUniqueConstraintViolation(error)) throw error;
      return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });
    }
  })();
  if (!created.ok) return created;

  return findProductPackageDetailById(input.productId, created.value.productPackageId);
}

/** Find one package detail projection for a product/package pair. */
export function findProductPackageDetailById(productId: string, packageId: string): Result<ProductPackageDetailDto> {
  const productRow = db.select({ id: product.id }).from(product).where(eq(product.id, productId)).get();
  if (!productRow) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const packageDto = findProductPackageByProductId(productId, packageId);
  if (!packageDto) return err({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });
  return ok(packageDto);
}

/** Update one package and return its refreshed detail projection. */
export function updateProductPackage(input: UpdateProductPackageInput): Result<ProductPackageDetailDto> {
  const productRow = db.select({ id: product.id }).from(product).where(eq(product.id, input.productId)).get();
  if (!productRow) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const currentPackage = db.select({ id: productPackage.id }).from(productPackage).where(and(eq(productPackage.id, input.packageId), eq(productPackage.productId, input.productId))).get();
  if (!currentPackage) return err({ code: "PRODUCT_PACKAGE_NOT_FOUND", message: "Product package not found" });

  const unitTypeRow = findUnitTypeById(input.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.packageTypeId);
  if (!unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const updated = (() => {
    try {
      return db.transaction((tx): Result<{ readonly packageId: string }> => {
        const amountNumber = Number(input.amount);
        let unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.unitTypeId), eq(unitContent.amount, amountNumber))).get();
        if (!unitContentRow) {
          try {
            unitContentRow = tx.insert(unitContent).values({ unitTypeId: input.unitTypeId, amount: amountNumber }).returning().get();
          } catch (error) {
            if (!isSqliteUniqueConstraintViolation(error)) throw error;
            unitContentRow = tx.select().from(unitContent).where(and(eq(unitContent.unitTypeId, input.unitTypeId), eq(unitContent.amount, amountNumber))).get();
            if (!unitContentRow) throw error;
          }
        }

        const duplicate = tx.select({ id: productPackage.id })
          .from(productPackage)
          .where(and(
            eq(productPackage.productId, input.productId),
            eq(productPackage.packageTypeId, input.packageTypeId),
            eq(productPackage.unitContentId, unitContentRow.id),
            eq(productPackage.unitsPerPackage, input.unitsPerPackage),
          ))
          .all()
          .find((row) => row.id !== input.packageId);
        if (duplicate) return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });

        tx.update(productPackage)
          .set({ packageTypeId: input.packageTypeId, unitContentId: unitContentRow.id, unitsPerPackage: input.unitsPerPackage })
          .where(and(eq(productPackage.id, input.packageId), eq(productPackage.productId, input.productId)))
          .run();
        return ok({ packageId: input.packageId });
      });
    } catch (error) {
      if (!isSqliteUniqueConstraintViolation(error)) throw error;
      return err({ code: "PRODUCT_PACKAGE_ALREADY_EXISTS", message: "Product package already exists" });
    }
  })();
  if (!updated.ok) return updated;

  return findProductPackageDetailById(input.productId, updated.value.packageId);
}

/** Find one product detail projection by product UUID. */
export function findProductDetailById(productId: string): Result<ProductDetailDto> {
  const productRow = db.select().from(product).where(eq(product.id, productId)).get();
  if (!productRow) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const categoryRow = findCategoryById(productRow.categoryId);
  const brandRow = productRow.brandId === null ? null : findBrandById(productRow.brandId);
  if (!categoryRow || (productRow.brandId !== null && !brandRow)) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  return ok({
    id: productRow.id,
    name: productRow.name,
    displayName: formatProductDisplayName(productRow.name, brandRow?.name ?? null),
    category: { id: categoryRow.id, name: categoryRow.name, parentId: categoryRow.parentId },
    categoryPath: findCategoryPath(categoryRow.id),
    brand: brandRow ? { id: brandRow.id, name: brandRow.name } : null,
    packages: findProductPackages(productRow.id),
  });
}

/** Search catalog products, brands and categories for the admin product catalog. */
export function searchCatalog(input: SearchCatalogInput): CatalogSearchResponse {
  const query = input.query.trim().toLowerCase();
  if (query.length < 2) return { products: [], brands: [], categories: [], hasMore: { products: false, brands: false, categories: false } };

  const categoryContext = buildCategoryContext();
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
  const categoryContext = buildCategoryContext();
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
  const categoryItem = categoryContext.rowById.get(categoryId) ?? makeCatalogCategoryRow({ id: categoryRow.id, name: categoryRow.name, parentId: categoryRow.parentId }, categoryContext);
  const directProducts = findCatalogProductRows()
    .filter((row) => row.categoryId === categoryId)
    .map((row) => makeCatalogProductRow(row, categoryContext));
  const page = paginateProducts(directProducts, limit);

  return ok({
    state: "category",
    category: categoryItem,
    categoryPath,
    subcategories: categoryContext.categoryRows.filter((row) => row.parentId === categoryId && row.productCount > 0),
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

type ProductIdentityInput = {
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
};

function findDuplicateProduct(input: ProductIdentityInput, excludedProductId?: string): typeof product.$inferSelect | undefined {
  const normalizedName = input.name.trim().toLowerCase();
  const rows = input.brandId === null
    ? db.select().from(product).where(sql`${product.brandId} IS NULL AND ${product.categoryId} = ${input.categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).all()
    : db.select().from(product).where(sql`${product.brandId} = ${input.brandId} AND ${product.categoryId} = ${input.categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).all();
  return rows.find((row) => row.id !== excludedProductId);
}

function findProductPackageByProductId(productId: string, packageId: string): ProductPackageDetailDto | undefined {
  const row = db.select({
    id: productPackage.id,
    productId: productPackage.productId,
    packageTypeId: packageType.id,
    packageTypeName: packageType.name,
    unitContentId: unitContent.id,
    amount: unitContent.amount,
    unitTypeId: unitType.id,
    unitTypeName: unitType.name,
    unitsPerPackage: productPackage.unitsPerPackage,
  })
    .from(productPackage)
    .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
    .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
    .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
    .where(and(eq(productPackage.id, packageId), eq(productPackage.productId, productId)))
    .get();

  if (!row) return undefined;
  return {
    ...makeProductPackageDto({
      id: row.id,
      packageType: { id: row.packageTypeId, name: row.packageTypeName },
      unitContent: { id: row.unitContentId, amount: String(row.amount), unitType: { id: row.unitTypeId, name: row.unitTypeName } },
      unitsPerPackage: row.unitsPerPackage,
    }),
    productId: row.productId,
  };
}

function findProductPackages(productId: string): ProductPackageDto[] {
  const rows = db.select({
    id: productPackage.id,
    packageTypeId: packageType.id,
    packageTypeName: packageType.name,
    unitContentId: unitContent.id,
    amount: unitContent.amount,
    unitTypeId: unitType.id,
    unitTypeName: unitType.name,
    unitsPerPackage: productPackage.unitsPerPackage,
  })
    .from(productPackage)
    .innerJoin(packageType, eq(productPackage.packageTypeId, packageType.id))
    .innerJoin(unitContent, eq(productPackage.unitContentId, unitContent.id))
    .innerJoin(unitType, eq(unitContent.unitTypeId, unitType.id))
    .where(eq(productPackage.productId, productId))
    .orderBy(asc(sql`lower(${packageType.name})`), asc(unitContent.amount), asc(productPackage.unitsPerPackage))
    .all();

  return rows.map((row) => makeProductPackageDto({
    id: row.id,
    packageType: { id: row.packageTypeId, name: row.packageTypeName },
    unitContent: { id: row.unitContentId, amount: String(row.amount), unitType: { id: row.unitTypeId, name: row.unitTypeName } },
    unitsPerPackage: row.unitsPerPackage,
  }));
}

function makeProductPackageDto(packageDto: ProductPackageCoreDto): ProductPackageDto {
  return { ...packageDto, summary: formatProductPackageSummary(packageDto) };
}

type CatalogProductRecord = {
  readonly id: string;
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
  readonly brandName: string | null;
};

type CategoryContext = {
  readonly categoryRows: ReadonlyArray<CatalogCategoryRow>;
  readonly pathById: ReadonlyMap<number, string>;
  readonly pathItemsById: ReadonlyMap<number, ReadonlyArray<CategoryDto>>;
  readonly rowById: ReadonlyMap<number, CatalogCategoryRow>;
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
    const categoryDto = findCategoryByPath(categoryPath, categoryContext);
    const current = groups.get(categoryPath);
    if (current) {
      current.products.push(productRow);
    } else {
      groups.set(categoryPath, { category: categoryDto, categoryPath, products: [productRow] });
    }
  }
  return [...groups.values()];
}

function findCategoryByPath(path: string, categoryContext: CategoryContext): CategoryDto | null {
  for (const [categoryId, categoryPath] of categoryContext.pathById.entries()) {
    if (categoryPath !== path) continue;
    const categoryItems = categoryContext.pathItemsById.get(categoryId) ?? [];
    const lastItem = categoryItems.at(-1);
    return lastItem ? { id: lastItem.id, name: lastItem.name, parentId: lastItem.parentId } : null;
  }
  return null;
}

function buildCategoryContext(): CategoryContext {
  const categoryRows = db.select().from(category).orderBy(asc(category.parentId), asc(sql`lower(${category.name})`)).all();
  const pathById = new Map<number, string>();
  const pathItemsById = new Map<number, ReadonlyArray<CategoryDto>>();
  const rowById = new Map<number, CatalogCategoryRow>();

  for (const categoryRow of categoryRows) {
    const pathItems = findCategoryPath(categoryRow.id);
    const path = pathItems.map((item) => item.name).join(" > ");
    pathById.set(categoryRow.id, path);
    pathItemsById.set(categoryRow.id, pathItems);
  }

  for (const categoryRow of categoryRows) {
    const catalogRow = makeCatalogCategoryRow(categoryRow, { pathById });
    rowById.set(categoryRow.id, catalogRow);
  }

  return { categoryRows: [...rowById.values()], pathById, pathItemsById, rowById };
}

function makeCatalogCategoryRow(categoryRow: CategoryDto, categoryContext: Pick<CategoryContext, "pathById">): CatalogCategoryRow {
  return {
    id: categoryRow.id,
    name: categoryRow.name,
    parentId: categoryRow.parentId,
    path: categoryContext.pathById.get(categoryRow.id) ?? categoryRow.name,
    productCount: countProductsInCategorySubtree(categoryRow.id),
  };
}

function countAllProducts(): number {
  const row = db.select({ count: sql<number>`count(*)` }).from(product).get();
  return row?.count ?? 0;
}

function countProductsForBrand(brandId: string): number {
  const row = db.select({ count: sql<number>`count(*)` }).from(product).where(eq(product.brandId, brandId)).get();
  return row?.count ?? 0;
}

function countProductsInCategorySubtree(categoryId: number): number {
  const descendantIds = findDescendantCategoryIds(categoryId);
  if (descendantIds.length === 0) return 0;
  const placeholders = sql.join(descendantIds.map((id) => sql`${id}`), sql`, `);
  const row = db.select({ count: sql<number>`count(*)` }).from(product).where(sql`${product.categoryId} IN (${placeholders})`).get();
  return row?.count ?? 0;
}

function findDescendantCategoryIds(categoryId: number): number[] {
  const allCategories = db.select().from(category).all();
  const descendants = [categoryId];
  for (let index = 0; index < descendants.length; index += 1) {
    const parentId = descendants[index];
    if (parentId === undefined) continue;
    for (const categoryRow of allCategories) {
      if (categoryRow.parentId === parentId) descendants.push(categoryRow.id);
    }
  }
  return descendants;
}

function findCategoryPath(categoryId: number): CategoryDto[] {
  const path: CategoryDto[] = [];
  const visitedCategoryIds = new Set<number>();
  let current = db.select().from(category).where(eq(category.id, categoryId)).get();

  while (current) {
    if (visitedCategoryIds.has(current.id)) break;
    visitedCategoryIds.add(current.id);
    path.unshift({ id: current.id, name: current.name, parentId: current.parentId });
    if (current.parentId === null) break;
    current = db.select().from(category).where(eq(category.id, current.parentId)).get();
  }

  return path;
}

function formatProductDisplayName(name: string, brandName: string | null): string {
  return brandName ? `${brandName} ${name}` : name;
}
