/** A successful or failed pure parse outcome. */
export type ParseResult<T, E> =
  | { readonly tag: "Success"; readonly value: T }
  | { readonly tag: "Failure"; readonly error: E };

/** Parsed positive decimal quantity. */
export type PositiveDecimal = { readonly canonical: string };

/** Known quantity parse failures. */
export type QuantityParseError =
  | { readonly tag: "Required" }
  | { readonly tag: "NotNumeric" }
  | { readonly tag: "NotPositive" };

/** Parse Dutch or canonical positive decimal input without losing the canonical retry value. */
export function parsePositiveDecimal(input: string): ParseResult<PositiveDecimal, QuantityParseError> {
  const normalized = input.trim().replace(",", ".");
  if (normalized.length === 0) return { tag: "Failure", error: { tag: "Required" } };
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return { tag: "Failure", error: { tag: "NotNumeric" } };
  }
  const [wholePart = "0", fractionPart] = normalized.split(".");
  const whole = wholePart.replace(/^0+(?=\d)/, "");
  const fraction = fractionPart?.replace(/0+$/, "");
  const canonical = fraction === undefined || fraction.length === 0 ? whole : `${whole}.${fraction}`;
  if (/^0(?:\.0*)?$/.test(canonical)) {
    return { tag: "Failure", error: { tag: "NotPositive" } };
  }
  return { tag: "Success", value: { canonical } };
}

/** Determine whether an edit may retain its existing unit for the selected product. */
export function shouldIncludeLegacyInputUnit(selectedProductId: string | null, originalProductId: string): boolean {
  return selectedProductId === originalProductId;
}

/**
 * Keep a valid unit key or prefer an individual portion after a package's units load.
 * @param currentKey - The currently selected unit key.
 * @param availableKeys - The unit keys available for the selected package.
 * @returns The retained or preferred unit key, or null when no units are available.
 */
export function selectInputUnitKey(currentKey: string | null, availableKeys: ReadonlyArray<string>): string | null {
  if (currentKey !== null && availableKeys.includes(currentKey)) return currentKey;
  return availableKeys.find((key) => key.startsWith("PRODUCT_PORTION:")) ?? availableKeys[0] ?? null;
}

