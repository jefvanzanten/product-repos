import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const brands = sqliteTable("brands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const units = sqliteTable("contentType", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull().unique(),
});

export const consumptions = sqliteTable("consumptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  consumptionsId: integer("consumption_id")
    .notNull()
    .references(() => consumptions.id),
  brandId: integer("brand_id")
    .notNull()
    .references(() => brands.id),
  servingContent: integer("serving_content").notNull(),
  servingUnitId: integer("serving_content_id")
    .notNull()
    .references(() => units.id),
  content: integer("content").notNull(),
  contentunitId: integer("unit_type_id")
    .notNull()
    .references(() => units.id),
});

export const consumptionLogs = sqliteTable("consumption_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  timestamp: text("timestamp").notNull(),
  amount: integer("amount"),
  unitsId: integer("units_id")
    .notNull()
    .references(() => units.id),
});
