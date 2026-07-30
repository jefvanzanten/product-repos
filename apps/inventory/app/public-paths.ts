/** Public basename used by the Inventory deployment. */
export const INVENTORY_BASE_PATH = "/inventory";

/**
 * Normalize an app-internal path for a React Router server redirect.
 *
 * React Router applies the configured basename to redirect responses.
 *
 * @param internalPath - A path rooted inside the Inventory router.
 * @returns The normalized app-internal redirect path.
 */
export function toInventoryRedirectPath(internalPath: string): string {
  return internalPath === "/" ? "/" : `/${internalPath.replace(/^\/+/, "")}`;
}

/**
 * Convert an app-internal Inventory path into a public path.
 *
 * @param internalPath - A path rooted inside the Inventory router.
 * @returns The path prefixed with the public Inventory basename.
 */
export function toInventoryPublicPath(internalPath: string): string {
  const normalizedPath = internalPath === "/" ? "" : `/${internalPath.replace(/^\/+/, "")}`;
  return `${INVENTORY_BASE_PATH}${normalizedPath}`;
}
