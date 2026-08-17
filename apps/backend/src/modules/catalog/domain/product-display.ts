import type { UnitDimension } from "@product-repos/contracts";
import { formatConcreteProductName as formatSharedConcreteProductName, formatPackageSummary as formatSharedPackageSummary } from "@product-repos/shared/product-presentation";

/** Values used to derive a concrete product's package label. */
export type PackageDisplayParts = {
  readonly packageType: string | null;
  readonly amount: string | null;
  readonly symbol: string | null;
};

/**
 * Format a concrete product package without leaving empty separators.
 *
 * @param parts - Optional packaging and content parts.
 * @returns A compact package summary, or null when no parts are available.
 */
export function formatPackageSummary(parts: PackageDisplayParts): string | null {
  return formatSharedPackageSummary({
    packageTypeName: parts.packageType,
    contentAmount: parts.amount,
    contentUnitSymbol: parts.symbol,
  });
}

/**
 * Format the shared composition name and concrete package as one display name.
 *
 * @param brandName - Optional brand name.
 * @param compositionName - Required composition name.
 * @param packageSummary - Optional package summary.
 * @returns The canonical concrete-product display name.
 */
export function formatConcreteProductName(brandName: string | null, compositionName: string, packageSummary: string | null): string {
  return formatSharedConcreteProductName(brandName, compositionName, packageSummary);
}

/**
 * Return the base-unit symbol used for an inventory content dimension.
 *
 * @param dimension - Unit dimension.
 * @returns Canonical base symbol.
 */
export function baseUnitSymbol(dimension: UnitDimension): "g" | "ml" | "st" {
  if (dimension === "MASS") return "g";
  if (dimension === "VOLUME") return "ml";
  return "st";
}
