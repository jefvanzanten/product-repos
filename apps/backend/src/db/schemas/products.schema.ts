import { sql } from "drizzle-orm";
import { AnySQLiteColumn, check, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { uuid } from "./helper.ts";

export const brand = sqliteTable("brand", {
  id: uuid("id"),
  name: text("name").notNull(),
});

export const category = sqliteTable("category", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentId: integer("parent_id").references((): AnySQLiteColumn => category.id),
  name: text("name").notNull(),
});

export const unitType = sqliteTable("unit_type", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  dimension: text("dimension", { enum: ["MASS", "VOLUME", "COUNT"] }).notNull(),
  conversionToBase: real("conversion_to_base").notNull(),
}, (table) => [
  check("unit_type_conversion_to_base_positive", sql`${table.conversionToBase} > 0`),
]);

export const unitContent = sqliteTable("unit_content", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unitTypeId: integer("unit_type_id").notNull().references(() => unitType.id),
  amount: real("amount").notNull(),
}, (table) => [uniqueIndex("unit_content_unit_type_id_amount_unique").on(table.unitTypeId, table.amount)]);

export const packageType = sqliteTable("package_type", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
});

export const packagingType = packageType;
export const packagingTypes = packageType;

export const product = sqliteTable("product", {
  id: uuid("id"),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull().references(() => category.id),
  brandId: text("brand_id").references(() => brand.id),
  consumptionType: text("consumption_type", { enum: ["FOOD", "DRINK", "SUPPLEMENT"] }).notNull(),
}, (table) => [
  check("product_consumption_type_valid", sql`${table.consumptionType} IN ('FOOD', 'DRINK', 'SUPPLEMENT')`),
]);

export const productVariants = sqliteTable("product_variant", {
  id: uuid("id"),
  productId: text("product_id").notNull().references(() => product.id),
  name: text("name").notNull(),
});

export const productSkus = sqliteTable("product_sku", {
  id: uuid("id"),
  productVariantId: text("product_variant_id").notNull().references(() => productVariants.id),
  unitContentId: integer("unit_content_id").references(() => unitContent.id),
  packagingTypeId: integer("packaging_type_id").references(() => packageType.id),
  unitsPerPackage: integer("units_per_package"),
  barcode: text("barcode"),
});

export const productPackage = sqliteTable("product_package", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: text("product_id").notNull().references(() => product.id),
  unitContentId: integer("unit_content_id").notNull().references(() => unitContent.id),
  packageTypeId: integer("package_type_id").notNull().references(() => packageType.id),
  unitsPerPackage: integer("units_per_package").notNull().default(1),
}, (table) => [uniqueIndex("product_package_unique").on(table.productId, table.packageTypeId, table.unitContentId, table.unitsPerPackage)]);

export const productMacroProfile = sqliteTable("product_macro_profile", {
  productId: text("product_id").primaryKey().references(() => product.id, { onDelete: "cascade" }),
  referenceBasis: text("reference_basis", { enum: ["PER_100_G", "PER_100_ML", "PER_UNIT"] }).notNull(),
  caloriesKcal: real("calories_kcal"),
  proteinG: real("protein_g"),
  carbohydratesG: real("carbohydrates_g"),
  fatG: real("fat_g"),
  caloriesSource: text("calories_source", { enum: ["AUTOMATIC", "MANUAL"] }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("product_macro_profile_reference_basis_valid", sql`${table.referenceBasis} IN ('PER_100_G', 'PER_100_ML', 'PER_UNIT')`),
  check("product_macro_profile_calories_non_negative", sql`${table.caloriesKcal} IS NULL OR ${table.caloriesKcal} >= 0`),
  check("product_macro_profile_protein_non_negative", sql`${table.proteinG} IS NULL OR ${table.proteinG} >= 0`),
  check("product_macro_profile_carbohydrates_non_negative", sql`${table.carbohydratesG} IS NULL OR ${table.carbohydratesG} >= 0`),
  check("product_macro_profile_fat_non_negative", sql`${table.fatG} IS NULL OR ${table.fatG} >= 0`),
  check("product_macro_profile_has_positive_value", sql`coalesce(${table.caloriesKcal}, 0) > 0 OR coalesce(${table.proteinG}, 0) > 0 OR coalesce(${table.carbohydratesG}, 0) > 0 OR coalesce(${table.fatG}, 0) > 0`),
  check("product_macro_profile_calories_source_consistent", sql`(${table.caloriesKcal} IS NULL AND ${table.caloriesSource} IS NULL) OR (${table.caloriesKcal} IS NOT NULL AND ${table.caloriesSource} IN ('AUTOMATIC', 'MANUAL'))`),
]);

export const brands = brand;
export const categories = category;
export const unitTypes = unitType;
export const unitContents = unitContent;
export const packageTypes = packageType;
export const productPackages = productPackage;
export const productMacroProfiles = productMacroProfile;
export const products = product;
