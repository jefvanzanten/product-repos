import type {
  CalorieTrackerPortion,
  CalorieTrackerUnitType,
  ConsumptionLog,
  Dish,
  DishIngredient,
  DishSearchResult,
  MacroValues,
  NutritionGoal,
  ProductSearchResult,
} from "@product-repos/contracts/calorie-tracker";
import {
  calculateMacroValues,
  canonicalDecimal,
  deriveConsumptionQuantity,
  divideDecimals,
  localDateForInstant,
  multiplyDecimals,
  sumMacroValues,
  type QuantityPackage,
  type QuantityUnit,
} from "../domain/calorie-tracker-domain.ts";
import { formatConcreteProductDisplayName, formatDutchDecimal, formatPackageSummary as formatSharedPackageSummary } from "@product-repos/shared/product-presentation";
import type { CatalogProductRecord, ConsumptionCatalogReader, UnitTypeRecord } from "../../catalog/repositories/consumption-catalog.repository.ts";
import type { ConsumptionLogRecord } from "../repositories/consumption-log.repository.ts";
import type { NutritionGoalRecord } from "../repositories/nutrition-goal.repository.ts";
import type {
  DishIngredientRecord,
  DishRecord,
  DishRepository,
  DishVersionRecord,
} from "../../recipes/repositories/dish.repository.ts";

/** Result of projecting persisted data into a strict response contract. */
export type LogProjection =
  | { readonly ok: true; readonly value: ConsumptionLog }
  | { readonly ok: false };

/** Catalog and dish references required to project a collection of persisted logs. */
export type ProjectionReferences = {
  readonly packages: ReadonlyMap<string, CatalogProductRecord>;
  readonly units: ReadonlyMap<number, UnitTypeRecord>;
  readonly dishes: ReadonlyMap<string, DishRecord>;
  readonly versions: ReadonlyMap<string, DishVersionRecord>;
  readonly ingredientsByVersion: ReadonlyMap<string, ReadonlyArray<DishIngredientRecord>>;
};

