import { redirect, type LoaderFunctionArgs } from "react-router";
import { optionalUser } from "../../core/presentation/auth/auth.server";
import { parseRecipeReturnPath } from "../../core/presentation/routing/public-paths";
import { toRecipePublicPath } from "../../core/presentation/routing/recipe-routes";

/** Redirect authenticated visitors and resolve a safe login return path. */
export async function loadLoginRoute({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const returnTo = parseRecipeReturnPath(url.searchParams.get("returnTo"));
  if (await optionalUser(request)) throw redirect(returnTo);
  return { successPath: toRecipePublicPath(returnTo) };
}
