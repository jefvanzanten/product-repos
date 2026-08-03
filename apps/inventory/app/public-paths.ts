import { toPublicAppPath } from "@product-repos/shared/public-app-path";

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
  return toPublicAppPath(INVENTORY_BASE_PATH, internalPath);
}

/**
 * Parse an untrusted post-login Inventory destination.
 *
 * @param input - Untrusted `returnTo` query input.
 * @returns The supported Inventory root with retained query context, or `/`.
 */
export function parseInventoryReturnPath(input: string | null | undefined): string {
  if (!input || !input.startsWith("/") || input.startsWith("//")) return "/";
  const candidate = new URL(input, "https://inventory.internal");
  if (candidate.origin !== "https://inventory.internal" || candidate.pathname !== "/") return "/";
  return `${candidate.pathname}${candidate.search}${candidate.hash}`;
}
