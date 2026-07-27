import { AnySQLiteColumn, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
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
});

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
});

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

export const brands = brand;
export const categories = category;
export const unitTypes = unitType;
export const unitContents = unitContent;
export const packageTypes = packageType;
export const productPackages = productPackage;
export const products = product;
