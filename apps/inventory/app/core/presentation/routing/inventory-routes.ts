import { toPublicAppPath } from "@product-repos/shared/public-app-path";

/** Public basename used by the Inventory deployment. */
export const INVENTORY_BASE_PATH = "/inventory";

/** Build the Inventory root route. */
export function inventoryPath(): string {
  return "/";
}

/**
 * Build the login route with an optional safe post-login destination.
 *
 * @param returnTo - App-internal destination.
 * @returns App-internal login path.
 */
export function inventoryLoginPath(returnTo?: string): string {
  if (returnTo === undefined || returnTo === "/") return "/login";
  return `/login?${new URLSearchParams({ returnTo })}`;
}

/** Build the independently deployed Product Management Admin destination. */
export function productManagementAdminPath(): string {
  return "/product-management-admin/product-catalogus?source=inventory";
}

/**
 * Prefix an app-internal route with the Inventory basename.
 *
 * @param internalPath - App-internal Inventory path.
 * @returns Public deployment path.
 */
export function toInventoryPublicPath(internalPath: string): string {
  return toPublicAppPath(INVENTORY_BASE_PATH, internalPath);
}
