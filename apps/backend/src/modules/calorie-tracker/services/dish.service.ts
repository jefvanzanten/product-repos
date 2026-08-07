import type { CreateDish, DeleteDishResult, Dish, UpdateDish } from "@product-repos/contracts/calorie-tracker";
import { canonicalDecimal, deriveConsumptionQuantity, parsePositiveDecimal } from "../domain/calorie-tracker-domain.ts";
import type { CatalogPackageRecord, ConsumptionCatalogReader } from "../../catalog/repositories/consumption-catalog-reader.ts";
import type { DishIngredientRecord, DishRepository } from "../repositories/calorie-tracker-store.ts";
import { createDishProjector, toQuantityPackage } from "./calorie-tracker-projections.ts";
import { failure, nextTimestamp, projectionFailure, success, type CalorieTrackerResult, type Clock } from "./calorie-tracker-service-support.ts";

/** User-owned dish lifecycle use cases consumed by Calorie Tracker routes. */
export type DishService = ReturnType<typeof createDishService>;

/** Create user-owned dish lifecycle use cases with recipe versioning. */
export function createDishService(dependencies: {
  readonly catalogReader: ConsumptionCatalogReader;
  readonly dishRepository: DishRepository;
  readonly clock: Clock;
}) {
  const { catalogReader, dishRepository, clock } = dependencies;
  const projector = createDishProjector(catalogReader, dishRepository);

  /** Create one dish stem with its first immutable recipe version. */
  function createDish(userId: string, input: CreateDish): CalorieTrackerResult<Dish> {
    const parsed = parseRecipeInput(input.servings, input.ingredients);
    if (!parsed.ok) return parsed;
    const now = clock.now().toISOString();
    const dishId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const storedDish = dishRepository.insertDish({
      dish: { id: dishId, userId, name: input.name, imageUrl: input.imageUrl, createdAt: now, updatedAt: now, deletedAt: null },
      version: { id: versionId, dishId, servings: parsed.value.servings, createdAt: now },
      ingredients: parsed.value.ingredients.map((ingredient) => ({
        id: crypto.randomUUID(),
        dishVersionId: versionId,
        productPackageId: ingredient.packageId,
        quantity: ingredient.quantity,
        inputMode: ingredient.inputMode,
        inputUnitTypeId: ingredient.inputUnitTypeId,
      })),
    });
    if (storedDish === undefined) return failure("DISH_ALREADY_EXISTS", "A dish with this name already exists", { name: "This name is already in use" });
    const projected = projector.projectDish(storedDish);
    return projected.ok ? success(projected.value) : projectionFailure();
  }

  /** Read one active user-owned dish without revealing another user's identifiers. */
  function getDish(userId: string, dishId: string): CalorieTrackerResult<Dish> {
    const storedDish = dishRepository.findDishById(dishId);
    if (storedDish === undefined || storedDish.userId !== userId || storedDish.deletedAt !== null) return failure("DISH_NOT_FOUND", "Dish not found");
    const projected = projector.projectDish(storedDish);
    return projected.ok ? success(projected.value) : projectionFailure();
  }

  /** Replace mutable stem fields and create a new immutable version when the recipe changed. */
  function updateDish(userId: string, dishId: string, input: UpdateDish): CalorieTrackerResult<Dish> {
    const storedDish = dishRepository.findDishById(dishId);
    if (storedDish === undefined || storedDish.userId !== userId || storedDish.deletedAt !== null) return failure("DISH_NOT_FOUND", "Dish not found");
    const nextName = input.name ?? storedDish.name;
    const nextImageUrl = input.imageUrl === undefined ? storedDish.imageUrl : input.imageUrl;
    if (nextName !== storedDish.name && dishRepository.existsActiveDishWithName(userId, nextName)) {
      return failure("DISH_ALREADY_EXISTS", "A dish with this name already exists", { name: "This name is already in use" });
    }

    const recipeChanged = input.servings !== undefined || input.ingredients !== undefined;
    const parsed = recipeChanged
      ? parseRecipeInput(input.servings ?? currentServings(storedDish.id), input.ingredients ?? currentIngredients(storedDish.id))
      : undefined;
    if (parsed !== undefined && !parsed.ok) return parsed;
    const versionNeeded = parsed !== undefined && parsed.ok && recipeIsUnchanged(storedDish.id, parsed.value) === false;

    const updatedAt = nextTimestamp(clock.now(), storedDish.updatedAt);
    const stemChanged = nextName !== storedDish.name || nextImageUrl !== storedDish.imageUrl;
    if (stemChanged) {
      const updatedStem = dishRepository.updateDishStem(userId, dishId, storedDish.updatedAt, { name: nextName, imageUrl: nextImageUrl, updatedAt });
      if (updatedStem === undefined) return failure("DISH_NOT_FOUND", "Dish not found");
    }

    if (versionNeeded && parsed !== undefined && parsed.ok) {
      const versionId = crypto.randomUUID();
      const version = dishRepository.insertVersion({ id: versionId, dishId, servings: parsed.value.servings, createdAt: updatedAt });
      dishRepository.insertIngredients(parsed.value.ingredients.map((ingredient) => ({
        id: crypto.randomUUID(),
        dishVersionId: version.id,
        productPackageId: ingredient.packageId,
        quantity: ingredient.quantity,
        inputMode: ingredient.inputMode,
        inputUnitTypeId: ingredient.inputUnitTypeId,
      })));
    }

    const refreshed = dishRepository.findDishById(dishId);
    if (refreshed === undefined) return failure("DISH_NOT_FOUND", "Dish not found");
    const projected = projector.projectDish(refreshed);
    return projected.ok ? success(projected.value) : projectionFailure();
  }

  /** Soft-delete one active user-owned dish while keeping versions for pinned logs. */
  function deleteDish(userId: string, dishId: string): CalorieTrackerResult<DeleteDishResult> {
    const storedDish = dishRepository.findDishById(dishId);
    if (storedDish === undefined || storedDish.userId !== userId || storedDish.deletedAt !== null) return failure("DISH_NOT_FOUND", "Dish not found");
    const deletedAt = nextTimestamp(clock.now(), storedDish.updatedAt);
    const deleted = dishRepository.softDeleteDish(userId, dishId, deletedAt, deletedAt);
    if (deleted === undefined) return failure("DISH_NOT_FOUND", "Dish not found");
    return success({ id: dishId, deletedAt });
  }

  /** Parse servings and ingredients against current catalog selectability rules. */
  function parseRecipeInput(
    servingsInput: string,
    ingredientsInput: ReadonlyArray<{ readonly packageId: number; readonly quantity: string; readonly inputMode: CreateDish["ingredients"][number]["inputMode"]; readonly inputUnitTypeId: number | null }>,
  ): CalorieTrackerResult<{
    readonly servings: string;
    readonly ingredients: ReadonlyArray<{ readonly packageId: number; readonly quantity: string; readonly inputMode: DishIngredientRecord["inputMode"]; readonly inputUnitTypeId: number | null }>;
  }> {
    const servings = parsePositiveDecimal(servingsInput);
    if (!servings.ok) return { ok: false, error: servings.error };
    const ingredients: Array<{ readonly packageId: number; readonly quantity: string; readonly inputMode: DishIngredientRecord["inputMode"]; readonly inputUnitTypeId: number | null }> = [];
    for (const ingredient of ingredientsInput) {
      const packageRecord = catalogReader.findCatalogPackage(ingredient.packageId);
      if (packageRecord === undefined) return failure("PRODUCT_PACKAGE_NOT_FOUND", "Product package not found");
      if (!isActivePackage(packageRecord)) return failure("PRODUCT_PACKAGE_ARCHIVED", "Archived packages cannot be chosen as ingredients");
      const quantity = parsePositiveDecimal(ingredient.quantity);
      if (!quantity.ok) return { ok: false, error: quantity.error };
      const inputUnit = ingredient.inputUnitTypeId === null ? null : catalogReader.findUnitType(ingredient.inputUnitTypeId) ?? null;
      const derived = deriveConsumptionQuantity(toQuantityPackage(packageRecord), {
        quantity: quantity.value,
        inputMode: ingredient.inputMode,
        inputUnit,
      });
      if (!derived.ok) return { ok: false, error: derived.error };
      ingredients.push({ packageId: ingredient.packageId, quantity: quantity.value, inputMode: ingredient.inputMode, inputUnitTypeId: ingredient.inputUnitTypeId });
    }
    if (ingredients.length === 0) return failure("VALIDATION_ERROR", "A dish requires at least one ingredient", { ingredients: "Minimum one ingredient" });
    return success({ servings: servings.value, ingredients });
  }

  /** Determine whether parsed recipe content equals the newest stored version. */
  function recipeIsUnchanged(dishId: string, parsed: { readonly servings: string; readonly ingredients: ReadonlyArray<{ readonly packageId: number; readonly quantity: string; readonly inputMode: DishIngredientRecord["inputMode"]; readonly inputUnitTypeId: number | null }> }): boolean {
    const version = dishRepository.findNewestVersion(dishId);
    if (version === undefined) return false;
    if (canonicalDecimal(version.servings) !== parsed.servings) return false;
    const currentRows = dishRepository.findIngredientsByVersionId(version.id);
    if (currentRows.length !== parsed.ingredients.length) return false;
    return parsed.ingredients.every((ingredient, index) => {
      const current = currentRows[index]!;
      return current.productPackageId === ingredient.packageId
        && canonicalDecimal(current.quantity) === ingredient.quantity
        && current.inputMode === ingredient.inputMode
        && current.inputUnitTypeId === ingredient.inputUnitTypeId;
    });
  }

  /** Read the newest version servings of one dish. */
  function currentServings(dishId: string): string {
    const version = dishRepository.findNewestVersion(dishId);
    if (version === undefined) throw new Error("Dish is missing its recipe version");
    return version.servings;
  }

  /** Read the newest version ingredients of one dish in creation-request shape. */
  function currentIngredients(dishId: string): ReadonlyArray<{ readonly packageId: number; readonly quantity: string; readonly inputMode: DishIngredientRecord["inputMode"]; readonly inputUnitTypeId: number | null }> {
    const version = dishRepository.findNewestVersion(dishId);
    if (version === undefined) throw new Error("Dish is missing its recipe version");
    return dishRepository.findIngredientsByVersionId(version.id).map((ingredient) => ({
      packageId: ingredient.productPackageId,
      quantity: ingredient.quantity,
      inputMode: ingredient.inputMode,
      inputUnitTypeId: ingredient.inputUnitTypeId,
    }));
  }

  return { createDish, getDish, updateDish, deleteDish };
}

/** Determine whether both product and package are actively selectable. */
function isActivePackage(row: CatalogPackageRecord): boolean {
  return row.productArchivedAt === null && row.packageArchivedAt === null;
}
