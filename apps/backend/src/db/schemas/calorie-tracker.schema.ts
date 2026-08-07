import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth.schema.ts";
import { productPackage, unitType } from "./products.schema.ts";

/** Persisted user-owned consumption logs with subtype data in dedicated tables. */
export const consumptionLog = sqliteTable("consumption_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  type: text("type", { enum: ["PRODUCT", "DISH"] }).notNull(),
  consumedAt: text("consumed_at").notNull(),
  timezone: text("timezone").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
}, (table) => [
  check("consumption_log_type_valid", sql`${table.type} IN ('PRODUCT', 'DISH')`),
  index("consumption_log_user_consumed_at_idx").on(table.userId, table.consumedAt),
  index("consumption_log_deleted_at_idx").on(table.deletedAt).where(sql`${table.deletedAt} IS NOT NULL`),
]);

/** Persisted package-based consumption details keyed by their consumption log. */
export const productConsumption = sqliteTable("product_consumption", {
  consumptionLogId: text("consumption_log_id").primaryKey().references(() => consumptionLog.id, { onDelete: "cascade" }),
  productPackageId: integer("product_package_id").notNull().references(() => productPackage.id),
  quantity: text("quantity").notNull(),
  inputMode: text("input_mode", { enum: ["PACKAGE", "INDIVIDUAL_UNIT", "CONTENT_UNIT"] }).notNull(),
  inputUnitTypeId: integer("input_unit_type_id").references(() => unitType.id),
}, (table) => [
  check("product_consumption_quantity_positive", sql`CAST(${table.quantity} AS REAL) > 0`),
  check("product_consumption_input_mode_valid", sql`${table.inputMode} IN ('PACKAGE', 'INDIVIDUAL_UNIT', 'CONTENT_UNIT')`),
  check("product_consumption_input_unit_consistent", sql`(${table.inputMode} = 'CONTENT_UNIT' AND ${table.inputUnitTypeId} IS NOT NULL) OR (${table.inputMode} IN ('PACKAGE', 'INDIVIDUAL_UNIT') AND ${table.inputUnitTypeId} IS NULL)`),
  index("product_consumption_product_package_idx").on(table.productPackageId),
]);

/** Persisted user-owned dishes with identity fields on the stem. */
export const dish = sqliteTable("dish", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
}, (table) => [
  uniqueIndex("dish_user_name_unique").on(table.userId, sql`lower(trim(${table.name}))`).where(sql`${table.deletedAt} IS NULL`),
  index("dish_user_idx").on(table.userId),
]);

/** Immutable dish recipe version; never updated or deleted. */
export const dishVersion = sqliteTable("dish_version", {
  id: text("id").primaryKey(),
  dishId: text("dish_id").notNull().references(() => dish.id),
  servings: text("servings").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  check("dish_version_servings_positive", sql`CAST(${table.servings} AS REAL) > 0`),
  index("dish_version_dish_created_idx").on(table.dishId, table.createdAt),
]);

/** One catalog-package ingredient inside an immutable dish recipe version. */
export const dishIngredient = sqliteTable("dish_ingredient", {
  id: text("id").primaryKey(),
  dishVersionId: text("dish_version_id").notNull().references(() => dishVersion.id),
  productPackageId: integer("product_package_id").notNull().references(() => productPackage.id),
  quantity: text("quantity").notNull(),
  inputMode: text("input_mode", { enum: ["PACKAGE", "INDIVIDUAL_UNIT", "CONTENT_UNIT"] }).notNull(),
  inputUnitTypeId: integer("input_unit_type_id").references(() => unitType.id),
}, (table) => [
  check("dish_ingredient_quantity_positive", sql`CAST(${table.quantity} AS REAL) > 0`),
  check("dish_ingredient_input_mode_valid", sql`${table.inputMode} IN ('PACKAGE', 'INDIVIDUAL_UNIT', 'CONTENT_UNIT')`),
  check("dish_ingredient_input_unit_consistent", sql`(${table.inputMode} = 'CONTENT_UNIT' AND ${table.inputUnitTypeId} IS NOT NULL) OR (${table.inputMode} IN ('PACKAGE', 'INDIVIDUAL_UNIT') AND ${table.inputUnitTypeId} IS NULL)`),
  index("dish_ingredient_version_idx").on(table.dishVersionId),
]);

/** Persisted dish consumption details pinning the consumed recipe version. */
export const dishConsumption = sqliteTable("dish_consumption", {
  consumptionLogId: text("consumption_log_id").primaryKey().references(() => consumptionLog.id, { onDelete: "cascade" }),
  dishVersionId: text("dish_version_id").notNull().references(() => dishVersion.id),
  quantity: text("quantity").notNull(),
}, (table) => [
  check("dish_consumption_quantity_positive", sql`CAST(${table.quantity} AS REAL) > 0`),
  index("dish_consumption_dish_version_idx").on(table.dishVersionId),
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
