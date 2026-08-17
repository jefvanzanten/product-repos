import type { RecipeIngredientInputOptions, RecipeInputMode } from "./recipe";

/** Minimum editable ingredient values needed for package-equivalent presentation. */
export type PackageEquivalentInput = {
  readonly package: RecipeIngredientInputOptions["package"] | null;
  readonly modes: RecipeIngredientInputOptions["modes"];
  readonly quantity: string;
  readonly inputMode: RecipeInputMode;
  readonly inputUnitTypeId: number | null;
};

/**
 * Format an informative package equivalent from the stored source quantity.
 *
 * @param ingredient - Ingredient quantity and available package metadata.
 * @returns A localized package equivalent, or null below one package.
 */
export function packageEquivalent(ingredient: PackageEquivalentInput): string | null {
  const packageInfo = ingredient.package;
  if (packageInfo === null) return null;
  const quantity = Number(ingredient.quantity.replace(",", "."));
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  const packages = calculatePackageCount(ingredient, quantity);
  if (packages === null || packages < 1) return null;
  const rounded = Math.round(packages * 10) / 10;
  const formatted = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(rounded);
  return `${formatted} ${rounded === 1 ? packageInfo.singularName : packageInfo.pluralName}`;
}

/**
 * Convert an ingredient quantity into its package count.
 *
 * @param ingredient - Ingredient quantity mode and package metadata.
 * @param quantity - Parsed positive ingredient quantity.
 * @returns The package count when the units are compatible.
 */
function calculatePackageCount(ingredient: PackageEquivalentInput, quantity: number): number | null {
  const packageInfo = ingredient.package;
  if (packageInfo === null) return null;
  if (ingredient.inputMode === "FULL_PRODUCT") return quantity;
  if (ingredient.inputMode === "PRODUCT_PORTION") {
    return packageInfo.portionsPerProduct === null ? null : quantity / packageInfo.portionsPerProduct;
  }

  const mode = ingredient.modes.find((value) => (
    value.inputMode === "CONTENT_UNIT" && value.unitType?.id === ingredient.inputUnitTypeId
  ));
  if (mode?.unitType === null || mode?.unitType === undefined) return null;
  if (mode.unitType.dimension !== packageInfo.contentUnitType.dimension) return null;
  return quantity * Number(mode.unitType.conversionToBase)
    / (Number(packageInfo.contentAmount) * Number(packageInfo.contentUnitType.conversionToBase));
}
