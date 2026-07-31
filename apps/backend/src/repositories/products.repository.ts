import type {
  ConsumptionType,
  MacroProfile,
  ProductCreatedDto,
  ProductDetailDto,
  ProductPackageRequest,
  UnitDimension,
} from "@product-repos/contracts";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { product, productMacroProfile } from "../db/schema";
import { err, ok, type Result } from "../domain";
import { findBrandById, type BrandRow } from "./brands.repository";
import { findAllCategories, findCategoryById, findCategoryPath, type CategoryRow } from "./category.repository";
import { findOrCreateUnitContent, findProductPackageFullRows, insertProductPackage, toProductPackageDto } from "./product-packages.repository";
import { findPackageTypeById, findUnitTypeById } from "./units.repository";

/** Input persisted atomically when a product is created. */
export type CreateProductPersistenceInput = {
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
  readonly consumptionType: ConsumptionType;
  readonly macroProfile: MacroProfile | null;
  readonly package: ProductPackageRequest;
};

/** Input persisted atomically when a product is updated. */
export type UpdateProductPersistenceInput = {
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
  readonly consumptionType: ConsumptionType;
  readonly macroProfile: MacroProfile | null;
};

/** Raw product persistence row kept inside the repository boundary. */
export type ProductRow = typeof product.$inferSelect;
type ProductMacroProfileRow = typeof productMacroProfile.$inferSelect;
type MacroProfileExecutor = Pick<typeof db, "insert" | "delete">;

/** Read a complete product detail projection. */
export function getProductDetail(productId: string): Result<ProductDetailDto> {
  const productRow = findProductById(productId);
  if (!productRow) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const categories = findAllCategories();
  const categoryPath = findCategoryPath(productRow.categoryId, categories);
  if (categoryPath.length === 0) return err({ code: "REFERENCE_NOT_FOUND", message: "Product category not found" });

  const brandRow = productRow.brandId ? findBrandById(productRow.brandId) ?? null : null;
  if (productRow.brandId && !brandRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Product brand not found" });

  return ok(toProductDetail(productRow, brandRow, categoryPath));
}

/** Update product fields and its optional macro profile in one transaction. */
export function updateProduct(input: UpdateProductPersistenceInput & { readonly productId: string }): Result<ProductDetailDto> {
  const existingProduct = findProductById(input.productId);
  if (!existingProduct) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const categoryRow = findCategoryById(input.categoryId);
  const brandRow = input.brandId === null ? null : findBrandById(input.brandId) ?? null;
  if (!categoryRow || (input.brandId !== null && !brandRow)) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const duplicate = findDuplicateProduct(input.name, input.categoryId, input.brandId, input.productId);
  if (duplicate) return err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: duplicate.id });

  db.transaction((tx) => {
    tx.update(product).set({
      name: input.name,
      categoryId: input.categoryId,
      brandId: input.brandId,
      consumptionType: input.consumptionType,
      updatedAt: new Date().toISOString(),
    }).where(eq(product.id, input.productId)).run();
    persistMacroProfile(tx, input.productId, input.macroProfile);
  });

  return getProductDetail(input.productId);
}

/** Create a product, its first package, and optional macro profile in one transaction. */
export function createProduct(input: CreateProductPersistenceInput): Result<ProductCreatedDto> {
  const categoryRow = findCategoryById(input.categoryId);
  const brandRow = input.brandId === null ? null : findBrandById(input.brandId) ?? null;
  const unitTypeRow = findUnitTypeById(input.package.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.package.packageTypeId);
  const individualPackageTypeRow = input.package.individualPackageTypeId === null
    ? null
    : findPackageTypeById(input.package.individualPackageTypeId) ?? null;
  if (!categoryRow || (input.brandId !== null && !brandRow) || !unitTypeRow || !packageTypeRow || (input.package.individualPackageTypeId !== null && !individualPackageTypeRow)) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const duplicate = findDuplicateProduct(input.name, input.categoryId, input.brandId);
  if (duplicate) return err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: duplicate.id });

  const created = db.transaction((tx) => {
    const unitContentRow = findOrCreateUnitContent(tx, input.package.unitTypeId, input.package.amount);
    const productRow = tx.insert(product).values({
      name: input.name,
      categoryId: input.categoryId,
      brandId: input.brandId,
      consumptionType: input.consumptionType,
    }).returning().get();
    const productPackageRow = insertProductPackage(tx, {
      productId: productRow.id,
      unitContentId: unitContentRow.id,
      packageTypeId: input.package.packageTypeId,
      individualPackageTypeId: input.package.individualPackageTypeId,
      unitsPerPackage: input.package.unitsPerPackage,
    });
    persistMacroProfile(tx, productRow.id, input.macroProfile);
    return { productRow, unitContentRow, productPackageRow };
  });

  return ok({
    id: created.productRow.id,
    name: created.productRow.name,
    consumptionType: created.productRow.consumptionType,
    category: { id: categoryRow.id, name: categoryRow.name, parentId: categoryRow.parentId },
    brand: brandRow ? { id: brandRow.id, name: brandRow.name } : null,
    macroProfile: input.macroProfile,
    package: toProductPackageDto({ productPackage: created.productPackageRow, packageType: packageTypeRow, individualPackageType: individualPackageTypeRow, unitContent: created.unitContentRow, unitType: unitTypeRow }),
  });
}

