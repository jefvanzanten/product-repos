import {
  AnySQLiteColumn,
  integer,
  sqliteTable,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { textColumn, uuid } from "../helper.ts";
import { productSkus } from "./products.schema.ts";

export const locations = sqliteTable(
  "location",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    parentId: integer("parent_id").references(
      (): AnySQLiteColumn => locations.id,
    ),
    name: textColumn("name").notNull(),
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
  productSkuId: textColumn("product_sku_id")
    .notNull()
    .references(() => productSkus.id),
  locationId: integer("location_id")
    .notNull()
    .references(() => locations.id),
  quantity: integer("quantity").notNull(),
  expirationDate: textColumn("expiration_date"),
});
