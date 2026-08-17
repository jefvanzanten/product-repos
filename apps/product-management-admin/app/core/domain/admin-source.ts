/** A validated application from which Product Management Admin was opened. */
export type AdminSource = "inventory" | "calorie-tracker";

/**
 * Parse untrusted input into the closed admin-source union.
 *
 * @param input - Untrusted query or cookie input.
 * @returns The parsed source, or null for unknown input.
 */
export function parseAdminSource(input: string | null | undefined): AdminSource | null {
  return input === "inventory" || input === "calorie-tracker" ? input : null;
}
