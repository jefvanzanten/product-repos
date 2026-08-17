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

/** Exercise the production 0005-to-0007 migrations over representative legacy package rows. */
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
    database.query("INSERT INTO product_macro_profile (product_id, reference_basis, calories_kcal, protein_g, carbohydrates_g, fat_g, calories_source) VALUES (?, 'PER_100_ML', ?, ?, NULL, NULL, 'MANUAL')")
      .run("00000000-0000-4000-8000-000000000001", 330, 0.0000001);

    applyMigration(database, "0006_calorie_tracker_backend");
    applyMigration(database, "0007_package_portions");

    const marker = database.query("SELECT id, name FROM package_type WHERE name = ?").get("Individueel type controleren");
    expect(marker).toEqual(expect.objectContaining({ name: "Individueel type controleren" }));
    expect(database.query(`
      SELECT pp.id, total.amount AS total_amount, portion.name AS portion_name,
        individual.amount AS portion_amount, portion.portions_per_package, pp.archived_at IS NOT NULL AS archived
      FROM product_package pp
      INNER JOIN unit_content total ON total.id = pp.unit_content_id
      LEFT JOIN product_package_portion portion ON portion.product_package_id = pp.id
      LEFT JOIN unit_content individual ON individual.id = portion.unit_content_id
      ORDER BY pp.id
    `).all()).toEqual([
      { id: 10, total_amount: "1980", portion_name: "Individueel type controleren", portion_amount: "330", portions_per_package: 6, archived: 1 },
      { id: 11, total_amount: "3960", portion_name: "Individueel type controleren", portion_amount: "330", portions_per_package: 12, archived: 1 },
      { id: 12, total_amount: "330", portion_name: null, portion_amount: null, portions_per_package: null, archived: 0 },
    ]);
    expect(database.query("SELECT conversion_to_base FROM unit_type WHERE id = 1").get()).toEqual({ conversion_to_base: "1" });
    expect(database.query("SELECT amount FROM unit_content WHERE id = 1").get()).toEqual({ amount: "330" });
    expect(database.query("SELECT calories_kcal, protein_g FROM product_macro_profile WHERE product_id = ?").get("00000000-0000-4000-8000-000000000001"))
      .toEqual({ calories_kcal: "330", protein_g: "0.0000001" });
    expect(readCount(database.query("SELECT count(*) AS count FROM package_type WHERE lower(trim(name)) = lower(?)").get("Individueel type controleren"))).toBe(1);
    expect(database.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    database.close();
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

describe("Calorie Tracker migrations 0005 to 0007", () => {
  it("canonicalizes legacy decimals and separates total content from quarantined portion data", verifyLegacyMultiPackageMigration);
});

/** Exercise the 0011 dish migration over a legacy product-only consumption log. */
function verifyDishSplitMigration(): void {
  const tempDirectory = mkdtempSync(join(tmpdir(), "calorie-dish-migration-test-"));
  const database = new Database(join(tempDirectory, "migration.sqlite"), { create: true });

  try {
    for (const migrationName of [
      "0000_long_puppet_master",
      "0001_spooky_nebula",
      "0002_product_create_slice",
      "0003_better_auth",
      "0004_product_consumption_macros",
      "0005_product_package_integer_ids",
      "0006_calorie_tracker_backend",
      "0007_package_portions",
      "0008_product_package_image",
      "0009_inventory_backend",
      "0010_location_management",
    ]) {
      applyMigration(database, migrationName);
    }

    const userId = "20000000-0000-4000-8000-000000000001";
    database.query("INSERT INTO `user` (id, name, email, created_at, updated_at) VALUES (?, ?, ?, 0, 0)").run(userId, "Migratie Tester", "dish-migration@example.com");
    database.query("INSERT INTO category (id, name) VALUES (?, ?)").run(1, "Vlees");
    database.query("INSERT INTO unit_type (id, name, symbol, dimension, conversion_to_base) VALUES (?, ?, ?, ?, ?)").run(1, "gram", "g", "MASS", 1);
    database.query("INSERT INTO unit_content (id, unit_type_id, amount) VALUES (?, ?, ?)").run(1, 1, 500);
    database.query("INSERT INTO package_type (id, name) VALUES (?, ?)").run(1, "pak");
    database.query("INSERT INTO product (id, name, category_id, brand_id, consumption_type) VALUES (?, ?, ?, NULL, ?)")
      .run("20000000-0000-4000-8000-000000000002", "Rundergehakt", 1, "FOOD");
    database.query("INSERT INTO product_package (id, product_id, unit_content_id, package_type_id) VALUES (?, ?, ?, ?)")
      .run(20, "20000000-0000-4000-8000-000000000002", 1, 1);
    database.query("INSERT INTO location (id, parent_id, name, normalized_name) VALUES (1, NULL, 'Koelkast', 'koelkast')").run();
    database.query("INSERT INTO inventory_item (id, product_package_id, location_id, expiry_date, quantity, version) VALUES (?, ?, ?, ?, ?, ?)")
      .run("20000000-0000-4000-8000-000000000004", 20, 1, "2026-02-01", 3, 0);
    database.query("INSERT INTO consumption_log (id, user_id, product_package_id, quantity, input_mode, input_unit_type_id, consumed_at, timezone, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL)")
      .run("20000000-0000-4000-8000-000000000003", userId, 20, "1.5", "PACKAGE", "2026-01-01T12:00:00.000Z", "Europe/Amsterdam", "2026-01-01T12:00:00.000Z", "2026-01-01T12:00:00.000Z");

    applyMigration(database, "0011_dishes_backend");

    expect(database.query("SELECT id, user_id, type, consumed_at, timezone, deleted_at FROM consumption_log").all()).toEqual([{
      id: "20000000-0000-4000-8000-000000000003",
      user_id: userId,
      type: "PRODUCT",
      consumed_at: "2026-01-01T12:00:00.000Z",
      timezone: "Europe/Amsterdam",
      deleted_at: null,
    }]);
    expect(database.query("SELECT consumption_log_id, product_package_id, quantity, input_mode, input_unit_type_id FROM product_consumption").all()).toEqual([{
      consumption_log_id: "20000000-0000-4000-8000-000000000003",
      product_package_id: 20,
      quantity: "1.5",
      input_mode: "PACKAGE",
      input_unit_type_id: null,
    }]);
    expect(readCount(database.query("SELECT count(*) AS count FROM dish").get())).toBe(0);
    expect(readCount(database.query("SELECT count(*) AS count FROM dish_version").get())).toBe(0);
    expect(readCount(database.query("SELECT count(*) AS count FROM dish_consumption").get())).toBe(0);

    applyMigration(database, "0012_product_model_v2_additive");
    applyMigration(database, "0013_product_model_v2_backfill");

    expect(readCount(database.query("SELECT count(*) AS count FROM product_composition").get())).toBe(1);
    expect(readCount(database.query("SELECT count(*) AS count FROM concrete_product").get())).toBe(1);
    expect(readCount(database.query("SELECT count(*) AS count FROM legacy_product_package_map").get())).toBe(1);
    expect(readCount(database.query("SELECT count(*) AS count FROM physical_inventory_item").get())).toBe(3);
    expect(database.query("SELECT input_mode, product_id IS NOT NULL AS mapped FROM product_consumption").get()).toEqual({ input_mode: "FULL_PRODUCT", mapped: 1 });
    expect(database.query("SELECT legacy_package_count, mapped_package_count, concrete_product_count, expected_physical_inventory_count, physical_inventory_count FROM product_model_v2_invariants").get()).toEqual({
      legacy_package_count: 1,
      mapped_package_count: 1,
      concrete_product_count: 1,
      expected_physical_inventory_count: 3,
      physical_inventory_count: 3,
    });

    applyMigration(database, "0014_product_model_v2_cleanup");
    expect(readCount(database.query("SELECT count(*) AS count FROM product").get())).toBe(1);
    expect(database.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('product_package', 'legacy_product_package_map', 'inventory_item', 'concrete_product')").all()).toEqual([]);
    expect(database.query("PRAGMA table_info(product_consumption)").all().some((column) => (column as { name?: string }).name === "product_package_id")).toBe(false);
    expect(database.query("PRAGMA table_info(package_type)").all().some((column) => (column as { name?: string }).name === "name")).toBe(false);
    expect(database.query("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally {
    database.close();
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

describe("Calorie Tracker dish migration 0011", () => {
  it("moves legacy product logs into product_consumption and adds empty dish tables", verifyDishSplitMigration);
});
