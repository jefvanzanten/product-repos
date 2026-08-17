import { canonicalDecimal } from "../../calorie-tracker/domain/calorie-tracker-domain.ts";

/** Ingredient fields relevant to recipe-content equality. */
type ComparableIngredient = {
  readonly productId: string;
  readonly quantity: string;
  readonly inputMode: "FULL_PRODUCT" | "PRODUCT_PORTION" | "CONTENT_UNIT";
  readonly inputUnitTypeId?: number | null;
};

/** Compare canonical recipe ingredient sequences. */
export function ingredientsEqual(current: ReadonlyArray<ComparableIngredient>, next: ReadonlyArray<ComparableIngredient>): boolean {
  return current.length === next.length && next.every((ingredient, index) => {
    const row = current[index]!;
    return row.productId === ingredient.productId
      && canonicalDecimal(row.quantity) === canonicalDecimal(ingredient.quantity)
      && row.inputMode === ingredient.inputMode
      && (row.inputUnitTypeId ?? null) === (ingredient.inputUnitTypeId ?? null);
  });
}

/** Normalize optional free instructions to a nullable stored value. */
export function normalizeInstructions(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length === 0 ? null : normalized;
}
