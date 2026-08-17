import type { AvailableInputUnit, ProductConsumptionLog } from "./consumption-log";

/**
 * Encode an available unit as a stable select option value.
 *
 * @param unit - Available unit to encode.
 * @returns Stable option value for the unit.
 */
export function createUnitKey(unit: AvailableInputUnit): string {
  return `${unit.inputMode}:${unit.unitType?.id ?? "package"}`;
}

/**
 * Encode an existing product log unit in the same form as fetched available units.
 *
 * @param log - Existing product consumption log.
 * @returns Stable option value for the log's input unit.
 */
export function createExistingUnitKey(log: ProductConsumptionLog): string {
  return `${log.inputMode}:${log.inputUnitType?.id ?? "package"}`;
}

/**
 * Project an existing input unit so archived logs retain their current legal choice.
 *
 * @param log - Existing product consumption log.
 * @returns Available-unit projection of the log's input unit.
 */
export function createExistingUnit(log: ProductConsumptionLog): AvailableInputUnit {
  const label = log.inputMode === "CONTENT_UNIT"
    ? log.inputUnitType?.symbol ?? "Eenheid"
    : log.inputMode === "PRODUCT_PORTION"
      ? log.product.portion?.name ?? "Productportie"
      : log.product.packageType.name;
  return { inputMode: log.inputMode, unitType: log.inputUnitType, label };
}
