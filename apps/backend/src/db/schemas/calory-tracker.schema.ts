import { integer, real, sqliteTable } from "drizzle-orm/sqlite-core";
import { productVariants, unitContents } from "./products.schema.ts";
import { textColumn, uuid } from "../helper.ts";

export const macroNutrients = sqliteTable("macro_nutrients", {
  id: uuid("id"),
  productVariantId: textColumn("product_variant_id")
    .notNull()
    .references(() => productVariants.id),
  unitContentId: integer("unit_content_id")
    .notNull()
    .references(() => unitContents.id),
  totalFat: real("total_fat"),
  unsaturatedFat: real("unsaturated_fat"),
  saturatedFat: real("saturated_fat"),
  totalCarbs: real("total_carbs"),
  sugars: real("sugars"),
  fibre: real("fibre"),
  protein: real("protein"),
});
