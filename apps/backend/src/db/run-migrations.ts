import type { Database } from "bun:sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { BackendDatabase } from "./index.ts";
import { normalizeLocationName } from "../modules/locations/domain/location-domain.ts";

/**
 * Run backend migrations with the exact TypeScript backfill required by migration SQL.
 *
 * @param sqlite - Owned Bun SQLite connection used to stage normalized keys.
 * @param database - Drizzle connection backed by the same SQLite connection.
 * @param migrationsFolder - Absolute or working-directory-relative migration directory.
 * @returns Nothing.
 */
export function runBackendMigrations(
  sqlite: Database,
  database: BackendDatabase,
  migrationsFolder: string,
): void {
  prepareLocationNormalizationBackfill(sqlite);
  migrate(database, { migrationsFolder });
  finalizeLocationConstraints(sqlite);
}

/**
 * Materialize exact TypeScript normalization keys for a pending location migration.
 *
 * Bun SQLite does not expose custom SQL functions, so the additive migration reads
 * this helper table. Existing invalid names or collisions still abort migration.
 *
 * @param sqlite - SQLite connection about to be migrated.
 * @returns Nothing.
 */
function prepareLocationNormalizationBackfill(sqlite: Database): void {
  const locationExists = sqlite.query<{ readonly count: number }, []>(
    "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'location'",
  ).get()?.count === 1;
  if (!locationExists) return;
  const columns = sqlite.query<{ readonly name: string }, []>("PRAGMA table_info(location)").all();
  if (columns.some((column) => column.name === "normalized_name")) return;

  sqlite.exec("CREATE TABLE IF NOT EXISTS _location_normalization_backfill (location_id INTEGER PRIMARY KEY, display_name TEXT NOT NULL, normalized_name TEXT NOT NULL)");
  sqlite.exec("DELETE FROM _location_normalization_backfill");
  const rows = sqlite.query<{ readonly id: number; readonly name: string }, []>("SELECT id, name FROM location ORDER BY id").all();
  const insert = sqlite.query("INSERT INTO _location_normalization_backfill (location_id, display_name, normalized_name) VALUES (?, ?, ?)");
  const fill = sqlite.transaction(() => {
    for (const row of rows) {
      const normalized = normalizeLocationName(row.name);
      if (!normalized.ok) throw new Error(`Existing location name is invalid: ${normalized.error}`);
      insert.run(row.id, normalized.value.name, normalized.value.normalizedName);
    }
  });
  fill();
}

/**
 * Rebuild a newly migrated location table with hard SQLite CHECK constraints.
 *
 * SQLite cannot add table constraints with ALTER TABLE. The runner performs the
 * canonical rebuild once, outside the migrator transaction, while retaining IDs
 * and every external foreign-key target.
 *
 * @param sqlite - Migrated SQLite connection.
 * @returns Nothing.
 */
function finalizeLocationConstraints(sqlite: Database): void {
  const tableSql = sqlite.query<{ readonly sql: string }, []>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'location'",
  ).get()?.sql;
  if (tableSql === undefined || tableSql.includes("location_name_length_valid")) return;
  const columns = sqlite.query<{ readonly name: string }, []>("PRAGMA table_info(location)").all();
  if (!columns.some((column) => column.name === "normalized_name")) return;

  const foreignKeysWereEnabled = sqlite.query<{ readonly foreign_keys: number }, []>("PRAGMA foreign_keys").get()?.foreign_keys === 1;
  sqlite.exec("PRAGMA foreign_keys = OFF");
  try {
    sqlite.exec(`
      BEGIN;
      CREATE TABLE location_constraints_rebuild (
        id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        parent_id integer REFERENCES location_constraints_rebuild(id) ON DELETE RESTRICT,
        name text NOT NULL,
        normalized_name text NOT NULL,
        archived_at text,
        created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT location_name_length_valid CHECK (length(name) BETWEEN 1 AND 100),
        CONSTRAINT location_normalized_name_length_valid CHECK (length(normalized_name) BETWEEN 1 AND 100),
        CONSTRAINT location_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id)
      );
      INSERT INTO location_constraints_rebuild (id, parent_id, name, normalized_name, archived_at, created_at, updated_at)
      SELECT id, parent_id, name, normalized_name, archived_at, created_at, updated_at FROM location;
      DROP TABLE location;
      ALTER TABLE location_constraints_rebuild RENAME TO location;
      CREATE UNIQUE INDEX location_root_normalized_name_unique
        ON location (normalized_name) WHERE parent_id IS NULL;
      CREATE UNIQUE INDEX location_sibling_normalized_name_unique
        ON location (parent_id, normalized_name) WHERE parent_id IS NOT NULL;
      COMMIT;
    `);
  } catch (cause: unknown) {
    if (sqlite.inTransaction) sqlite.exec("ROLLBACK");
    throw cause;
  } finally {
    if (foreignKeysWereEnabled) sqlite.exec("PRAGMA foreign_keys = ON");
  }
  const violations = sqlite.query("PRAGMA foreign_key_check").all();
  if (violations.length > 0) throw new Error("Location migration left invalid foreign keys");
}
