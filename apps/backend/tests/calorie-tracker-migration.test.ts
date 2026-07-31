import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDirectory = fileURLToPath(new URL("../drizzle/migrations", import.meta.url));

/** Apply one checked-in SQL migration to a real SQLite database. */
function applyMigration(database: Database, migrationName: string): void {
  const sql = readFileSync(join(migrationsDirectory, `${migrationName}.sql`), "utf8");
  database.exec(sql.replaceAll("--> statement-breakpoint", ""));
}

/** Read a numeric SQLite count result without weakening the test boundary type. */
function readCount(row: unknown): number {
  if (typeof row !== "object" || row === null || !("count" in row)) throw new Error("SQLite count row is missing");
  const count = Reflect.get(row, "count");
  if (typeof count !== "number") throw new Error("SQLite count is not numeric");
  return count;
}

/** Exercise the production 0005-to-0006 migration over representative legacy package rows. */
function verifyLegacyMultiPackageMigration(): void {
  const tempDirectory = mkdtempSync(join(tmpdir(), "calorie-migration-test-"));
  const database = new Database(join(tempDirectory, "migration.sqlite"), { create: true });

  try {
    for (const migrationName of [
      "0000_long_puppet_master",
      "0001_spooky_nebula",
      "0002_product_create_slice",
      "0003_better_auth",
      "0004_product_consumption_macros",
      "0005_product_package_integer_ids",
    ]) {
      applyMigration(database, migrationName);
    }

    database.query("INSERT INTO category (id, name) VALUES (?, ?)").run(1, "Dranken");
    database.query("INSERT INTO unit_type (id, name, symbol, dimension, conversion_to_base) VALUES (?, ?, ?, ?, ?)").run(1, "milliliter", "ml", "VOLUME", 1);
    database.query("INSERT INTO unit_content (id, unit_type_id, amount) VALUES (?, ?, ?)").run(1, 1, 330);
    database.query("INSERT INTO package_type (id, name) VALUES (?, ?), (?, ?)").run(1, "sixpack", 2, "fles");
    database.query("INSERT INTO product (id, name, category_id, brand_id, consumption_type) VALUES (?, ?, ?, NULL, ?), (?, ?, ?, NULL, ?)")
      .run("00000000-0000-4000-8000-000000000001", "Legacy cola", 1, "DRINK", "00000000-0000-4000-8000-000000000002", "Legacy water", 1, "DRINK");
    database.query("INSERT INTO product_package (id, product_id, unit_content_id, package_type_id, units_per_package) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)")
      .run(
        10, "00000000-0000-4000-8000-000000000001", 1, 1, 6,
        11, "00000000-0000-4000-8000-000000000001", 1, 2, 12,
        12, "00000000-0000-4000-8000-000000000002", 1, 2, 1,
      );

    applyMigration(database, "0006_calorie_tracker_backend");

    const marker = database.query("SELECT id, name FROM package_type WHERE name = ?").get("Individueel type controleren");
    expect(marker).toEqual(expect.objectContaining({ name: "Individueel type controleren" }));
    if (typeof marker !== "object" || marker === null || !("id" in marker)) throw new Error("Migration marker is missing its id");
    const markerId = Reflect.get(marker, "id");
    expect(typeof markerId).toBe("number");

    expect(database.query("SELECT id, units_per_package, individual_package_type_id FROM product_package ORDER BY id").all()).toEqual([
      { id: 10, units_per_package: 6, individual_package_type_id: markerId },
      { id: 11, units_per_package: 12, individual_package_type_id: markerId },
      { id: 12, units_per_package: 1, individual_package_type_id: null },
    ]);
    expect(readCount(database.query("SELECT count(*) AS count FROM package_type WHERE lower(trim(name)) = lower(?)").get("Individueel type controleren"))).toBe(1);
    expect(database.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    database.close();
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

describe("Calorie Tracker migration 0005 to 0006", () => {
  it("preserves legacy packages and maps every multi-package to one explicit correction marker", verifyLegacyMultiPackageMigration);
});
