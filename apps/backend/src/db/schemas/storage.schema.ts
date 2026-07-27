import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { uuid } from "./helper.ts";
import { product } from "./products.schema.ts";

export const location = sqliteTable(
  "location",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    parentId: integer("parent_id").references(
      (): AnySQLiteColumn => location.id,
    ),
    name: text("name").notNull(),
  },
  (table) => ({
    parentNameUnique: uniqueIndex("location_parent_id_name_unique").on(
      table.parentId,
      table.name,
    ),
  }),
);

export const storageRecords = sqliteTable("storage_record", {
  id: uuid("id"),
  productId: text("product_id")
    .notNull()
    .references(() => product.id),
  locationId: integer("location_id")
    .notNull()
    .references(() => location.id),
  quantity: integer("quantity").notNull(),
  expirationDate: text("expiration_date"),
});
