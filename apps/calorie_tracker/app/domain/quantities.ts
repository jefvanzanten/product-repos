/** A successful or failed pure parse outcome. */
export type ParseResult<T, E> =
  | { readonly _tag: "Success"; readonly value: T }
  | { readonly _tag: "Failure"; readonly error: E };

/** Parsed positive decimal quantity. */
export type PositiveDecimal = { readonly canonical: string };

/** Known quantity parse failures. */
export type QuantityParseError =
  | { readonly _tag: "Required" }
  | { readonly _tag: "NotNumeric" }
  | { readonly _tag: "NotPositive" };

/** Parse Dutch or canonical positive decimal input without losing the canonical retry value. */
export function parsePositiveDecimal(input: string): ParseResult<PositiveDecimal, QuantityParseError> {
  const normalized = input.trim().replace(",", ".");
  if (normalized.length === 0) return { _tag: "Failure", error: { _tag: "Required" } };
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return { _tag: "Failure", error: { _tag: "NotNumeric" } };
  }
  const [wholePart = "0", fractionPart] = normalized.split(".");
  const whole = wholePart.replace(/^0+(?=\d)/, "");
  const fraction = fractionPart?.replace(/0+$/, "");
  const canonical = fraction === undefined || fraction.length === 0 ? whole : `${whole}.${fraction}`;
  if (/^0(?:\.0*)?$/.test(canonical)) {
    return { _tag: "Failure", error: { _tag: "NotPositive" } };
  }
  return { _tag: "Success", value: { canonical } };
}

/** Determine whether an edit may retain its legacy input unit for the selected package. */
export function shouldIncludeLegacyInputUnit(selectedPackageId: number | null, originalPackageId: number): boolean {
  return selectedPackageId === originalPackageId;
}

/**
 * Keep a valid unit key or prefer an individual portion after a package's units load.
 * @param currentKey - The currently selected unit key.
 * @param availableKeys - The unit keys available for the selected package.
 * @returns The retained or preferred unit key, or null when no units are available.
 */
export function selectInputUnitKey(currentKey: string | null, availableKeys: ReadonlyArray<string>): string | null {
  if (currentKey !== null && availableKeys.includes(currentKey)) return currentKey;
  return availableKeys.find((key) => key.startsWith("INDIVIDUAL_UNIT:")) ?? availableKeys[0] ?? null;
}

/** Format a protocol decimal for Dutch UI, rounding only for presentation. */
export function formatDecimal(value: string | null, maximumFractionDigits: number): string {
  if (value === null) return "0";
  return new Intl.NumberFormat("nl-NL", { maximumFractionDigits }).format(Number(value));
}