/** Return dimensions for all packages currently attached to a product. */
export function findProductPackageDimensions(productId: string): ReadonlyArray<UnitDimension> {
  return findProductPackageFullRows(productId).map((row) => row.unitType.dimension);
}

/** Return all product rows for catalog projections. */
export function findAllProductRows(): ProductRow[] {
  return db.select().from(product).all();
}

/** Find one raw product row inside the persistence adapter. */
export function findProductById(productId: string): ProductRow | undefined {
  return db.select().from(product).where(eq(product.id, productId)).get();
}

/** Build the display name for a product row. */
export function displayProductName(productRow: ProductRow, brandRow: BrandRow | null): string {
  return brandRow ? `${brandRow.name} ${productRow.name}` : productRow.name;
}

/** Compare product rows by localized product name and stable identifier. */
export function compareProductRows(left: ProductRow, right: ProductRow): number {
  return left.name.localeCompare(right.name, "nl", { sensitivity: "base" }) || left.id.localeCompare(right.id);
}

/** Persist, replace, or remove one product macro profile through the active transaction. */
function persistMacroProfile(executor: MacroProfileExecutor, productId: string, profile: MacroProfile | null): void {
  if (profile === null) {
    executor.delete(productMacroProfile).where(eq(productMacroProfile.productId, productId)).run();
    return;
  }
  const values = {
    productId,
    referenceBasis: profile.referenceBasis,
    caloriesKcal: profile.caloriesKcal,
    proteinG: profile.proteinG,
    carbohydratesG: profile.carbohydratesG,
    fatG: profile.fatG,
    caloriesSource: profile.caloriesSource,
  };
  executor.insert(productMacroProfile).values(values).onConflictDoUpdate({
    target: productMacroProfile.productId,
    set: { ...values, updatedAt: sql`CURRENT_TIMESTAMP` },
  }).run();
}

/** Find a normalized product-name duplicate, optionally excluding the edited product. */
function findDuplicateProduct(name: string, categoryId: number, brandId: string | null, excludedProductId?: string): ProductRow | undefined {
  const normalizedName = name.trim().toLowerCase();
  const exclusion = excludedProductId ? sql`${product.id} <> ${excludedProductId} AND` : sql``;
  return brandId === null
    ? db.select().from(product).where(sql`${exclusion} ${product.brandId} IS NULL AND ${product.categoryId} = ${categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).get()
    : db.select().from(product).where(sql`${exclusion} ${product.brandId} = ${brandId} AND ${product.categoryId} = ${categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).get();
}

/** Project a raw product row and related records into the HTTP detail contract. */
function toProductDetail(productRow: ProductRow, brandRow: BrandRow | null, categoryPath: ReadonlyArray<CategoryRow>): ProductDetailDto {
  const categoryRow = categoryPath.at(-1);
  return {
    id: productRow.id,
    name: productRow.name,
    displayName: displayProductName(productRow, brandRow),
    consumptionType: productRow.consumptionType,
    category: { id: productRow.categoryId, name: categoryRow?.name ?? "Onbekende categorie", parentId: categoryRow?.parentId ?? null },
    categoryPath: categoryPath.map((row) => ({ id: row.id, name: row.name, parentId: row.parentId })),
    brand: brandRow ? { id: brandRow.id, name: brandRow.name } : null,
    macroProfile: toMacroProfile(db.select().from(productMacroProfile).where(eq(productMacroProfile.productId, productRow.id)).get()),
    packages: findProductPackageFullRows(productRow.id).map(toProductPackageDto),
  };
}

/** Project an optional macro-profile persistence row into canonical protocol strings. */
function toMacroProfile(row: ProductMacroProfileRow | undefined): MacroProfile | null {
  if (!row) return null;
  return {
    referenceBasis: row.referenceBasis,
    caloriesKcal: toProtocolDecimal(row.caloriesKcal),
    proteinG: toProtocolDecimal(row.proteinG),
    carbohydratesG: toProtocolDecimal(row.carbohydratesG),
    fatG: toProtocolDecimal(row.fatG),
    caloriesSource: row.caloriesSource,
  };
}

/** Preserve a nullable canonical decimal from SQLite text storage. */
function toProtocolDecimal(value: string | null): string | null {
  return value;
}
