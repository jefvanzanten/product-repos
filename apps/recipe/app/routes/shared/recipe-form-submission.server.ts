import { parseCreateRecipe } from "../../features/recipes/data/recipe-command-parser";
import type { RecipeFormSubmission } from "../../features/recipes/presentation/types/recipe-form.types";

/**
 * Parse the serialized recipe editor payload at the route boundary.
 *
 * @param request - Incoming recipe form request.
 * @returns The validated command and optional concurrency token.
 */
export async function parseRecipeFormSubmission(request: Request): Promise<RecipeFormSubmission | null> {
  const formData = await request.formData();
  const serialized = formData.get("payload");
  if (typeof serialized !== "string") return null;

  try {
    const input = parseCreateRecipe(JSON.parse(serialized) as unknown);
    if (input === null) return null;
    const expectedUpdatedAt = formData.get("expectedUpdatedAt");
    return {
      input,
      expectedUpdatedAt: typeof expectedUpdatedAt === "string" ? expectedUpdatedAt : null,
    };
  } catch {
    return null;
  }
}
