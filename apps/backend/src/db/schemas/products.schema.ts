import { sql } from "drizzle-orm";
import { AnySQLiteColumn, check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { uuid } from "./helper.ts";

/** Product brand catalog records. */
export const brand = sqliteTable("brand", {
  id: uuid("id"),
  name: text("name").notNull(),
}, (table) => [uniqueIndex("brand_name_normalized_unique").on(sql`lower(trim(${table.name}))`)]);

/** Hierarchical product category records. */
export const category = sqliteTable("category", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentId: integer("parent_id").references((): AnySQLiteColumn => category.id),
  name: text("name").notNull(),
}, (table) => [
  uniqueIndex("category_root_name_unique").on(sql`lower(trim(${table.name}))`).where(sql`${table.parentId} IS NULL`),
  uniqueIndex("category_sibling_name_unique").on(table.parentId, sql`lower(trim(${table.name}))`).where(sql`${table.parentId} IS NOT NULL`),
]);

/** Unit reference data used by catalog content and consumption input. */
export const unitType = sqliteTable("unit_type", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  dimension: text("dimension", { enum: ["MASS", "VOLUME", "COUNT"] }).notNull(),
  conversionToBase: text("conversion_to_base").notNull(),
}, (table) => [
  check("unit_type_conversion_to_base_positive", sql`CAST(${table.conversionToBase} AS REAL) > 0`),
  check("unit_type_dimension_valid", sql`${table.dimension} IN ('MASS', 'VOLUME', 'COUNT')`),
  uniqueIndex("unit_type_name_normalized_unique").on(sql`lower(trim(${table.name}))`),
  uniqueIndex("unit_type_symbol_normalized_unique").on(sql`lower(trim(${table.symbol}))`),
]);

/** Canonical content quantities attached to product packages. */
export const unitContent = sqliteTable("unit_content", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unitTypeId: integer("unit_type_id").notNull().references(() => unitType.id),
  amount: text("amount").notNull(),
}, (table) => [
  check("unit_content_amount_positive", sql`CAST(${table.amount} AS REAL) > 0`),
  uniqueIndex("unit_content_unit_type_id_amount_unique").on(table.unitTypeId, table.amount),
]);

/** Package-type reference data. */
export const packageType = sqliteTable("package_type", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
}, (table) => [uniqueIndex("package_type_name_normalized_unique").on(sql`lower(trim(${table.name}))`)]);

/** Backward-compatible singular packaging-type alias. */
export const packagingType = packageType;
/** Backward-compatible plural packaging-type alias. */
export const packagingTypes = packageType;

