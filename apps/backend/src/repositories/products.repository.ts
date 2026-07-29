import type {
  ProductCreatedDto,
  ProductDetailDto,
  ProductPackageRequest,
  UpdateProductRequest,
} from "@product-repos/contracts";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { product } from "../db/schema";
import { err, ok, type Result } from "../domain";
import { findBrandById, type BrandRow } from "./brands.repository";
import { findAllCategories, findCategoryById, findCategoryPath, type CategoryRow } from "./category.repository";
import { findOrCreateUnitContent, findProductPackageFullRows, insertProductPackage, toProductPackageDto } from "./product-packages.repository";
import { findPackageTypeById, findUnitTypeById } from "./units.repository";

export type CreateProductInput = {
  readonly name: string;
  readonly categoryId: number;
  readonly brandId: string | null;
  readonly package: ProductPackageRequest;
};

export type ProductRow = typeof product.$inferSelect;

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

export function updateProduct(productId: string, input: UpdateProductRequest): Result<ProductDetailDto> {
  const existingProduct = findProductById(productId);
  if (!existingProduct) return err({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });

  const categoryRow = findCategoryById(input.categoryId);
  const brandRow = input.brandId === null ? null : findBrandById(input.brandId) ?? null;
  if (!categoryRow || (input.brandId !== null && !brandRow)) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const normalizedName = input.name.trim().toLowerCase();
  const duplicate = input.brandId === null
    ? db.select().from(product).where(sql`${product.id} <> ${productId} AND ${product.brandId} IS NULL AND ${product.categoryId} = ${input.categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).get()
    : db.select().from(product).where(sql`${product.id} <> ${productId} AND ${product.brandId} = ${input.brandId} AND ${product.categoryId} = ${input.categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).get();
  if (duplicate) return err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: duplicate.id });

  const updatedProduct = db.update(product).set({ name: input.name, categoryId: input.categoryId, brandId: input.brandId }).where(eq(product.id, productId)).returning().get();
  const categories = findAllCategories();
  return ok(toProductDetail(updatedProduct, brandRow, findCategoryPath(updatedProduct.categoryId, categories)));
}

export function createProduct(input: CreateProductInput): Result<ProductCreatedDto> {
  const categoryRow = findCategoryById(input.categoryId);
  const brandRow = input.brandId === null ? null : findBrandById(input.brandId) ?? null;
  const unitTypeRow = findUnitTypeById(input.package.unitTypeId);
  const packageTypeRow = findPackageTypeById(input.package.packageTypeId);
  if (!categoryRow || (input.brandId !== null && !brandRow) || !unitTypeRow || !packageTypeRow) return err({ code: "REFERENCE_NOT_FOUND", message: "Reference not found" });

  const normalizedName = input.name.trim().toLowerCase();
  const duplicate = input.brandId === null
    ? db.select().from(product).where(sql`${product.brandId} IS NULL AND ${product.categoryId} = ${input.categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).get()
    : db.select().from(product).where(sql`${product.brandId} = ${input.brandId} AND ${product.categoryId} = ${input.categoryId} AND lower(trim(${product.name})) = ${normalizedName}`).get();
  if (duplicate) return err({ code: "PRODUCT_ALREADY_EXISTS", message: "Product already exists", existingProductId: duplicate.id });

  const created = db.transaction((tx) => {
    const unitContentRow = findOrCreateUnitContent(tx, input.package.unitTypeId, Number(input.package.amount));
    const productRow = tx.insert(product).values({ name: input.name, categoryId: input.categoryId, brandId: input.brandId }).returning().get();
    const productPackageRow = insertProductPackage(tx, { productId: productRow.id, unitContentId: unitContentRow.id, packageTypeId: input.package.packageTypeId, unitsPerPackage: input.package.unitsPerPackage });
    return { productRow, unitContentRow, productPackageRow };
  });

  return ok({
    id: created.productRow.id,
    name: created.productRow.name,
    category: { id: categoryRow.id, name: categoryRow.name, parentId: categoryRow.parentId },
    brand: brandRow ? { id: brandRow.id, name: brandRow.name } : null,
    package: toProductPackageDto({ productPackage: created.productPackageRow, packageType: packageTypeRow, unitContent: created.unitContentRow, unitType: unitTypeRow }),
  });
}

export function findAllProductRows(): ProductRow[] {
  return db.select().from(product).all();
}

export function findProductById(productId: string): ProductRow | undefined {
  return db.select().from(product).where(eq(product.id, productId)).get();
}

export function displayProductName(productRow: ProductRow, brandRow: BrandRow | null): string {
  return brandRow ? `${brandRow.name} ${productRow.name}` : productRow.name;
}

export function compareProductRows(left: ProductRow, right: ProductRow): number {
  return left.name.localeCompare(right.name, "nl", { sensitivity: "base" }) || left.id.localeCompare(right.id);
}

function toProductDetail(productRow: ProductRow, brandRow: BrandRow | null, categoryPath: ReadonlyArray<CategoryRow>): ProductDetailDto {
  return {
    id: productRow.id,
    name: productRow.name,
    displayName: displayProductName(productRow, brandRow),
    category: { id: productRow.categoryId, name: categoryPath.at(-1)?.name ?? "Onbekende categorie", parentId: categoryPath.at(-1)?.parentId ?? null },
    categoryPath: categoryPath.map((row) => ({ id: row.id, name: row.name, parentId: row.parentId })),
    brand: brandRow ? { id: brandRow.id, name: brandRow.name } : null,
    packages: findProductPackageFullRows(productRow.id).map(toProductPackageDto),
  };
}
