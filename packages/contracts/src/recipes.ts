import { z } from "zod/v4";
import {
  calorieTrackerPositiveDecimalSchema,
  calorieTrackerUnitTypeSchema,
  consumptionInputModeSchema,
} from "./calorie-tracker.ts";

/** Stable expected recipe API error codes. */
export const recipeErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "REFERENCE_NOT_FOUND",
  "DISH_NOT_FOUND",
  "DISH_ALREADY_EXISTS",
  "PRODUCT_ARCHIVED",
  "PRODUCT_NOT_CONSUMABLE",
  "DISH_UPDATE_CONFLICT",
  "UNAUTHENTICATED",
  "AUTH_UNAVAILABLE",
  "INTERNAL_ERROR",
]);

/** Strict expected recipe API error response. */
export const recipeErrorResponseSchema = z.object({
  code: recipeErrorCodeSchema,
  message: z.string().min(1),
  fields: z.record(z.string(), z.string()).optional(),
}).strict();

/** Visibility levels supported by recipes. */
export const recipeVisibilitySchema = z.enum(["PRIVATE", "PUBLIC"]);

/** Sort orders supported by public recipe lists. */
export const recipeSortSchema = z.enum(["newest", "oldest", "name"]);

/** Owner capabilities returned with a recipe detail. */
export const recipeOwnerActionsSchema = z.object({
  canEdit: z.boolean(),
  canArchive: z.boolean(),
  canRestore: z.boolean(),
}).strict();

/** Live recipe fields returned in list and detail projections. */
export const recipeSummarySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1),
  makerDisplayName: z.string().nullable(),
  name: z.string(),
  visibility: recipeVisibilitySchema,
  archivedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}).strict();

/** Ingredient mutation value stored in an immutable recipe version. */
export const recipeIngredientInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: calorieTrackerPositiveDecimalSchema,
  inputMode: consumptionInputModeSchema,
  inputUnitTypeId: z.number().int().positive().nullable().optional(),
}).strict();

/** Concrete product ingredient returned with a recipe detail. */
export const recipeIngredientSchema = z.object({
  productId: z.string().uuid(),
  displayName: z.string().min(1),
  quantity: calorieTrackerPositiveDecimalSchema,
  inputMode: consumptionInputModeSchema,
  inputUnitType: calorieTrackerUnitTypeSchema.nullable(),
  productArchived: z.boolean(),
}).strict();

/** Complete recipe detail using live stem data and the newest immutable version. */
export const recipeDetailSchema = recipeSummarySchema.extend({
  servings: calorieTrackerPositiveDecimalSchema,
  instructions: z.string().nullable(),
  versionId: z.string().uuid(),
  versionCreatedAt: z.iso.datetime({ offset: true }),
  ingredients: z.array(recipeIngredientSchema),
  ownerActions: recipeOwnerActionsSchema,
}).strict();

/** Cursor page of recipe summaries. */
export const recipePageSchema = z.object({
  items: z.array(recipeSummarySchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
}).strict();

/** Recipe creation request. */
export const createRecipeSchema = z.object({
  name: z.string().trim().min(1).max(200),
  visibility: recipeVisibilitySchema.optional(),
  servings: calorieTrackerPositiveDecimalSchema,
  instructions: z.string().nullable().optional(),
  ingredients: z.array(recipeIngredientInputSchema).min(1),
}).strict();

/** Optimistic-concurrency recipe replacement request. */
export const updateRecipeSchema = z.object({
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(1).max(200),
  visibility: recipeVisibilitySchema,
  servings: calorieTrackerPositiveDecimalSchema,
  instructions: z.string().nullable().optional(),
  ingredients: z.array(recipeIngredientInputSchema).min(1),
}).strict();

/** Result returned after a recipe is archived. */
export const recipeArchiveResultSchema = z.object({
  id: z.string().uuid(),
  archivedAt: z.iso.datetime({ offset: true }),
}).strict();

/** Active concrete product selectable as a recipe ingredient. */
export const recipeProductSearchResultSchema = z.object({
  productId: z.string().uuid(),
  displayName: z.string().min(1),
  compositionName: z.string(),
  brandName: z.string().nullable(),
  packageSummary: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
}).strict();

/** Input options available for one selected recipe product. */
export const recipeIngredientInputOptionsSchema = z.object({
  productId: z.string().uuid(),
  package: z.object({
    singularName: z.string().min(1),
    pluralName: z.string().min(1),
    contentAmount: calorieTrackerPositiveDecimalSchema,
    contentUnitType: calorieTrackerUnitTypeSchema,
    portionsPerProduct: z.number().int().positive().nullable(),
  }).strict(),
  modes: z.array(z.object({
    inputMode: consumptionInputModeSchema,
    unitType: calorieTrackerUnitTypeSchema.nullable(),
    label: z.string().min(1),
  }).strict()),
}).strict();

export type RecipeErrorCode = z.infer<typeof recipeErrorCodeSchema>;
export type RecipeErrorResponse = z.infer<typeof recipeErrorResponseSchema>;
export type RecipeVisibility = z.infer<typeof recipeVisibilitySchema>;
export type RecipeSort = z.infer<typeof recipeSortSchema>;
export type RecipeOwnerActions = z.infer<typeof recipeOwnerActionsSchema>;
export type RecipeSummary = z.infer<typeof recipeSummarySchema>;
export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>;
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type RecipeDetail = z.infer<typeof recipeDetailSchema>;
export type RecipePage = z.infer<typeof recipePageSchema>;
export type CreateRecipe = z.infer<typeof createRecipeSchema>;
export type UpdateRecipe = z.infer<typeof updateRecipeSchema>;
export type RecipeArchiveResult = z.infer<typeof recipeArchiveResultSchema>;
export type RecipeProductSearchResult = z.infer<typeof recipeProductSearchResultSchema>;
export type RecipeIngredientInputOptions = z.infer<typeof recipeIngredientInputOptionsSchema>;
