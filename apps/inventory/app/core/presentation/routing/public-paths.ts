import { INVENTORY_BASE_PATH } from "./inventory-routes";

export { INVENTORY_BASE_PATH, toInventoryPublicPath } from "./inventory-routes";

/**
 * Normalize an app-internal path for a React Router server redirect.
 *
 * @param internalPath - A path rooted inside the Inventory router.
 * @returns Normalized app-internal redirect path.
 */
export function toInventoryRedirectPath(internalPath: string): string {
  return internalPath === "/" ? "/" : `/${internalPath.replace(/^\/+/, "")}`;
}

/**
 * Parse an untrusted post-login Inventory destination.
 *
 * @param input - Untrusted return-path query input.
 * @returns Supported Inventory destination or `/`.
 */
export function parseInventoryReturnPath(input: string | null | undefined): string {
  if (!input || !input.startsWith("/") || input.startsWith("//")) return "/";
  const candidate = new URL(input, "https://inventory.internal");
  if (candidate.origin !== "https://inventory.internal" || candidate.pathname !== "/") return "/";
  return `${candidate.pathname}${candidate.search}${candidate.hash}`;
}

/**
 * Derive a validated app-internal return path from a protected public request.
 *
 * @param request - Incoming protected route request.
 * @returns Safe app-internal Inventory destination.
 */
export function returnPathFromRequest(request: Request): string {
  const url = new URL(request.url);
  if (url.pathname !== INVENTORY_BASE_PATH && !url.pathname.startsWith(`${INVENTORY_BASE_PATH}/`)) return "/";
  const internalPath = url.pathname.slice(INVENTORY_BASE_PATH.length) || "/";
  return parseInventoryReturnPath(`${internalPath}${url.search}${url.hash}`);
}
