/**
 * Check whether an unknown SQLite adapter error represents a unique constraint violation.
 *
 * @param error - The caught adapter error.
 * @returns `true` when SQLite reported a unique constraint violation.
 */
export function isSqliteUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = "code" in error ? error.code : undefined;
  return code === "SQLITE_CONSTRAINT_UNIQUE"
    || code === "SQLITE_CONSTRAINT_PRIMARYKEY"
    || code === "SQLITE_CONSTRAINT"
    || error.message.includes("UNIQUE constraint failed")
    || error.message.includes("constraint failed");
}
