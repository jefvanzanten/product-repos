import type { RecipeInputMode } from "../../domain/recipe";

/** Format a canonical protocol decimal for Dutch readers. */
export function formatRecipeDecimal(value: string): string {
  return value.replace(".", ",");
}

/** Return a compact fallback label for a product-relative quantity mode. */
export function recipeInputModeLabel(mode: RecipeInputMode): string {
  if (mode === "FULL_PRODUCT") return "verpakking";
  if (mode === "PRODUCT_PORTION") return "portie";
  return "eenheid";
}

/** Format an ISO instant as a compact Dutch date. */
export function formatRecipeDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
