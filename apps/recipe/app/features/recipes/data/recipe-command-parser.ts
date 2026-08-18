import { createRecipeSchema, type CreateRecipe } from "@product-repos/contracts/recipes";

/**
 * Parse an untrusted create-recipe payload.
 *
 * @param input - Untrusted serialized form value.
 * @returns A validated recipe command or null.
 */
export function parseCreateRecipe(input: Parameters<typeof createRecipeSchema.safeParse>[0]): CreateRecipe | null {
  const parsed = createRecipeSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
