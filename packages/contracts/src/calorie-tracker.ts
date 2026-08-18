import { z } from "zod/v4";

const canonicalDecimalPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const positiveDecimalPattern = /^(?:0\.(?:0*\d*[1-9]\d*)|[1-9]\d*(?:\.\d+)?)$/;
const positiveGoalDecimalPattern = /^(?:0\.[1-9]|[1-9]\d*(?:\.\d)?)$/;
const decimalProtocolCharacterLimit = 256;

/** Canonical non-negative decimal string used by Calorie Tracker protocols. */
export const calorieTrackerDecimalSchema = z.string().max(decimalProtocolCharacterLimit).regex(canonicalDecimalPattern);

/** Canonical decimal string greater than zero used by Calorie Tracker protocols. */
export const calorieTrackerPositiveDecimalSchema = z.string().max(decimalProtocolCharacterLimit).regex(positiveDecimalPattern);

/** ISO local calendar date accepted by date-scoped endpoints. */
export const localDateSchema = z.iso.date();

/** IANA timezone header value before runtime timezone resolution. */
export const browserTimezoneSchema = z.string().trim().min(1).max(255);

/** Consumption categories exposed by Calorie Tracker endpoints. */
export const calorieTrackerConsumptionTypeSchema = z.enum(["FOOD", "DRINK", "SUPPLEMENT"]);

/** Lowercase consumption-type filters accepted by the log list endpoint. */
export const consumptionTypeFilterSchema = z.enum(["all", "food", "drink", "supplement"]);

/** Ways a consumed quantity can be expressed relative to a package. */
export const consumptionInputModeSchema = z.enum(["FULL_PRODUCT", "PRODUCT_PORTION", "CONTENT_UNIT"]);

/** Unit dimensions exposed by package and log projections. */
export const calorieTrackerUnitDimensionSchema = z.enum(["MASS", "VOLUME", "COUNT"]);

/** Stable Calorie Tracker API error codes. */
export const calorieTrackerErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "REFERENCE_NOT_FOUND",
  "PRODUCT_NOT_FOUND",
  "PRODUCT_ARCHIVED",
  "PRODUCT_NOT_CONSUMABLE",
  "DISH_UNAVAILABLE",
  "LOG_NOT_FOUND",
  "LOG_ALREADY_EXISTS",
  "LOG_CREATE_CONFLICT",
  "LOG_UPDATE_CONFLICT",
  "LOG_RESTORE_WINDOW_EXPIRED",
  "DISH_NOT_FOUND",
  "DISH_ALREADY_EXISTS",
  "IMAGE_NOT_FOUND",
  "UNAUTHENTICATED",
  "AUTH_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

/** Strict error response returned by Calorie Tracker routes. */
export const calorieTrackerErrorResponseSchema = z.object({
  code: calorieTrackerErrorCodeSchema,
  message: z.string().min(1),
  fields: z.record(z.string(), z.string()).optional(),
}).strict();

/** Embedded brand reference in a loggable package. */
export const calorieTrackerBrandSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
}).strict();

/** Embedded package-type reference in a loggable package. */
export const calorieTrackerPackageTypeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
}).strict();

/** Embedded unit-type reference in package and log projections. */
export const calorieTrackerUnitTypeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  symbol: z.string(),
  dimension: calorieTrackerUnitDimensionSchema,
  conversionToBase: calorieTrackerPositiveDecimalSchema,
}).strict();

/** Optional portion available for one catalog package. */
export const calorieTrackerPortionSchema = z.object({
  name: z.string(),
  contentAmount: calorieTrackerPositiveDecimalSchema,
  contentUnit: calorieTrackerUnitTypeSchema,
  portionsPerPackage: z.number().int().positive().nullable(),
}).strict();

/** Active concrete product returned by recent-product and product-search endpoints. */
export const productSearchResultSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  displayName: z.string(),
  brand: calorieTrackerBrandSchema.nullable(),
  consumptionType: calorieTrackerConsumptionTypeSchema,
  packageType: calorieTrackerPackageTypeSchema,
  contentAmount: calorieTrackerPositiveDecimalSchema,
  contentUnit: calorieTrackerUnitTypeSchema,
  portion: calorieTrackerPortionSchema.nullable(),
  packageSummary: z.string(),
  imageUrl: z.string().url().nullable(),
}).strict();

/** Input unit available for a selected active package. */
export const availableInputUnitSchema = z.object({
  inputMode: consumptionInputModeSchema,
  unitType: calorieTrackerUnitTypeSchema.nullable(),
  label: z.string(),
}).strict();

/** Strict concrete-product search result list returned by the HTTP boundary. */
export const productSearchResultsSchema = z.array(productSearchResultSchema);

