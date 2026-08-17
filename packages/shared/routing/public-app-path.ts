/**
 * Build the canonical public detail route for one recipe.
 *
 * @param userId - Recipe owner identifier.
 * @param recipeId - Recipe identifier.
 * @returns Encoded canonical public recipe path.
 */
export function recipeDetailPath(userId: string, recipeId: string): string {
  return `/recepten/gebruiker/${encodeURIComponent(userId)}/${encodeURIComponent(recipeId)}`;
}

/**
 * Prefix an app-internal path with a public application basename.
 *
 * @param basePath - Public application basename.
 * @param internalPath - Path relative to the application basename.
 * @returns Normalized public application path.
 */
export function toPublicAppPath(basePath: string, internalPath: string): string {
  const normalizedBasePath = basePath.replace(/\/+$/, "");
  const normalizedInternalPath = internalPath === "/" ? "" : `/${internalPath.replace(/^\/+/, "")}`;
  return `${normalizedBasePath}${normalizedInternalPath}`;
}
