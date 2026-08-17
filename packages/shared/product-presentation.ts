/** Optional values used to build a concrete-product display name. */
export type ConcreteProductDisplayParts = {
  readonly brandName?: string | null;
  readonly compositionName?: string | null;
  readonly packageTypeName?: string | null;
  readonly contentAmount?: string | null;
  readonly contentUnitSymbol?: string | null;
};

/** Singular and plural names used by package types and product portions. */
export type InflectedNames = {
  readonly singularName: string;
  readonly pluralName: string;
};

/**
 * Format a canonical wire decimal for Dutch presentation without changing the wire value.
 *
 * @param value - Canonical decimal string using a point separator.
 * @returns Decimal string using a Dutch comma separator.
 */
export function formatDutchDecimal(value: string): string {
  return value.replace(".", ",");
}

/**
 * Build the packaging segment of a concrete-product display name.
 *
 * @param parts - Optional packaging values.
 * @returns Compact packaging text, or null when every value is absent.
 */
export function formatPackageSummary(parts: Pick<ConcreteProductDisplayParts, "packageTypeName" | "contentAmount" | "contentUnitSymbol">): string | null {
  const content = joinPresent([
    parts.contentAmount === null || parts.contentAmount === undefined ? null : formatDutchDecimal(parts.contentAmount),
    parts.contentUnitSymbol,
  ]);
  return joinPresent([parts.packageTypeName, content]) || null;
}

/**
 * Build the canonical `[brand] [name] — [package type] [content]` presentation.
 *
 * @param parts - Optional product identity and packaging values.
 * @returns Display name without dangling spaces or separators.
 */
export function formatConcreteProductDisplayName(parts: ConcreteProductDisplayParts): string {
  return formatConcreteProductName(
    parts.brandName,
    parts.compositionName,
    formatPackageSummary(parts),
  );
}

/**
 * Join product identity and a preformatted package summary.
 *
 * @param brandName - Optional brand name.
 * @param compositionName - Optional shared composition name.
 * @param packageSummary - Optional preformatted packaging text.
 * @returns Display name without dangling spaces or separators.
 */
export function formatConcreteProductName(
  brandName: string | null | undefined,
  compositionName: string | null | undefined,
  packageSummary: string | null | undefined,
): string {
  const identity = joinPresent([brandName, compositionName]);
  const packaging = packageSummary?.trim() ?? "";
  if (identity && packaging) return `${identity} — ${packaging}`;
  return identity || packaging;
}

/**
 * Select a singular or plural inflection for a quantity.
 *
 * @param names - Available singular and plural names.
 * @param quantity - Presented quantity; exactly one selects singular.
 * @returns The matching non-empty inflection.
 */
export function selectQuantityName(names: InflectedNames, quantity: number | string): string {
  const singular = names.singularName.trim();
  const plural = names.pluralName.trim();
  const selected = Number(quantity) === 1 ? singular : plural;
  return selected || singular || plural;
}

/**
 * Select the package-type name matching a quantity.
 *
 * @param packageType - Package type names.
 * @param quantity - Presented package quantity.
 * @returns Singular or plural package-type name.
 */
export function formatPackageTypeName(packageType: InflectedNames, quantity: number | string): string {
  return selectQuantityName(packageType, quantity);
}

/**
 * Select the product-portion name matching a quantity.
 *
 * @param portion - Product portion names.
 * @param quantity - Presented portion quantity.
 * @returns Singular or plural product-portion name.
 */
export function formatProductPortionName(portion: InflectedNames, quantity: number | string): string {
  return selectQuantityName(portion, quantity);
}

/**
 * Join present text values with one space.
 *
 * @param values - Optional text values.
 * @returns Trimmed, space-separated text.
 */
function joinPresent(values: ReadonlyArray<string | null | undefined>): string {
  return values.map((value) => value?.trim() ?? "").filter(Boolean).join(" ");
}