/** Strict available-input-unit list returned by the HTTP boundary. */
export const availableInputUnitsSchema = z.array(availableInputUnitSchema);

/** Nullable nutrition values derived for a consumption or day. */
export const macroValuesSchema = z.object({
  caloriesKcal: calorieTrackerDecimalSchema.nullable(),
  proteinG: calorieTrackerDecimalSchema.nullable(),
  carbohydratesG: calorieTrackerDecimalSchema.nullable(),
  fatG: calorieTrackerDecimalSchema.nullable(),
}).strict();

/** Package projection embedded in an existing consumption log. */
export const consumptionLogProductSchema = productSearchResultSchema.extend({
  consumptionType: calorieTrackerConsumptionTypeSchema.nullable(),
  archived: z.boolean(),
}).strict();

/** Persistence kind of one consumption log. */
export const consumptionLogTypeSchema = z.enum(["PRODUCT", "DISH"]);

/** Shared immutable fields of every consumption-log response. */
const consumptionLogBaseSchema = z.object({
  id: z.string().uuid(),
  quantity: calorieTrackerPositiveDecimalSchema,
  consumedAt: z.iso.datetime({ offset: true }),
  timezone: browserTimezoneSchema,
  localDate: localDateSchema,
  derivedQuantityLabel: z.string(),
  macroValues: macroValuesSchema.nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}).strict();

/** Pinned dish reference embedded in an existing dish consumption log. */
export const dishConsumptionReferenceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  imageUrl: z.string().url().nullable(),
  versionId: z.string().uuid(),
  servings: calorieTrackerPositiveDecimalSchema,
  recipeAccessible: z.boolean(),
}).strict();

/** Complete product consumption-log response with current catalog-derived data. */
export const productConsumptionLogSchema = consumptionLogBaseSchema.extend({
  type: z.literal("PRODUCT"),
  product: consumptionLogProductSchema,
  inputMode: consumptionInputModeSchema,
  inputUnitType: calorieTrackerUnitTypeSchema.nullable(),
}).strict();

/** Complete dish consumption-log response with its pinned recipe version. */
export const dishConsumptionLogSchema = consumptionLogBaseSchema.extend({
  type: z.literal("DISH"),
  dish: dishConsumptionReferenceSchema,
}).strict();

/** Complete consumption-log response discriminated by persisted log type. */
export const consumptionLogSchema = z.discriminatedUnion("type", [productConsumptionLogSchema, dishConsumptionLogSchema]);

/** Date-scoped chronologically sorted consumption-log list. */
export const logListSchema = z.object({
  date: localDateSchema,
  timezone: browserTimezoneSchema,
  type: consumptionTypeFilterSchema,
  items: z.array(consumptionLogSchema),
}).strict();

/** Client-idempotent product consumption-log creation request. */
export const createProductConsumptionLogSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("PRODUCT"),
  productId: z.string().uuid(),
  quantity: calorieTrackerPositiveDecimalSchema,
  inputMode: consumptionInputModeSchema,
  inputUnitTypeId: z.number().int().positive().nullable(),
  consumedAt: z.iso.datetime({ offset: true }),
}).strict();

/** Client-idempotent dish consumption-log creation request; the backend pins the newest dish version. */
export const createDishConsumptionLogSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("DISH"),
  dishId: z.string().uuid(),
  quantity: calorieTrackerPositiveDecimalSchema,
  consumedAt: z.iso.datetime({ offset: true }),
}).strict();

/** Client-idempotent consumption-log creation request. */
export const createConsumptionLogSchema = z.discriminatedUnion("type", [createProductConsumptionLogSchema, createDishConsumptionLogSchema]);

/** Optimistic-concurrency product consumption-log update request. */
export const updateProductConsumptionLogSchema = z.object({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  type: z.literal("PRODUCT"),
  productId: z.string().uuid(),
  quantity: calorieTrackerPositiveDecimalSchema,
  inputMode: consumptionInputModeSchema,
  inputUnitTypeId: z.number().int().positive().nullable(),
  consumedAt: z.iso.datetime({ offset: true }),
}).strict();

/** Optimistic-concurrency dish consumption-log update request limited to quantity and instant. */
export const updateDishConsumptionLogSchema = z.object({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  type: z.literal("DISH"),
  quantity: calorieTrackerPositiveDecimalSchema,
  consumedAt: z.iso.datetime({ offset: true }),
}).strict();

/** Optimistic-concurrency consumption-log update request. */
export const updateConsumptionLogSchema = z.discriminatedUnion("type", [updateProductConsumptionLogSchema, updateDishConsumptionLogSchema]);

