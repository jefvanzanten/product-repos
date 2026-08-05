import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runBackendMigrations } from "../src/db/run-migrations.ts";

const fullMigrationsFolder = fileURLToPath(new URL("../drizzle/migrations", import.meta.url));

type Journal = { readonly version: string; readonly dialect: string; readonly entries: ReadonlyArray<{ readonly idx: number }> };

/**
 * Build an isolated migration folder ending immediately before migration 0010.
 *
 * @param root - Temporary test directory.
 * @returns Pre-0010 migrations folder.
 */
function createPreLocationMigrations(root: string): string {
  const folder = join(root, "migrations-before-location");
  mkdirSync(join(folder, "meta"), { recursive: true });
  for (let index = 0; index <= 9; index += 1) {
    const prefix = String(index).padStart(4, "0");
    const source = readMigrationFile(prefix);
    cpSync(join(fullMigrationsFolder, source), join(folder, source));
  }
  const journal = JSON.parse(readFileSync(join(fullMigrationsFolder, "meta", "_journal.json"), "utf8")) as Journal;
  writeFileSync(join(folder, "meta", "_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.filter((entry) => entry.idx <= 9) }));
  return folder;
}

/**
 * Resolve one migration filename by numeric prefix.
 *
 * @param prefix - Four-digit migration prefix.
 * @returns Matching SQL filename.
 */
function readMigrationFile(prefix: string): string {
  const journal = JSON.parse(readFileSync(join(fullMigrationsFolder, "meta", "_journal.json"), "utf8")) as { readonly entries: ReadonlyArray<{ readonly tag: string }> };
  const tag = journal.entries.find((entry) => entry.tag.startsWith(prefix))?.tag;
  if (tag === undefined) throw new Error(`Migration ${prefix} was not found`);
  return `${tag}.sql`;
}

/**
 * Open an isolated database migrated through 0009.
 *
 * @param root - Temporary directory.
 * @returns Owned SQLite and Drizzle connections.
 */
function openPreLocationDatabase(root: string) {
  const sqlite = new Database(join(root, "sqlite.db"), { create: true });
  sqlite.exec("PRAGMA foreign_keys = ON");
  const database = drizzle(sqlite);
  runBackendMigrations(sqlite, database, createPreLocationMigrations(root));
  return { sqlite, database };
}

describe("location management migration", () => {
  test("backfills exact keys and preserves the existing hierarchy and timestamps", () => {
    const root = mkdtempSync(join(tmpdir(), "location-migration-"));
    const { sqlite, database } = openPreLocationDatabase(root);
    try {
      sqlite.query("INSERT INTO location (id, parent_id, name, archived_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(41, null, "  KÉUKEN   1  ", null, "2025-01-01T10:00:00.000Z", "2025-01-02T10:00:00.000Z");
      sqlite.query("INSERT INTO location (id, parent_id, name, archived_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(42, 41, "Lade 1", "2025-02-01T10:00:00.000Z", "2025-01-01T10:00:00.000Z", "2025-02-01T10:00:00.000Z");

      runBackendMigrations(sqlite, database, fullMigrationsFolder);
      const rows = sqlite.query<{ readonly id: number; readonly parentId: number | null; readonly name: string; readonly key: string; readonly archivedAt: string | null; readonly createdAt: string }, []>(
        "SELECT id, parent_id AS parentId, name, normalized_name AS key, archived_at AS archivedAt, created_at AS createdAt FROM location ORDER BY id",
      ).all();
      expect(rows).toEqual([
        { id: 41, parentId: null, name: "KÉUKEN 1", key: "kéuken 1", archivedAt: null, createdAt: "2025-01-01T10:00:00.000Z" },
        { id: 42, parentId: 41, name: "Lade 1", key: "lade 1", archivedAt: "2025-02-01T10:00:00.000Z", createdAt: "2025-01-01T10:00:00.000Z" },
      ]);
      const normalizedColumn = sqlite.query<{ readonly is_required: number }, []>("SELECT \"notnull\" AS is_required FROM pragma_table_info('location') WHERE name = 'normalized_name'").get();
      expect(normalizedColumn?.is_required).toBe(1);
      const tableSql = sqlite.query<{ readonly sql: string }, []>("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'location'").get()?.sql;
      expect(tableSql).toContain("location_name_length_valid");
      expect(() => sqlite.query("UPDATE location SET parent_id = id WHERE id = 41").run()).toThrow();
      expect(() => sqlite.query("DELETE FROM location WHERE id = 41").run()).toThrow();
      expect(sqlite.query("PRAGMA foreign_key_check").all()).toHaveLength(0);
    } finally {
      sqlite.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("aborts rather than renaming an existing normalization collision", () => {
    const root = mkdtempSync(join(tmpdir(), "location-collision-"));
    const { sqlite, database } = openPreLocationDatabase(root);
    try {
      sqlite.query("INSERT INTO location (name) VALUES (?), (?)").run("Koelkast", "  KOELKAST  ");
      expect(() => runBackendMigrations(sqlite, database, fullMigrationsFolder)).toThrow();
      const columns = sqlite.query<{ readonly name: string }, []>("PRAGMA table_info(location)").all();
      expect(columns.some((column) => column.name === "normalized_name")).toBeFalse();
    } finally {
      sqlite.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
