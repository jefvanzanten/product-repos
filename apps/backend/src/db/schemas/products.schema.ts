import { sql } from "drizzle-orm";
import { AnySQLiteColumn, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { uuid } from "./helper.ts";

export const brand = sqliteTable("brand", {
  id: uuid("id"),
  name: text("name").notNull(),
}, (table) => [
  uniqueIndex("brand_name_normalized_unique").on(sql`lower(trim(${table.name}))`),
]);

export const category = sqliteTable("category", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentId: integer("parent_id").references((): AnySQLiteColumn => category.id),
  name: text("name").notNull(),
}, (table) => [
  uniqueIndex("category_root_name_unique")
    .on(sql`lower(trim(${table.name}))`)
    .where(sql`${table.parentId} IS NULL`),
  uniqueIndex("category_sibling_name_unique")
    .on(table.parentId, sql`lower(trim(${table.name}))`)
    .where(sql`${table.parentId} IS NOT NULL`),
]);

export const unitType = sqliteTable("unit_type", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
}, (table) => [
  uniqueIndex("unit_type_name_normalized_unique").on(sql`lower(trim(${table.name}))`),
]);

export const unitContent = sqliteTable("unit_content", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unitTypeId: integer("unit_type_id").notNull().references(() => unitType.id),
  amount: real("amount").notNull(),
}, (table) => [uniqueIndex("unit_content_unit_type_id_amount_unique").on(table.unitTypeId, table.amount)]);

export const packageType = sqliteTable("package_type", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
}, (table) => [
  uniqueIndex("package_type_name_normalized_unique").on(sql`lower(trim(${table.name}))`),
]);

export const product = sqliteTable("product", {
  id: uuid("id"),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull().references(() => category.id),
  brandId: text("brand_id").references(() => brand.id),
}, (table) => [
  uniqueIndex("product_brand_name_unique")
    .on(table.brandId, table.categoryId, sql`lower(trim(${table.name}))`)
    .where(sql`${table.brandId} IS NOT NULL`),
  uniqueIndex("product_no_brand_name_unique")
    .on(table.categoryId, sql`lower(trim(${table.name}))`)
    .where(sql`${table.brandId} IS NULL`),
]);

export const productPackage = sqliteTable("product_package", {
  id: uuid("id"),
  productId: text("product_id").notNull().references(() => product.id),
  unitContentId: integer("unit_content_id").notNull().references(() => unitContent.id),
  packageTypeId: integer("package_type_id").notNull().references(() => packageType.id),
  unitsPerPackage: integer("units_per_package").notNull().default(1),
}, (table) => [uniqueIndex("product_package_unique").on(table.productId, table.packageTypeId, table.unitContentId, table.unitsPerPackage)]);

export const brands = brand;
export const categories = category;
export const unitTypes = unitType;
export const unitContents = unitContent;
export const packageTypes = packageType;
export const productPackages = productPackage;
export const products = product;