/** One ingredient persisted inside an immutable dish recipe version. */
export const dishIngredientSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  displayName: z.string(),
  quantity: calorieTrackerPositiveDecimalSchema,
  inputMode: consumptionInputModeSchema,
  inputUnitType: calorieTrackerUnitTypeSchema.nullable(),
  productArchived: z.boolean(),
}).strict();

/** Complete user-owned dish with its newest recipe version. */
export const dishSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  imageUrl: z.string().url().nullable(),
  servings: calorieTrackerPositiveDecimalSchema,
  versionId: z.string().uuid(),
  versionCreatedAt: z.iso.datetime({ offset: true }),
  ingredients: z.array(dishIngredientSchema),
  macrosPerServing: macroValuesSchema.nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}).strict();

/** One ingredient supplied when creating or replacing a dish recipe. */
export const createDishIngredientSchema = z.object({
  productId: z.string().uuid(),
  quantity: calorieTrackerPositiveDecimalSchema,
  inputMode: consumptionInputModeSchema,
  inputUnitTypeId: z.number().int().positive().nullable(),
}).strict();

/** Dish creation request. */
export const createDishSchema = z.object({
  name: z.string().trim().min(1).max(200),
  imageUrl: z.string().url().nullable(),
  servings: calorieTrackerPositiveDecimalSchema,
  ingredients: z.array(createDishIngredientSchema).min(1),
}).strict();

/** Dish replacement request; recipe changes create a new immutable version. */
export const updateDishSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  imageUrl: z.string().url().nullable().optional(),
  servings: calorieTrackerPositiveDecimalSchema.optional(),
  ingredients: z.array(createDishIngredientSchema).min(1).optional(),
}).strict();

/** Dish search result row in the combined log-flow search. */
export const dishSearchResultSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  makerDisplayName: z.string().nullable(),
  isOwnedByViewer: z.boolean(),
  imageUrl: z.string().url().nullable(),
  servings: calorieTrackerPositiveDecimalSchema,
  caloriesPerServing: calorieTrackerDecimalSchema.nullable(),
}).strict();

/** Package search result row tagged for the combined log-flow search. */
export const productUnifiedSearchResultSchema = productSearchResultSchema.extend({
  kind: z.literal("PRODUCT"),
}).strict();

/** Dish search result row tagged for the combined log-flow search. */
export const dishUnifiedSearchResultSchema = dishSearchResultSchema.extend({
  kind: z.literal("DISH"),
}).strict();

/** Combined package-and-dish search result discriminated by kind. */
export const unifiedSearchResultSchema = z.discriminatedUnion("kind", [productUnifiedSearchResultSchema, dishUnifiedSearchResultSchema]);

/** Result returned after soft-deleting a dish without a restore flow. */
export const deleteDishResultSchema = z.object({
  id: z.string().uuid(),
  deletedAt: z.iso.datetime({ offset: true }),
}).strict();

/** Result returned after soft-deleting a consumption log. */
export const deleteLogResultSchema = z.object({
  id: z.string().uuid(),
  deletedAt: z.iso.datetime({ offset: true }),
  restoreUntil: z.iso.datetime({ offset: true }),
}).strict();

/** Current optional calorie and macro goals for one user. */
export const nutritionGoalSchema = z.object({
  caloriesKcal: z.number().int().positive().nullable(),
  proteinG: z.string().max(decimalProtocolCharacterLimit).regex(positiveGoalDecimalPattern).nullable(),
  carbohydratesG: z.string().max(decimalProtocolCharacterLimit).regex(positiveGoalDecimalPattern).nullable(),
  fatG: z.string().max(decimalProtocolCharacterLimit).regex(positiveGoalDecimalPattern).nullable(),
  updatedAt: z.iso.datetime({ offset: true }).nullable(),
}).strict();

/** Atomic replacement request for a user's optional nutrition goals. */
export const upsertNutritionGoalSchema = nutritionGoalSchema.omit({ updatedAt: true }).strict();

/** Aggregate nutrition totals and current goals for one local calendar date. */
export const dailyStatisticsSchema = z.object({
  date: localDateSchema,
  timezone: browserTimezoneSchema,
  totals: macroValuesSchema,
  goals: nutritionGoalSchema.nullable(),
}).strict();

