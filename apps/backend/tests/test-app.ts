import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const tempDir = mkdtempSync(join(tmpdir(), "backend-api-test-"));
const databasePath = join(tempDir, "sqlite.db");
process.env.DATABASE_URL = databasePath;

const sqlite = new Database(databasePath, { create: true });
const testDb = drizzle(sqlite);
const migrationsFolder = fileURLToPath(new URL("../drizzle/migrations", import.meta.url));
migrate(testDb, { migrationsFolder });

const categoryId = (sqlite.query("INSERT INTO category (name) VALUES (?) RETURNING id").get("Frisdrank") as { id: number }).id;
const brandId = crypto.randomUUID();
sqlite.query("INSERT INTO brand (id, name) VALUES (?, ?)").run(brandId, "Testmerk");
const unitTypeId = (sqlite.query("INSERT INTO unit_type (name) VALUES (?) RETURNING id").get("liter") as { id: number }).id;
const packageTypeId = (sqlite.query("INSERT INTO package_type (name) VALUES (?) RETURNING id").get("fles") as { id: number }).id;
sqlite.close();

const appModule = await import("../src/app");
const dbModule = await import("../src/db/index");

export const app = appModule.createApp();
export const sqliteConnection = dbModule.sqliteConnection;

export const testCatalog = {
  categoryId,
  brandId,
  unitTypeId,
  packageTypeId,
} as const;

process.once("exit", () => {
  dbModule.closeDatabase();
  rmSync(tempDir, { recursive: true, force: true });
});
