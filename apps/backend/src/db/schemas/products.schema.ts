import {
  integer,
  real,
  sqliteTable,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { textColumn, uuid } from "../helper.ts";

export const brands = sqliteTable("brand", {
  id: uuid("id"),
  name: textColumn("name").notNull().unique(),
});

export const productTypes = sqliteTable("product_type", {
  id: uuid("id"),
  name: textColumn("name").notNull().unique(),
});

export const unitTypes = sqliteTable("unit_type", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: textColumn("name").notNull().unique(),
});

export const unitContents = sqliteTable(
  "unit_content",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    unitTypeId: integer("unit_type_id")
      .notNull()
      .references(() => unitTypes.id),
    amount: real("amount").notNull(),
  },
  (table) => ({
    unitAmountUnique: uniqueIndex("unit_content_unit_type_id_amount_unique").on(
      table.unitTypeId,
      table.amount,
    ),
  }),
);

export const products = sqliteTable("product", {
  id: uuid("id"),
  name: textColumn("name").notNull(),
  productTypeId: textColumn("product_type_id")
    .notNull()
    .references(() => productTypes.id),
  brandId: textColumn("brand_id").references(() => brands.id),
});

export const productVariants = sqliteTable(
  "product_variant",
  {
    id: uuid("id"),
    productId: textColumn("product_id")
      .notNull()
      .references(() => products.id),
    name: textColumn("name").notNull(),
  },
  (table) => ({
    productVariantUnique: uniqueIndex(
      "product_variant_product_id_name_unique",
    ).on(table.productId, table.name),
  }),
);

export const packagingTypes = sqliteTable("packaging_type", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: textColumn("name").notNull().unique(),
});

export const productSkus = sqliteTable("product_sku", {
  id: uuid("id"),
  productVariantId: textColumn("product_variant_id")
    .notNull()
    .references(() => productVariants.id),
  unitContentId: integer("unit_content_id")
    .notNull()
    .references(() => unitContents.id),
  packagingTypeId: integer("packaging_type_id")
    .notNull()
    .references(() => packagingTypes.id),
  unitsPerPackage: integer("units_per_package").notNull().default(1),
  barcode: textColumn("barcode").unique(),
});

export const unitType = unitTypes;