/** A canonical Calorie Tracker decimal string. */
export type CalorieTrackerDecimal = z.infer<typeof calorieTrackerDecimalSchema>;
/** A local calendar date. */
export type LocalDate = z.infer<typeof localDateSchema>;
/** A supported product consumption type. */
export type CalorieTrackerConsumptionType = z.infer<typeof calorieTrackerConsumptionTypeSchema>;
/** A log-list consumption filter. */
export type ConsumptionTypeFilter = z.infer<typeof consumptionTypeFilterSchema>;
/** A supported consumption quantity input mode. */
export type ConsumptionInputMode = z.infer<typeof consumptionInputModeSchema>;
/** A unit dimension. */
export type CalorieTrackerUnitDimension = z.infer<typeof calorieTrackerUnitDimensionSchema>;
/** A stable Calorie Tracker API error code. */
export type CalorieTrackerErrorCode = z.infer<typeof calorieTrackerErrorCodeSchema>;
/** A Calorie Tracker API error response. */
export type CalorieTrackerErrorResponse = z.infer<typeof calorieTrackerErrorResponseSchema>;
/** A brand embedded in a package projection. */
export type CalorieTrackerBrand = z.infer<typeof calorieTrackerBrandSchema>;
/** A package-type reference. */
export type CalorieTrackerPackageType = z.infer<typeof calorieTrackerPackageTypeSchema>;
/** A unit-type reference. */
export type CalorieTrackerUnitType = z.infer<typeof calorieTrackerUnitTypeSchema>;
/** An optional portion available for a catalog package. */
export type CalorieTrackerPortion = z.infer<typeof calorieTrackerPortionSchema>;
/** A package available for a new consumption log. */
export type ProductSearchResult = z.infer<typeof productSearchResultSchema>;
/** An input unit available for a selected package. */
export type AvailableInputUnit = z.infer<typeof availableInputUnitSchema>;
/** Derived nullable calorie and macro values. */
export type MacroValues = z.infer<typeof macroValuesSchema>;
/** A package embedded in an existing consumption log. */
export type ConsumptionLogProduct = z.infer<typeof consumptionLogProductSchema>;
/** A persisted consumption-log kind. */
export type ConsumptionLogType = z.infer<typeof consumptionLogTypeSchema>;
/** A pinned dish reference inside a dish consumption log. */
export type DishConsumptionReference = z.infer<typeof dishConsumptionReferenceSchema>;
/** A complete product consumption log. */
export type ProductConsumptionLog = z.infer<typeof productConsumptionLogSchema>;
/** A complete dish consumption log. */
export type DishConsumptionLog = z.infer<typeof dishConsumptionLogSchema>;
/** A complete consumption log. */
export type ConsumptionLog = z.infer<typeof consumptionLogSchema>;
/** A date-scoped list of consumption logs. */
export type LogList = z.infer<typeof logListSchema>;
/** A product consumption-log creation request. */
export type CreateProductConsumptionLog = z.infer<typeof createProductConsumptionLogSchema>;
/** A dish consumption-log creation request. */
export type CreateDishConsumptionLog = z.infer<typeof createDishConsumptionLogSchema>;
/** A consumption-log creation request. */
export type CreateConsumptionLog = z.infer<typeof createConsumptionLogSchema>;
/** A product consumption-log update request. */
export type UpdateProductConsumptionLog = z.infer<typeof updateProductConsumptionLogSchema>;
/** A dish consumption-log update request. */
export type UpdateDishConsumptionLog = z.infer<typeof updateDishConsumptionLogSchema>;
/** A consumption-log update request. */
export type UpdateConsumptionLog = z.infer<typeof updateConsumptionLogSchema>;
/** An ingredient inside an immutable dish recipe version. */
export type DishIngredient = z.infer<typeof dishIngredientSchema>;
/** A complete user-owned dish. */
export type Dish = z.infer<typeof dishSchema>;
/** An ingredient supplied when creating or replacing a dish recipe. */
export type CreateDishIngredient = z.infer<typeof createDishIngredientSchema>;
/** A dish creation request. */
export type CreateDish = z.infer<typeof createDishSchema>;
/** A dish replacement request. */
export type UpdateDish = z.infer<typeof updateDishSchema>;
/** A dish search result row. */
export type DishSearchResult = z.infer<typeof dishSearchResultSchema>;
/** A combined package-and-dish search result. */
export type UnifiedSearchResult = z.infer<typeof unifiedSearchResultSchema>;
/** A dish soft-delete result. */
export type DeleteDishResult = z.infer<typeof deleteDishResultSchema>;
/** A soft-delete result. */
export type DeleteLogResult = z.infer<typeof deleteLogResultSchema>;
/** A user's current optional nutrition goals. */
export type NutritionGoal = z.infer<typeof nutritionGoalSchema>;
/** A nutrition-goal replacement request. */
export type UpsertNutritionGoal = z.infer<typeof upsertNutritionGoalSchema>;
/** Daily aggregate nutrition statistics. */
export type DailyStatistics = z.infer<typeof dailyStatisticsSchema>;
