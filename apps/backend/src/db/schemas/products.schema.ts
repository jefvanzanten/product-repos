import {
  AnySQLiteColumn,
  integer,
  real,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { uuid } from "./helper.ts";

export const brand = sqliteTable("brand", {
  id: uuid("id"),
  name: text("name").notNull().unique(),
});

export const category = sqliteTable("category", {
  id: uuid("id"),
  parentId: integer("parent_id").references((): AnySQLiteColumn => category.id),
  name: text("name").notNull().unique(),
});

export const unitType = sqliteTable("unit_type", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const unitContent = sqliteTable(
  "unit_content",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    unitTypeId: integer("unit_type_id")
      .notNull()
      .references(() => unitType.id),
    amount: real("amount").notNull(),
  },
  (table) => ({
    unitAmountUnique: uniqueIndex("unit_content_unit_type_id_amount_unique").on(
      table.unitTypeId,
      table.amount,
    ),
  }),
);

export const packagingType = sqliteTable("packaging_type", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const productPackage = sqliteTable(
  "product_package",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    unitContentId: integer("unit_content_id")
      .notNull()
      .references(() => unitContent.id),
    packagingTypeId: integer("packaging_type_id")
      .notNull()
      .references(() => packagingType.id),
    unitsPerPackage: integer("units_per_package").notNull().default(1),
  },
  (table) => [
    unique("product_package_unit_content_id_packaging_type_id_unique").on(
      table.unitContentId,
      table.packagingTypeId,
    ),
  ],
);

export const product = sqliteTable("product", {
  id: uuid("id"),
  name: text("name"),
  categoryId: text("category_id").references(() => category.id),
  brandId: text("brand_id").references(() => brand.id),
});
