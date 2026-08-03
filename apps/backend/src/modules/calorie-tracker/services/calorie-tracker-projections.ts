import type {
  CalorieTrackerPortion,
  CalorieTrackerUnitType,
  ConsumptionLog,
  NutritionGoal,
  PackageSearchResult,
} from "@product-repos/contracts/calorie-tracker";
import {
  calculateMacroValues,
  canonicalDecimal,
  deriveConsumptionQuantity,
  localDateForInstant,
  type QuantityPackage,
  type QuantityUnit,
} from "../domain/calorie-tracker-domain.ts";
import type { CatalogPackageRecord, ConsumptionCatalogReader, UnitTypeRecord } from "../../catalog/repositories/consumption-catalog-reader.ts";
import type { ConsumptionLogRecord, NutritionGoalRecord } from "../repositories/calorie-tracker-store.ts";

/** Result of projecting persisted data into a strict response contract. */
export type LogProjection =
  | { readonly ok: true; readonly value: ConsumptionLog }
  | { readonly ok: false };

/** Catalog references required to project a collection of persisted logs. */
export type ProjectionReferences = {
  readonly packages: ReadonlyMap<number, CatalogPackageRecord>;
  readonly units: ReadonlyMap<number, UnitTypeRecord>;
};

/** Create reusable single and batched log projections from current catalog data. */
export function createConsumptionLogProjector(catalogReader: ConsumptionCatalogReader) {
  /** Read only current catalog references required by found logs. */
  function readReferences(rows: ReadonlyArray<ConsumptionLogRecord>): ProjectionReferences {
    const packageIds = rows.map((row) => row.productPackageId);
    const unitIds = rows.flatMap((row) => row.inputUnitTypeId === null ? [] : [row.inputUnitTypeId]);
    return {
      packages: new Map(catalogReader.findCatalogPackagesByIds(packageIds).map((value) => [value.packageId, value])),
      units: new Map(catalogReader.findUnitTypesByIds(unitIds).map((value) => [value.id, value])),
    };
  }

  /** Project one persistence log using optional preloaded references. */
  function projectLog(row: ConsumptionLogRecord, references?: ProjectionReferences): LogProjection {
    const packageRecord = references?.packages.get(row.productPackageId) ?? catalogReader.findCatalogPackage(row.productPackageId);
    const inputUnit = row.inputUnitTypeId === null
      ? null
      : references?.units.get(row.inputUnitTypeId) ?? catalogReader.findUnitType(row.inputUnitTypeId);
    return projectConsumptionLog(row, packageRecord, inputUnit);
  }

  return { readReferences, projectLog };
}

/** Project one persisted log with explicitly supplied current references. */
export function projectConsumptionLog(
  row: ConsumptionLogRecord,
  packageRecord: CatalogPackageRecord | undefined,
  inputUnit: UnitTypeRecord | null | undefined,
): LogProjection {
  if (packageRecord === undefined) return { ok: false };
  if (row.inputUnitTypeId !== null && inputUnit == null) return { ok: false };
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
        package: {
          ...toPackageSearchResult(packageRecord),
          productArchived: packageRecord.productArchivedAt !== null,
          packageArchived: packageRecord.packageArchivedAt !== null,
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
export function toPackageSearchResult(row: CatalogPackageRecord): PackageSearchResult {
  return {
    packageId: row.packageId,
    productId: row.productId,
    productName: row.productName,
    displayName: row.brandName === null ? row.productName : `${row.productName} - ${row.brandName}`,
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
    summary: packageSummary(row),
    imageUrl: row.packageImageUrl,
  };
}

/** Project package data into pure quantity-conversion input. */
export function toQuantityPackage(row: CatalogPackageRecord): QuantityPackage {
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
function packageSummary(row: CatalogPackageRecord): string {
  const total = `${row.packageTypeName} ${canonicalDecimal(row.contentAmount)} ${row.contentUnitSymbol}`;
  const portion = toCalorieTrackerPortion(row);
  if (portion === null) return total;
  const count = portion.portionsPerPackage === null ? "" : `${portion.portionsPerPackage} × `;
  return `${total} (${count}${canonicalDecimal(portion.contentAmount)} ${portion.contentUnit.symbol} per ${portion.name})`;
}

/** Project complete optional portion joins into the strict Calorie Tracker contract. */
function toCalorieTrackerPortion(row: CatalogPackageRecord): CalorieTrackerPortion | null {
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
    portionsPerPackage: row.portionsPerPackage,
  };
}

/** Project an optional package portion into pure quantity-conversion input. */
function toQuantityPortion(row: CatalogPackageRecord): QuantityPackage["portion"] {
  const portion = toCalorieTrackerPortion(row);
  if (portion === null) return null;
  return {
    contentAmount: portion.contentAmount,
    contentUnit: portion.contentUnit,
    label: portion.name,
  };
}