/** Shared catalog products with archival and audit timestamps. */
export const product = sqliteTable("product", {
  id: uuid("id"),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull().references(() => category.id),
  brandId: text("brand_id").references(() => brand.id),
  consumptionType: text("consumption_type", { enum: ["FOOD", "DRINK", "SUPPLEMENT"] }).notNull(),
  archivedAt: text("archived_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("product_consumption_type_valid", sql`${table.consumptionType} IN ('FOOD', 'DRINK', 'SUPPLEMENT')`),
  uniqueIndex("product_brand_name_unique").on(table.brandId, table.categoryId, sql`lower(trim(${table.name}))`).where(sql`${table.brandId} IS NOT NULL`),
  uniqueIndex("product_no_brand_name_unique").on(table.categoryId, sql`lower(trim(${table.name}))`).where(sql`${table.brandId} IS NULL`),
]);

/** Legacy product variants retained for the existing storage model. */
export const productVariants = sqliteTable("product_variant", {
  id: uuid("id"),
  productId: text("product_id").notNull().references(() => product.id),
  name: text("name").notNull(),
});

/** Legacy product SKUs retained for the existing storage model. */
export const productSkus = sqliteTable("product_sku", {
  id: uuid("id"),
  productVariantId: text("product_variant_id").notNull().references(() => productVariants.id),
  unitContentId: integer("unit_content_id").references(() => unitContent.id),
  packagingTypeId: integer("packaging_type_id").references(() => packageType.id),
  unitsPerPackage: integer("units_per_package"),
  barcode: text("barcode"),
});

/** Concrete product packages selectable by consuming domains. */
export const productPackage = sqliteTable("product_package", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: text("product_id").notNull().references(() => product.id),
  unitContentId: integer("unit_content_id").notNull().references(() => unitContent.id),
  packageTypeId: integer("package_type_id").notNull().references(() => packageType.id),
  individualPackageTypeId: integer("individual_package_type_id").references(() => packageType.id),
  unitsPerPackage: integer("units_per_package").notNull().default(1),
  archivedAt: text("archived_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("product_package_units_positive", sql`${table.unitsPerPackage} > 0`),
  check("product_package_individual_type_consistent", sql`(${table.unitsPerPackage} = 1 AND ${table.individualPackageTypeId} IS NULL) OR (${table.unitsPerPackage} > 1 AND ${table.individualPackageTypeId} IS NOT NULL)`),
  uniqueIndex("product_package_with_individual_unique").on(table.productId, table.packageTypeId, table.unitContentId, table.unitsPerPackage, table.individualPackageTypeId).where(sql`${table.individualPackageTypeId} IS NOT NULL`),
  uniqueIndex("product_package_without_individual_unique").on(table.productId, table.packageTypeId, table.unitContentId, table.unitsPerPackage).where(sql`${table.individualPackageTypeId} IS NULL`),
  index("product_package_product_idx").on(table.productId),
]);

/** Optional current macro profile belonging to a product. */
export const productMacroProfile = sqliteTable("product_macro_profile", {
  productId: text("product_id").primaryKey().references(() => product.id, { onDelete: "cascade" }),
  referenceBasis: text("reference_basis", { enum: ["PER_100_G", "PER_100_ML", "PER_UNIT"] }).notNull(),
  caloriesKcal: text("calories_kcal"),
  proteinG: text("protein_g"),
  carbohydratesG: text("carbohydrates_g"),
  fatG: text("fat_g"),
  caloriesSource: text("calories_source", { enum: ["AUTOMATIC", "MANUAL"] }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("product_macro_profile_reference_basis_valid", sql`${table.referenceBasis} IN ('PER_100_G', 'PER_100_ML', 'PER_UNIT')`),
  check("product_macro_profile_calories_non_negative", sql`${table.caloriesKcal} IS NULL OR CAST(${table.caloriesKcal} AS REAL) >= 0`),
  check("product_macro_profile_protein_non_negative", sql`${table.proteinG} IS NULL OR CAST(${table.proteinG} AS REAL) >= 0`),
  check("product_macro_profile_carbohydrates_non_negative", sql`${table.carbohydratesG} IS NULL OR CAST(${table.carbohydratesG} AS REAL) >= 0`),
  check("product_macro_profile_fat_non_negative", sql`${table.fatG} IS NULL OR CAST(${table.fatG} AS REAL) >= 0`),
  check("product_macro_profile_has_positive_value", sql`coalesce(CAST(${table.caloriesKcal} AS REAL), 0) > 0 OR coalesce(CAST(${table.proteinG} AS REAL), 0) > 0 OR coalesce(CAST(${table.carbohydratesG} AS REAL), 0) > 0 OR coalesce(CAST(${table.fatG} AS REAL), 0) > 0`),
  check("product_macro_profile_calories_source_consistent", sql`(${table.caloriesKcal} IS NULL AND ${table.caloriesSource} IS NULL) OR (${table.caloriesKcal} IS NOT NULL AND ${table.caloriesSource} IN ('AUTOMATIC', 'MANUAL'))`),
]);

/** Backward-compatible plural brand alias. */
export const brands = brand;
/** Backward-compatible plural category alias. */
export const categories = category;
/** Backward-compatible plural unit-type alias. */
export const unitTypes = unitType;
/** Backward-compatible plural unit-content alias. */
export const unitContents = unitContent;
/** Backward-compatible plural package-type alias. */
export const packageTypes = packageType;
/** Backward-compatible plural product-package alias. */
export const productPackages = productPackage;
/** Backward-compatible plural macro-profile alias. */
export const productMacroProfiles = productMacroProfile;
/** Backward-compatible plural product alias. */
export const products = product;
