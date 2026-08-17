import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { uuid } from "./helper.ts";
import { concreteProduct } from "./products.schema.ts";
import { user } from "./auth.schema.ts";

/** Reusable storage location organized as a parent/child tree. */
export const location = sqliteTable(
  "location",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    parentId: integer("parent_id").references(
      (): AnySQLiteColumn => location.id,
      { onDelete: "restrict" },
    ),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    rootNameUnique: uniqueIndex("location_root_normalized_name_unique")
      .on(table.normalizedName)
      .where(sql`${table.parentId} IS NULL`),
    siblingNameUnique: uniqueIndex("location_sibling_normalized_name_unique")
      .on(table.parentId, table.normalizedName)
      .where(sql`${table.parentId} IS NOT NULL`),
    nameLengthValid: check(
      "location_name_length_valid",
      sql`length(${table.name}) BETWEEN 1 AND 100`,
    ),
    normalizedNameLengthValid: check(
      "location_normalized_name_length_valid",
      sql`length(${table.normalizedName}) BETWEEN 1 AND 100`,
    ),
    parentNotSelf: check(
      "location_parent_not_self",
      sql`${table.parentId} IS NULL OR ${table.parentId} <> ${table.id}`,
    ),
  }),
);

/** One physical v2 inventory package with independently tracked remaining content. */
export const physicalInventoryItem = sqliteTable("physical_inventory_item", {
  id: uuid("id"),
  productId: text("product_id").notNull().references(() => concreteProduct.id),
  locationId: integer("location_id").notNull().references(() => location.id, { onDelete: "restrict" }),
  expiryDate: text("expiry_date"),
  remainingAmountBase: text("remaining_amount_base").notNull(),
  version: integer("version").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("physical_inventory_remaining_non_negative", sql`CAST(${table.remainingAmountBase} AS REAL) >= 0`),
  check("physical_inventory_version_non_negative", sql`${table.version} >= 0`),
  index("physical_inventory_product_idx").on(table.productId),
  index("physical_inventory_location_idx").on(table.locationId),
]);

/** Optional low-stock threshold configured per concrete product. */
export const productStockThreshold = sqliteTable("product_stock_threshold", {
  productId: text("product_id").primaryKey().references(() => concreteProduct.id, { onDelete: "cascade" }),
  lowStockAmountBase: text("low_stock_amount_base").notNull(),
  movementClass: text("movement_class", { enum: ["SLOW", "MEDIUM", "FAST"] }),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [check("product_stock_threshold_non_negative", sql`CAST(${table.lowStockAmountBase} AS REAL) >= 0`)]);

/** Immutable audit row describing one physical inventory mutation. */
export const physicalInventoryMutation = sqliteTable("physical_inventory_mutation", {
  id: uuid("id"),
  inventoryItemId: text("inventory_item_id").notNull().references(() => physicalInventoryItem.id),
  kind: text("kind", { enum: ["ADD", "CONTENT_SET", "MOVE", "DATE_CHANGE", "REMOVE"] }).notNull(),
  amountDeltaBase: text("amount_delta_base"),
  resultingAmountBase: text("resulting_amount_base").notNull(),
  fromLocationId: integer("from_location_id").references(() => location.id, { onDelete: "restrict" }),
  toLocationId: integer("to_location_id").references(() => location.id, { onDelete: "restrict" }),
  fromExpiryDate: text("from_expiry_date"),
  toExpiryDate: text("to_expiry_date"),
  userId: text("user_id").notNull().references(() => user.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("physical_inventory_mutation_result_non_negative", sql`CAST(${table.resultingAmountBase} AS REAL) >= 0`),
  index("physical_inventory_mutation_item_idx").on(table.inventoryItemId),
]);
