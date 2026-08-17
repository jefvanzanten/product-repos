const nonNegativeDecimalPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const positiveIntegerPattern = /^[1-9]\d*$/;

/**
 * Parse a positive whole-package quantity.
 *
 * @param value - Untrusted form text.
 * @returns The safe positive integer or null when invalid.
 */
export function parsePackageQuantity(value: string): number | null {
  if (!positiveIntegerPattern.test(value)) return null;
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) ? quantity : null;
}

/**
 * Determine whether text is a canonical non-negative inventory decimal.
 *
 * @param value - Untrusted decimal text.
 * @returns Whether the value can be sent to the Inventory API.
 */
export function isInventoryDecimal(value: string): boolean {
  return nonNegativeDecimalPattern.test(value);
}
