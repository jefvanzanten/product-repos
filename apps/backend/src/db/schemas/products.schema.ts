import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
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

/** Canonical content quantities attached to concrete products and portions. */
export const unitContent = sqliteTable("unit_content", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unitTypeId: integer("unit_type_id").notNull().references(() => unitType.id),
  amount: text("amount").notNull(),
}, (table) => [
  check("unit_content_amount_positive", sql`CAST(${table.amount} AS REAL) > 0`),
  uniqueIndex("unit_content_unit_type_id_amount_unique").on(table.unitTypeId, table.amount),
]);

/** Package-type reference data with grammatical display forms. */
export const packageType = sqliteTable("package_type", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  singularName: text("singular_name").notNull(),
  pluralName: text("plural_name").notNull(),
}, (table) => [
  check("package_type_singular_name_nonempty", sql`length(trim(${table.singularName})) > 0`),
  check("package_type_plural_name_nonempty", sql`length(trim(${table.pluralName})) > 0`),
  uniqueIndex("package_type_singular_name_normalized_unique").on(sql`lower(trim(${table.singularName}))`),
  uniqueIndex("package_type_plural_name_normalized_unique").on(sql`lower(trim(${table.pluralName}))`),
]);

/** Shared identity, classification, and nutrition owner for concrete products. */
export const productComposition = sqliteTable("product_composition", {
  id: uuid("id"),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull().references(() => category.id),
  brandId: text("brand_id").references(() => brand.id),
  consumptionType: text("consumption_type", { enum: ["FOOD", "DRINK", "SUPPLEMENT"] }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("product_composition_consumption_type_valid", sql`${table.consumptionType} IS NULL OR ${table.consumptionType} IN ('FOOD', 'DRINK', 'SUPPLEMENT')`),
  uniqueIndex("product_composition_brand_name_unique").on(table.brandId, table.categoryId, sql`lower(trim(${table.name}))`).where(sql`${table.brandId} IS NOT NULL`),
  uniqueIndex("product_composition_no_brand_name_unique").on(table.categoryId, sql`lower(trim(${table.name}))`).where(sql`${table.brandId} IS NULL`),
]);

/** Macro values shared by every concrete product in one composition. */
export const productCompositionMacroProfile = sqliteTable("product_macro_profile", {
  productCompositionId: text("product_composition_id").primaryKey().references(() => productComposition.id, { onDelete: "cascade" }),
  referenceBasis: text("reference_basis", { enum: ["PER_100_G", "PER_100_ML", "PER_UNIT"] }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  caloriesKcal: text("calories_kcal"),
  proteinG: text("protein_g"),
  carbohydratesG: text("carbohydrates_g"),
  fatG: text("fat_g"),
  caloriesSource: text("calories_source", { enum: ["AUTOMATIC", "MANUAL"] }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("product_macro_profile_is_active_valid", sql`${table.isActive} IN (0, 1)`),
  check("product_macro_profile_reference_basis_valid", sql`${table.referenceBasis} IN ('PER_100_G', 'PER_100_ML', 'PER_UNIT')`),
  check("product_macro_profile_calories_non_negative", sql`${table.caloriesKcal} IS NULL OR CAST(${table.caloriesKcal} AS REAL) >= 0`),
  check("product_macro_profile_protein_non_negative", sql`${table.proteinG} IS NULL OR CAST(${table.proteinG} AS REAL) >= 0`),
  check("product_macro_profile_carbohydrates_non_negative", sql`${table.carbohydratesG} IS NULL OR CAST(${table.carbohydratesG} AS REAL) >= 0`),
  check("product_macro_profile_fat_non_negative", sql`${table.fatG} IS NULL OR CAST(${table.fatG} AS REAL) >= 0`),
  check("product_macro_profile_has_positive_value", sql`coalesce(CAST(${table.caloriesKcal} AS REAL), 0) > 0 OR coalesce(CAST(${table.proteinG} AS REAL), 0) > 0 OR coalesce(CAST(${table.carbohydratesG} AS REAL), 0) > 0 OR coalesce(CAST(${table.fatG} AS REAL), 0) > 0`),
  check("product_macro_profile_calories_source_consistent", sql`(${table.caloriesKcal} IS NULL AND ${table.caloriesSource} IS NULL) OR (${table.caloriesKcal} IS NOT NULL AND ${table.caloriesSource} IN ('AUTOMATIC', 'MANUAL'))`),
]);

/** One concrete purchasable and selectable catalog product. */
export const concreteProduct = sqliteTable("product", {
  id: uuid("id"),
  productCompositionId: text("product_composition_id").notNull().references(() => productComposition.id),
  packageTypeId: integer("package_type_id").references(() => packageType.id),
  unitContentId: integer("unit_content_id").references(() => unitContent.id),
  imageUrl: text("image_url"),
  barcode: text("barcode"),
  archivedAt: text("archived_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("product_barcode_unique").on(table.barcode).where(sql`${table.barcode} IS NOT NULL`),
  uniqueIndex("product_composition_package_content_unique").on(table.productCompositionId, table.packageTypeId, table.unitContentId).where(sql`${table.packageTypeId} IS NOT NULL AND ${table.unitContentId} IS NOT NULL`),
  index("product_composition_idx").on(table.productCompositionId),
]);

/** Optional portion metadata belonging to one concrete product. */
export const productPortion = sqliteTable("product_portion", {
  productId: text("product_id").primaryKey().references(() => concreteProduct.id, { onDelete: "cascade" }),
  singularName: text("singular_name").notNull(),
  pluralName: text("plural_name").notNull(),
  unitContentId: integer("unit_content_id").notNull().references(() => unitContent.id),
  portionsPerProduct: integer("portions_per_product"),
}, (table) => [
  check("product_portion_singular_name_nonempty", sql`length(trim(${table.singularName})) > 0`),
  check("product_portion_plural_name_nonempty", sql`length(trim(${table.pluralName})) > 0`),
  check("product_portion_count_positive", sql`${table.portionsPerProduct} IS NULL OR ${table.portionsPerProduct} > 0`),
]);
