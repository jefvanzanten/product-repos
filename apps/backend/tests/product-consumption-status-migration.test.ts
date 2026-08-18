import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const temporaryDirectories: string[] = [];
afterEach(() => { for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

/** Execute the optional-consumption migration in a focused schema fixture. */
function executeMigration(database: Database): void {
  const path = fileURLToPath(new URL("../drizzle/migrations/0015_optional_consumption_and_macro_status.sql", import.meta.url));
  database.exec(readFileSync(path, "utf8"));
}

describe("optional consumption and macro status migration", () => {
  test("preserves classifications, row counts, macro values, and foreign keys", () => {
    const directory = mkdtempSync(join(tmpdir(), "consumption-status-migration-"));
    temporaryDirectories.push(directory);
    const database = new Database(join(directory, "fixture.sqlite"), { create: true });
    database.exec(`
      PRAGMA foreign_keys=ON;
      CREATE TABLE category (id integer PRIMARY KEY, name text NOT NULL);
      CREATE TABLE brand (id text PRIMARY KEY, name text NOT NULL);
      CREATE TABLE product_composition (
        id text PRIMARY KEY, name text NOT NULL, category_id integer NOT NULL REFERENCES category(id),
        brand_id text REFERENCES brand(id), consumption_type text NOT NULL CHECK (consumption_type IN ('FOOD', 'DRINK', 'SUPPLEMENT')),
        created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX product_composition_no_brand_name_unique ON product_composition(category_id, lower(trim(name))) WHERE brand_id IS NULL;
      CREATE TABLE product_macro_profile (
        product_composition_id text PRIMARY KEY REFERENCES product_composition(id) ON DELETE CASCADE,
        reference_basis text NOT NULL, calories_kcal text, protein_g text, carbohydrates_g text, fat_g text, calories_source text,
        created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE product (id text PRIMARY KEY, product_composition_id text NOT NULL REFERENCES product_composition(id));
      INSERT INTO category (id, name) VALUES (1, 'Test');
      INSERT INTO product_composition (id, name, category_id, consumption_type) VALUES ('food', 'Voeding', 1, 'FOOD'), ('drink', 'Drank', 1, 'DRINK');
      INSERT INTO product_macro_profile (product_composition_id, reference_basis, calories_kcal, calories_source) VALUES ('drink', 'PER_100_ML', '42', 'MANUAL');
      INSERT INTO product (id, product_composition_id) VALUES ('product', 'drink');
    `);

    executeMigration(database);
    expect(database.query("SELECT id, consumption_type FROM product_composition ORDER BY id").all()).toEqual([
      { id: "drink", consumption_type: "DRINK" },
      { id: "food", consumption_type: "FOOD" },
    ]);
    expect(database.query("SELECT calories_kcal, is_active FROM product_macro_profile").get()).toEqual({ calories_kcal: "42", is_active: 1 });
    database.exec("UPDATE product_composition SET consumption_type = NULL WHERE id = 'food'");
    expect(database.query("SELECT consumption_type FROM product_composition WHERE id = 'food'").get()).toEqual({ consumption_type: null });
    expect(database.query("PRAGMA foreign_key_check").all()).toEqual([]);
    database.close();
  });
});
