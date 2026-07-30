/** Public basename used by the Calorie Tracker deployment. */
export const CALORY_TRACKER_BASE_PATH = "/calory-tracker";

/**
 * Normalize an app-internal path for a React Router server redirect.
 *
 * React Router applies the configured basename to redirect responses.
 *
 * @param internalPath - A path rooted inside the Calorie Tracker router.
 * @returns The normalized app-internal redirect path.
 */
export function toCaloryTrackerRedirectPath(internalPath: string): string {
  return internalPath === "/" ? "/" : `/${internalPath.replace(/^\/+/, "")}`;
}

/**
 * Convert an app-internal Calorie Tracker path into a public path.
 *
 * @param internalPath - A path rooted inside the Calorie Tracker router.
 * @returns The path prefixed with the public Calorie Tracker basename.
 */
export function toCaloryTrackerPublicPath(internalPath: string): string {
  const normalizedPath = internalPath === "/" ? "" : `/${internalPath.replace(/^\/+/, "")}`;
  return `${CALORY_TRACKER_BASE_PATH}${normalizedPath}`;
}
