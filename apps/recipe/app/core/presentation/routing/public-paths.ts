import { RECIPE_BASE_PATH } from "./recipe-routes";

const safeReturnPathPattern = /^(?:\/|\/nieuw|\/gebruiker\/[^/]+(?:\/[^/]+(?:\/bewerken)?)?)(?:\?.*)?$/;

/**
 * Parse an untrusted post-login destination into a supported internal path.
 *
 * @param input - Potential internal or public Recipe path.
 * @returns A safe application-internal path.
 */
export function parseRecipeReturnPath(input: string | null | undefined): string {
  if (!input || !input.startsWith("/") || input.startsWith("//")) return "/";
  const internal = stripRecipeBasePath(input);
  if (!safeReturnPathPattern.test(internal)) return "/";
  const candidate = new URL(internal, "https://recipe.internal");
  return `${candidate.pathname}${candidate.search}${candidate.hash}`;
}

/**
 * Derive a validated internal return path from a protected public request.
 *
 * @param request - Incoming request to a protected Recipe route.
 * @returns A safe application-internal return path.
 */
export function returnPathFromRequest(request: Request): string {
  const url = new URL(request.url);
  if (url.pathname !== RECIPE_BASE_PATH && !url.pathname.startsWith(`${RECIPE_BASE_PATH}/`)) return "/";
  return parseRecipeReturnPath(`${url.pathname}${url.search}${url.hash}`);
}

/**
 * Remove the Recipe basename from a public path.
 *
 * @param value - Public or internal path.
 * @returns The corresponding internal path.
 */
function stripRecipeBasePath(value: string): string {
  if (value === RECIPE_BASE_PATH) return "/";
  if (value.startsWith(`${RECIPE_BASE_PATH}/`)) return value.slice(RECIPE_BASE_PATH.length);
  return value;
}
