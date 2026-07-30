/** Determine whether a Better Auth role list includes the administrator role. */
export function isAdministrator(role: string): boolean {
  return role.split(",").some((entry) => entry.trim() === "admin");
}
