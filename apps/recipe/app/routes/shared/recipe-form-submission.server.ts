import { parseCreateRecipe } from "../../features/recipes/data/recipe-command-parser";
import { z } from "zod";
import type { RecipeFormSubmission } from "../../features/recipes/presentation/types/recipe-form.types";

const recipeFormDataSchema = z.object({
  payload: z.string(),
  expectedUpdatedAt: z.string().nullable(),
});

/**
 * Parse the serialized recipe editor payload at the route boundary.
 *
 * @param request - Incoming recipe form request.
 * @returns The validated command and optional concurrency token.
 */
export async function parseRecipeFormSubmission(request: Request): Promise<RecipeFormSubmission | null> {
  const formData = await request.formData();
  const submission = recipeFormDataSchema.safeParse({
    payload: formData.get("payload"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
  });
  if (!submission.success) return null;

  try {
    const input = parseCreateRecipe(JSON.parse(submission.data.payload));
    return input === null
      ? null
      : { input, expectedUpdatedAt: submission.data.expectedUpdatedAt };
  } catch {
    return null;
  }
}
