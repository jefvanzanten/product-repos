/**
 * Determine whether a Better Auth role list contains the administrator role.
 *
 * @param role - Comma-separated Better Auth role value.
 * @returns Whether the administrator role is present.
 */
export function hasAdminRole(role: string | null | undefined): boolean {
  return role?.split(",").some((entry) => entry.trim() === "admin") ?? false;
}
