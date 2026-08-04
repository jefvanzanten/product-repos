import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { uuid } from "./helper.ts";
import { productPackage } from "./products.schema.ts";
import { user } from "./auth.schema.ts";

/** Reusable storage location organized as a parent/child tree. */
export const location = sqliteTable(
  "location",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    parentId: integer("parent_id").references(
      (): AnySQLiteColumn => location.id,
    ),
    name: text("name").notNull(),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    parentNameUnique: uniqueIndex("location_parent_id_name_unique").on(
      table.parentId,
      table.name,
    ),
  }),
);

/** One stock batch: whole packages of one product package at one location. */
export const inventoryItem = sqliteTable(
  "inventory_item",
  {
    id: uuid("id"),
    productPackageId: integer("product_package_id")
      .notNull()
      .references(() => productPackage.id),
    locationId: integer("location_id")
      .notNull()
      .references(() => location.id),
    expiryDate: text("expiry_date"),
    quantity: integer("quantity").notNull(),
    version: integer("version").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    quantityNonNegative: check(
      "inventory_item_quantity_non_negative",
      sql`${table.quantity} >= 0`,
    ),
    versionNonNegative: check(
      "inventory_item_version_non_negative",
      sql`${table.version} >= 0`,
    ),
    // SQLite treats NULL as distinct, so dated and undated batch identities
    // need complementary unique indexes.
    packageLocationExpiryUnique: uniqueIndex(
      "inventory_item_package_location_expiry_unique",
    ).on(table.productPackageId, table.locationId, table.expiryDate),
    packageLocationNoExpiryUnique: uniqueIndex(
      "inventory_item_package_location_no_expiry_unique",
    ).on(table.productPackageId, table.locationId).where(sql`${table.expiryDate} IS NULL`),
    packageIdx: index("inventory_item_package_idx").on(table.productPackageId),
    locationIdx: index("inventory_item_location_idx").on(table.locationId),
  }),
);

/** Immutable audit row describing one applied stock mutation. */
export const inventoryMutation = sqliteTable(
  "inventory_mutation",
  {
    id: uuid("id"),
    inventoryItemId: text("inventory_item_id")
      .notNull()
      .references(() => inventoryItem.id),
    kind: text("kind", {
      enum: ["ADD", "REMOVE", "SET", "MOVE", "DATE_CHANGE"],
    }).notNull(),
    quantityDelta: integer("quantity_delta"),
    resultingQuantity: integer("resulting_quantity").notNull(),
    fromLocationId: integer("from_location_id").references(() => location.id),
    toLocationId: integer("to_location_id").references(() => location.id),
    fromExpiryDate: text("from_expiry_date"),
    toExpiryDate: text("to_expiry_date"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    resultingNonNegative: check(
      "inventory_mutation_resulting_non_negative",
      sql`${table.resultingQuantity} >= 0`,
    ),
    kindValid: check(
      "inventory_mutation_kind_valid",
      sql`${table.kind} IN ('ADD', 'REMOVE', 'SET', 'MOVE', 'DATE_CHANGE')`,
    ),
    itemIdx: index("inventory_mutation_item_idx").on(table.inventoryItemId),
  }),
);
