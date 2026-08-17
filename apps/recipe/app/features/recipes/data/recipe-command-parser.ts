import { createRecipeSchema } from "@product-repos/contracts/recipes";
import type { CreateRecipe } from "../domain/recipe";

/**
 * Parse an untrusted create-recipe payload.
 *
 * @param input - Untrusted serialized form value.
 * @returns A validated recipe command or null.
 */
export function parseCreateRecipe(input: unknown): CreateRecipe | null {
  const parsed = createRecipeSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
