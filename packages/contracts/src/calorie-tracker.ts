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
export const consumptionInputModeSchema = z.enum(["PACKAGE", "INDIVIDUAL_UNIT", "CONTENT_UNIT"]);

/** Unit dimensions exposed by package and log projections. */
export const calorieTrackerUnitDimensionSchema = z.enum(["MASS", "VOLUME", "COUNT"]);

/** Stable Calorie Tracker API error codes. */
export const calorieTrackerErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "REFERENCE_NOT_FOUND",
  "PRODUCT_PACKAGE_NOT_FOUND",
  "PRODUCT_PACKAGE_ARCHIVED",
  "LOG_NOT_FOUND",
  "LOG_ALREADY_EXISTS",
  "LOG_CREATE_CONFLICT",
  "LOG_UPDATE_CONFLICT",
  "LOG_RESTORE_WINDOW_EXPIRED",
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

/** Active package returned by recent-package and package-search endpoints. */
export const packageSearchResultSchema = z.object({
  packageId: z.number().int().positive(),
  productId: z.string().uuid(),
  productName: z.string(),
  displayName: z.string(),
  brand: calorieTrackerBrandSchema.nullable(),
  consumptionType: calorieTrackerConsumptionTypeSchema,
  packageType: calorieTrackerPackageTypeSchema,
  contentAmount: calorieTrackerPositiveDecimalSchema,
  contentUnit: calorieTrackerUnitTypeSchema,
  portion: calorieTrackerPortionSchema.nullable(),
  summary: z.string(),
  imageUrl: z.string().url().nullable(),
}).strict();

/** Input unit available for a selected active package. */
export const availableInputUnitSchema = z.object({
  inputMode: consumptionInputModeSchema,
  unitType: calorieTrackerUnitTypeSchema.nullable(),
  label: z.string(),
}).strict();

/** Nullable nutrition values derived for a consumption or day. */
export const macroValuesSchema = z.object({
  caloriesKcal: calorieTrackerDecimalSchema.nullable(),
  proteinG: calorieTrackerDecimalSchema.nullable(),
  carbohydratesG: calorieTrackerDecimalSchema.nullable(),
  fatG: calorieTrackerDecimalSchema.nullable(),
}).strict();

/** Package projection embedded in an existing consumption log. */
export const consumptionLogPackageSchema = packageSearchResultSchema.extend({
  productArchived: z.boolean(),
  packageArchived: z.boolean(),
}).strict();

/** Complete consumption-log response with current catalog-derived data. */
export const consumptionLogSchema = z.object({
  id: z.string().uuid(),
  package: consumptionLogPackageSchema,
  quantity: calorieTrackerPositiveDecimalSchema,
  inputMode: consumptionInputModeSchema,
  inputUnitType: calorieTrackerUnitTypeSchema.nullable(),
  consumedAt: z.iso.datetime({ offset: true }),
  timezone: browserTimezoneSchema,
  localDate: localDateSchema,
  derivedQuantityLabel: z.string(),
  macroValues: macroValuesSchema.nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}).strict();

/** Date-scoped chronologically sorted consumption-log list. */
export const logListSchema = z.object({
  date: localDateSchema,
  timezone: browserTimezoneSchema,
  type: consumptionTypeFilterSchema,
  items: z.array(consumptionLogSchema),
}).strict();

/** Client-idempotent consumption-log creation request. */
export const createConsumptionLogSchema = z.object({
  id: z.string().uuid(),
  packageId: z.number().int().positive(),
  quantity: calorieTrackerPositiveDecimalSchema,
  inputMode: consumptionInputModeSchema,
  inputUnitTypeId: z.number().int().positive().nullable(),
  consumedAt: z.iso.datetime({ offset: true }),
}).strict();

/** Optimistic-concurrency consumption-log update request. */
export const updateConsumptionLogSchema = z.object({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  packageId: z.number().int().positive(),
  quantity: calorieTrackerPositiveDecimalSchema,
  inputMode: consumptionInputModeSchema,
  inputUnitTypeId: z.number().int().positive().nullable(),
  consumedAt: z.iso.datetime({ offset: true }),
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
export type PackageSearchResult = z.infer<typeof packageSearchResultSchema>;
/** An input unit available for a selected package. */
export type AvailableInputUnit = z.infer<typeof availableInputUnitSchema>;
/** Derived nullable calorie and macro values. */
export type MacroValues = z.infer<typeof macroValuesSchema>;
/** A package embedded in an existing consumption log. */
export type ConsumptionLogPackage = z.infer<typeof consumptionLogPackageSchema>;
/** A complete consumption log. */
export type ConsumptionLog = z.infer<typeof consumptionLogSchema>;
/** A date-scoped list of consumption logs. */
export type LogList = z.infer<typeof logListSchema>;
/** A consumption-log creation request. */
export type CreateConsumptionLog = z.infer<typeof createConsumptionLogSchema>;
/** A consumption-log update request. */
export type UpdateConsumptionLog = z.infer<typeof updateConsumptionLogSchema>;
/** A soft-delete result. */
export type DeleteLogResult = z.infer<typeof deleteLogResultSchema>;
/** A user's current optional nutrition goals. */
export type NutritionGoal = z.infer<typeof nutritionGoalSchema>;
/** A nutrition-goal replacement request. */
export type UpsertNutritionGoal = z.infer<typeof upsertNutritionGoalSchema>;
/** Daily aggregate nutrition statistics. */
export type DailyStatistics = z.infer<typeof dailyStatisticsSchema>;