/** Create reusable single and batched log projections from current catalog and dish data. */
export function createConsumptionLogProjector(catalogReader: ConsumptionCatalogReader, dishRepository: DishRepository) {
  /** Read only current catalog and dish references required by found logs. */
  function readReferences(rows: ReadonlyArray<ConsumptionLogRecord>): ProjectionReferences {
    const productIds = rows.flatMap((row) => row.type === "PRODUCT" ? [row.productId] : []);
    const versionIds = rows.flatMap((row) => row.type === "DISH" ? [row.dishVersionId] : []);
    return readProjectionReferences(productIds, rows.flatMap((row) => row.type === "PRODUCT" && row.inputUnitTypeId !== null ? [row.inputUnitTypeId] : []), versionIds);
  }

  /** Project one persistence log using optional preloaded references. */
  function projectLog(row: ConsumptionLogRecord, references?: ProjectionReferences): LogProjection {
    const resolved = references ?? readReferences([row]);
    if (row.type === "PRODUCT") return projectProductLog(row, resolved);
    return projectDishLog(row, resolved);
  }

  /** Read all references required to project the supplied package, unit, and dish-version identifiers. */
  function readProjectionReferences(productIds: ReadonlyArray<string>, unitIds: ReadonlyArray<number>, versionIds: ReadonlyArray<string>): ProjectionReferences {
    const versions = new Map(dishRepository.findVersionsByIds(versionIds).map((version) => [version.id, version]));
    const ingredients = dishRepository.findIngredientsByVersionIds([...versions.keys()]);
    const ingredientsByVersion = new Map<string, DishIngredientRecord[]>();
    for (const ingredient of ingredients) {
      const list = ingredientsByVersion.get(ingredient.dishVersionId);
      if (list === undefined) ingredientsByVersion.set(ingredient.dishVersionId, [ingredient]);
      else list.push(ingredient);
    }
    const dishIds = [...new Set([...versions.values()].map((version) => version.dishId))];
    const dishes = new Map(dishIds.flatMap((dishId) => {
      const storedDish = dishRepository.findDishById(dishId);
      return storedDish === undefined ? [] : [[storedDish.id, storedDish] as const];
    }));
    const ingredientPackageIds = ingredients.map((ingredient) => ingredient.productId);
    const ingredientUnitIds = ingredients.flatMap((ingredient) => ingredient.inputUnitTypeId === null ? [] : [ingredient.inputUnitTypeId]);
    return {
      packages: new Map(catalogReader.findCatalogProductsByIds([...productIds, ...ingredientPackageIds]).map((value) => [value.productId, value])),
      units: new Map(catalogReader.findUnitTypesByIds([...unitIds, ...ingredientUnitIds]).map((value) => [value.id, value])),
      dishes,
      versions,
      ingredientsByVersion,
    };
  }

  /** Project one persisted product log using preloaded references. */
  function projectProductLog(row: Extract<ConsumptionLogRecord, { readonly type: "PRODUCT" }>, references: ProjectionReferences): LogProjection {
    const packageRecord = references.packages.get(row.productId);
    if (packageRecord === undefined) return { ok: false };
    const inputUnit = row.inputUnitTypeId === null ? null : references.units.get(row.inputUnitTypeId);
    if (row.inputUnitTypeId !== null && inputUnit === undefined) return { ok: false };
    try {
      const derived = deriveConsumptionQuantity(toQuantityPackage(packageRecord), {
        quantity: canonicalDecimal(row.quantity),
        inputMode: row.inputMode,
        inputUnit: inputUnit ?? null,
      });
      if (!derived.ok) return { ok: false };
      return {
        ok: true,
        value: {
          id: row.id,
          type: "PRODUCT",
          product: {
            ...toProductSearchResult(packageRecord),
            archived: packageRecord.productArchivedAt !== null,
          },
          quantity: canonicalDecimal(row.quantity),
          inputMode: row.inputMode,
          inputUnitType: inputUnit == null ? null : toUnitType(inputUnit),
          consumedAt: row.consumedAt,
          timezone: row.timezone,
          localDate: localDateForInstant(row.consumedAt, row.timezone),
          derivedQuantityLabel: derived.value.label,
          macroValues: calculateMacroValues(packageRecord.macroProfile, derived.value.baseAmount),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      };
    } catch {
      return { ok: false };
    }
  }

  /** Project one persisted dish log from its pinned recipe version. */
  function projectDishLog(row: Extract<ConsumptionLogRecord, { readonly type: "DISH" }>, references: ProjectionReferences): LogProjection {
    const version = references.versions.get(row.dishVersionId);
    if (version === undefined) return { ok: false };
    const storedDish = references.dishes.get(version.dishId);
    if (storedDish === undefined) return { ok: false };
    const ingredientRows = references.ingredientsByVersion.get(version.id) ?? [];
    if (ingredientRows.length === 0) return { ok: false };
    const perServing = computeDishVersionMacrosPerServing(version, ingredientRows, references);
    if (perServing === "invalid") return { ok: false };
    const quantity = canonicalDecimal(row.quantity);
    return {
      ok: true,
      value: {
        id: row.id,
        type: "DISH",
        dish: {
          id: storedDish.id,
          userId: storedDish.userId,
          name: storedDish.name,
          imageUrl: storedDish.imageUrl,
          versionId: version.id,
          servings: canonicalDecimal(version.servings),
          recipeAccessible: storedDish.archivedAt === null
            && storedDish.deletedAt === null
            && (storedDish.userId === row.userId || storedDish.visibility === "PUBLIC"),
        },
        quantity,
        consumedAt: row.consumedAt,
        timezone: row.timezone,
        localDate: localDateForInstant(row.consumedAt, row.timezone),
        derivedQuantityLabel: `${quantity} portie`,
        macroValues: perServing === null ? null : scaleMacroValues(perServing, quantity),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  }

  return { readReferences, projectLog, readProjectionReferences };
}

/** Exact macro totals of one recipe version divided by its serving count. */
export function computeDishVersionMacrosPerServing(
  version: DishVersionRecord,
  ingredientRows: ReadonlyArray<DishIngredientRecord>,
  references: Pick<ProjectionReferences, "packages" | "units">,
): MacroValues | null | "invalid" {
  const contributions: Array<MacroValues | null> = [];
  for (const ingredient of ingredientRows) {
    const packageRecord = references.packages.get(ingredient.productId);
    if (packageRecord === undefined) return "invalid";
    if (packageRecord.macroProfile === null) {
      contributions.push(null);
      continue;
    }
    const inputUnit = ingredient.inputUnitTypeId === null ? null : references.units.get(ingredient.inputUnitTypeId);
    if (ingredient.inputUnitTypeId !== null && inputUnit === undefined) return "invalid";
    const derived = deriveConsumptionQuantity(toQuantityPackage(packageRecord), {
      quantity: canonicalDecimal(ingredient.quantity),
      inputMode: ingredient.inputMode,
      inputUnit: inputUnit ?? null,
    });
    if (!derived.ok) return "invalid";
    contributions.push(calculateMacroValues(packageRecord.macroProfile, derived.value.baseAmount));
  }
  const summed = sumMacroValues(contributions);
  if (summed.caloriesKcal === null && summed.proteinG === null && summed.carbohydratesG === null && summed.fatG === null) return null;
  const servings = canonicalDecimal(version.servings);
  return {
    caloriesKcal: summed.caloriesKcal === null ? null : divideDecimals(summed.caloriesKcal, servings),
    proteinG: summed.proteinG === null ? null : divideDecimals(summed.proteinG, servings),
    carbohydratesG: summed.carbohydratesG === null ? null : divideDecimals(summed.carbohydratesG, servings),
    fatG: summed.fatG === null ? null : divideDecimals(summed.fatG, servings),
  };
}

/** Multiply each present macro value by a consumed quantity. */
function scaleMacroValues(values: MacroValues, multiplier: string): MacroValues {
  return {
    caloriesKcal: values.caloriesKcal === null ? null : multiplyDecimals(values.caloriesKcal, multiplier),
    proteinG: values.proteinG === null ? null : multiplyDecimals(values.proteinG, multiplier),
    carbohydratesG: values.carbohydratesG === null ? null : multiplyDecimals(values.carbohydratesG, multiplier),
    fatG: values.fatG === null ? null : multiplyDecimals(values.fatG, multiplier),
  };
}

/** Create dish projections for CRUD and search use cases. */
export function createDishProjector(catalogReader: ConsumptionCatalogReader, dishRepository: DishRepository) {
  /** Project one active dish stem with its newest recipe version. */
  function projectDish(stem: DishRecord): { readonly ok: true; readonly value: Dish } | { readonly ok: false } {
    const version = dishRepository.findNewestVersion(stem.id);
    if (version === undefined) return { ok: false };
    const ingredientRows = dishRepository.findIngredientsByVersionId(version.id);
    const references = readReferences(ingredientRows);
    if (references === undefined) return { ok: false };
    const perServing = computeDishVersionMacrosPerServing(version, ingredientRows, references);
    if (perServing === "invalid") return { ok: false };
    return {
      ok: true,
      value: {
        id: stem.id,
        name: stem.name,
        imageUrl: stem.imageUrl,
        servings: canonicalDecimal(version.servings),
        versionId: version.id,
        versionCreatedAt: version.createdAt,
        ingredients: ingredientRows.map((ingredient) => toDishIngredient(ingredient, references)),
        macrosPerServing: perServing,
        createdAt: stem.createdAt,
        updatedAt: stem.updatedAt,
      },
    };
  }

  /** Project active dish stems into search rows including derived calories per serving. */
  function projectDishSearchResults(stems: ReadonlyArray<DishRecord>, viewerUserId: string): ReadonlyArray<DishSearchResult> {
    return stems.flatMap((stem) => {
      const version = dishRepository.findNewestVersion(stem.id);
      if (version === undefined) return [];
      const ingredientRows = dishRepository.findIngredientsByVersionId(version.id);
      const references = readReferences(ingredientRows);
      if (references === undefined) return [];
      const perServing = computeDishVersionMacrosPerServing(version, ingredientRows, references);
      if (perServing === "invalid") return [];
      return [{
        id: stem.id,
        userId: stem.userId,
        name: stem.name,
        makerDisplayName: stem.userId === viewerUserId ? null : dishRepository.findMakerDisplayName(stem.userId),
        isOwnedByViewer: stem.userId === viewerUserId,
        imageUrl: stem.imageUrl,
        servings: canonicalDecimal(version.servings),
        caloriesPerServing: perServing === null ? null : perServing.caloriesKcal,
      }];
    });
  }

  /** Read catalog references required by one recipe version. */
  function readReferences(ingredientRows: ReadonlyArray<DishIngredientRecord>): Pick<ProjectionReferences, "packages" | "units"> | undefined {
    return {
      packages: new Map(catalogReader.findCatalogProductsByIds(ingredientRows.map((ingredient) => ingredient.productId)).map((value) => [value.productId, value])),
      units: new Map(catalogReader.findUnitTypesByIds(ingredientRows.flatMap((ingredient) => ingredient.inputUnitTypeId === null ? [] : [ingredient.inputUnitTypeId])).map((value) => [value.id, value])),
    };
  }

  return { projectDish, projectDishSearchResults };
}

/** Project one persisted ingredient with its current catalog presentation. */
function toDishIngredient(ingredient: DishIngredientRecord, references: Pick<ProjectionReferences, "packages" | "units">): DishIngredient {
  const packageRecord = references.packages.get(ingredient.productId);
  if (packageRecord === undefined) throw new Error("Persisted dish ingredient references a missing package");
  const inputUnit = ingredient.inputUnitTypeId === null ? null : references.units.get(ingredient.inputUnitTypeId);
  return {
    productId: ingredient.productId,
    productName: packageRecord.productName,
    displayName: formatConcreteProductDisplayName({
      brandName: packageRecord.brandName,
      compositionName: packageRecord.productName,
      packageTypeName: packageRecord.packageTypeName,
      contentAmount: canonicalDecimal(packageRecord.contentAmount),
      contentUnitSymbol: packageRecord.contentUnitSymbol,
    }),
    quantity: canonicalDecimal(ingredient.quantity),
    inputMode: ingredient.inputMode,
    inputUnitType: inputUnit === null || inputUnit === undefined ? null : toUnitType(inputUnit),
    productArchived: packageRecord.productArchivedAt !== null,
  };
}

/** Project a persistence unit into the shared strict protocol contract. */
export function toUnitType(row: UnitTypeRecord): CalorieTrackerUnitType {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    dimension: row.dimension,
    conversionToBase: canonicalDecimal(row.conversionToBase),
  };
}

/** Project joined package rows into the shared strict search contract. */
export function toProductSearchResult(row: CatalogProductRecord): ProductSearchResult {
  return {
    productId: row.productId,
    productName: row.productName,
    displayName: formatConcreteProductDisplayName({
      brandName: row.brandName,
      compositionName: row.productName,
      packageTypeName: row.packageTypeName,
      contentAmount: canonicalDecimal(row.contentAmount),
      contentUnitSymbol: row.contentUnitSymbol,
    }),
    brand: row.brandId === null || row.brandName === null ? null : { id: row.brandId, name: row.brandName },
    consumptionType: row.consumptionType,
    packageType: { id: row.packageTypeId, name: row.packageTypeName },
    contentAmount: canonicalDecimal(row.contentAmount),
    contentUnit: {
      id: row.contentUnitId,
      name: row.contentUnitName,
      symbol: row.contentUnitSymbol,
      dimension: row.contentUnitDimension,
      conversionToBase: canonicalDecimal(row.contentUnitConversionToBase),
    },
    portion: toCalorieTrackerPortion(row),
    packageSummary: packageSummary(row),
    imageUrl: row.packageImageUrl,
  };
}

/** Project package data into pure quantity-conversion input. */
export function toQuantityPackage(row: CatalogProductRecord): QuantityPackage {
  return {
    contentAmount: canonicalDecimal(row.contentAmount),
    contentUnit: {
      id: row.contentUnitId,
      name: row.contentUnitName,
      symbol: row.contentUnitSymbol,
      dimension: row.contentUnitDimension,
      conversionToBase: canonicalDecimal(row.contentUnitConversionToBase),
    } satisfies QuantityUnit,
    packageLabel: row.packageTypeName,
    portion: toQuantityPortion(row),
  };
}

/** Project a stored nutrition-goal row into the shared strict response contract. */
export function toNutritionGoal(row: NutritionGoalRecord): NutritionGoal {
  return {
    caloriesKcal: row.caloriesKcal,
    proteinG: row.proteinG === null ? null : canonicalDecimal(row.proteinG),
    carbohydratesG: row.carbohydratesG === null ? null : canonicalDecimal(row.carbohydratesG),
    fatG: row.fatG === null ? null : canonicalDecimal(row.fatG),
    updatedAt: row.updatedAt,
  };
}

/** Construct the response used before a user has stored any goals. */
export function emptyGoals(): NutritionGoal {
  return { caloriesKcal: null, proteinG: null, carbohydratesG: null, fatG: null, updatedAt: null };
}

/** Format total package content and optional portion data for compact selection. */
function packageSummary(row: CatalogProductRecord): string {
  const total = formatSharedPackageSummary({
    packageTypeName: row.packageTypeName,
    contentAmount: canonicalDecimal(row.contentAmount),
    contentUnitSymbol: row.contentUnitSymbol,
  }) ?? "";
  const portion = toCalorieTrackerPortion(row);
  if (portion === null) return total;
  const count = portion.portionsPerPackage === null ? "" : `${portion.portionsPerPackage} × `;
  return `${total} (${count}${formatDutchDecimal(portion.contentAmount)} ${portion.contentUnit.symbol} per ${portion.name})`;
}

/** Project complete optional portion joins into the strict Calorie Tracker contract. */
function toCalorieTrackerPortion(row: CatalogProductRecord): CalorieTrackerPortion | null {
  if (row.portionName === null) return null;
  if (
    row.portionContentAmount === null
    || row.portionContentUnitId === null
    || row.portionContentUnitName === null
    || row.portionContentUnitSymbol === null
    || row.portionContentUnitDimension === null
    || row.portionContentUnitConversionToBase === null
  ) throw new Error("Persisted package portion is missing unit content");
  return {
    name: row.portionName,
    contentAmount: canonicalDecimal(row.portionContentAmount),
    contentUnit: {
      id: row.portionContentUnitId,
      name: row.portionContentUnitName,
      symbol: row.portionContentUnitSymbol,
      dimension: row.portionContentUnitDimension,
      conversionToBase: canonicalDecimal(row.portionContentUnitConversionToBase),
    },
    portionsPerPackage: row.portionsPerProduct,
  };
}

/** Project an optional package portion into pure quantity-conversion input. */
function toQuantityPortion(row: CatalogProductRecord): QuantityPackage["portion"] {
  const portion = toCalorieTrackerPortion(row);
  if (portion === null) return null;
  return {
    contentAmount: portion.contentAmount,
    contentUnit: portion.contentUnit,
    label: portion.name,
  };
}
