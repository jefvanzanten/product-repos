import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema.ts";
import { productPackage, unitType } from "./products.schema.ts";

/** Persisted user-owned consumption logs with original input semantics. */
export const consumptionLog = sqliteTable("consumption_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  productPackageId: integer("product_package_id").notNull().references(() => productPackage.id),
  quantity: text("quantity").notNull(),
  inputMode: text("input_mode", { enum: ["PACKAGE", "INDIVIDUAL_UNIT", "CONTENT_UNIT"] }).notNull(),
  inputUnitTypeId: integer("input_unit_type_id").references(() => unitType.id),
  consumedAt: text("consumed_at").notNull(),
  timezone: text("timezone").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
}, (table) => [
  check("consumption_log_quantity_positive", sql`CAST(${table.quantity} AS REAL) > 0`),
  check("consumption_log_input_mode_valid", sql`${table.inputMode} IN ('PACKAGE', 'INDIVIDUAL_UNIT', 'CONTENT_UNIT')`),
  check("consumption_log_input_unit_consistent", sql`(${table.inputMode} = 'CONTENT_UNIT' AND ${table.inputUnitTypeId} IS NOT NULL) OR (${table.inputMode} IN ('PACKAGE', 'INDIVIDUAL_UNIT') AND ${table.inputUnitTypeId} IS NULL)`),
  index("consumption_log_user_consumed_at_idx").on(table.userId, table.consumedAt),
  index("consumption_log_product_package_idx").on(table.productPackageId),
  index("consumption_log_deleted_at_idx").on(table.deletedAt).where(sql`${table.deletedAt} IS NOT NULL`),
]);

/** Persisted current optional nutrition goals, with one row per user. */
export const userNutritionGoal = sqliteTable("user_nutrition_goal", {
  userId: text("user_id").primaryKey().references(() => user.id),
  caloriesKcal: integer("calories_kcal"),
  proteinG: text("protein_g"),
  carbohydratesG: text("carbohydrates_g"),
  fatG: text("fat_g"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  check("user_nutrition_goal_calories_positive", sql`${table.caloriesKcal} IS NULL OR ${table.caloriesKcal} > 0`),
  check("user_nutrition_goal_protein_positive", sql`${table.proteinG} IS NULL OR CAST(${table.proteinG} AS REAL) > 0`),
  check("user_nutrition_goal_carbohydrates_positive", sql`${table.carbohydratesG} IS NULL OR CAST(${table.carbohydratesG} AS REAL) > 0`),
  check("user_nutrition_goal_fat_positive", sql`${table.fatG} IS NULL OR CAST(${table.fatG} AS REAL) > 0`),
]);

/** Backward-compatible plural alias for consumption-log queries. */
export const consumptionLogs = consumptionLog;

/** Backward-compatible plural alias for user nutrition-goal queries. */
export const userNutritionGoals = userNutritionGoal;
