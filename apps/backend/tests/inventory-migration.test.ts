import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const temporaryDirectories: string[] = [];
afterEach(() => { for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

/** Execute one checked-in SQL migration directly in a migration fixture. */
function executeMigration(database: Database, name: string): void {
  const path = fileURLToPath(new URL(`../drizzle/migrations/${name}.sql`, import.meta.url));
  database.exec(readFileSync(path, "utf8"));
}

describe("physical inventory migration", () => {
  test("expands an old quantity N into N independent full rows", () => {
    const directory = mkdtempSync(join(tmpdir(), "inventory-migration-"));
    temporaryDirectories.push(directory);
    const database = new Database(join(directory, "inventory.sqlite"), { create: true });
    for (const name of ["0000_long_puppet_master", "0001_spooky_nebula", "0002_product_create_slice", "0003_better_auth", "0004_product_consumption_macros", "0005_product_package_integer_ids", "0006_calorie_tracker_backend", "0007_package_portions", "0008_product_package_image", "0009_inventory_backend", "0010_location_management", "0011_dishes_backend", "0012_product_model_v2_additive"]) executeMigration(database, name);
    database.exec(`
      INSERT INTO category (id, name) VALUES (1, 'Test');
      INSERT INTO unit_type (id, name, symbol, dimension, conversion_to_base) VALUES (1, 'gram', 'g', 'MASS', '1');
      INSERT INTO unit_content (id, unit_type_id, amount) VALUES (1, 1, '500');
      INSERT INTO package_type (id, name, singular_name, plural_name) VALUES (1, 'pak', 'pak', 'pakken');
      INSERT INTO product (id, name, category_id, consumption_type) VALUES ('00000000-0000-4000-8000-000000000001', 'Migratieproduct', 1, 'FOOD');
      INSERT INTO product_package (id, product_id, unit_content_id, package_type_id) VALUES (1, '00000000-0000-4000-8000-000000000001', 1, 1);
      INSERT INTO location (id, name, normalized_name) VALUES (1, 'Kast', 'kast');
      INSERT INTO inventory_item (id, product_package_id, location_id, expiry_date, quantity, version) VALUES ('00000000-0000-4000-8000-000000000002', 1, 1, '2026-08-10', 3, 0);
    `);
    executeMigration(database, "0013_product_model_v2_backfill");
    const rows = database.query("SELECT remaining_amount_base, location_id, expiry_date FROM physical_inventory_item ORDER BY id").all() as Array<{ remaining_amount_base: string; location_id: number; expiry_date: string }>;
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.remaining_amount_base)).toEqual(["500.0", "500.0", "500.0"]);
    expect(rows.every((row) => row.location_id === 1 && row.expiry_date === "2026-08-10")).toBeTrue();
    executeMigration(database, "0014_product_model_v2_cleanup");
    expect(database.query("SELECT count(*) AS count FROM product").get()).toEqual({ count: 1 });
    expect(database.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('inventory_item', 'inventory_mutation')").all()).toEqual([]);
    expect(database.query("PRAGMA foreign_key_check").all()).toEqual([]);
    database.close();
  });
});
