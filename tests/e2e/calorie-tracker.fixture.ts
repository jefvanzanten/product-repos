import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BACKEND_ORIGIN,
  CATALOG,
  FIXTURE_ORIGIN,
  FRONTEND_ORIGIN,
  LOGS,
  USER_A,
  USER_B,
  currentAmsterdamDate,
} from "./calorie-tracker.fixture-data";

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(sourceDirectory, "../..");
const backendDirectory = join(repositoryRoot, "apps/backend");
const frontendDirectory = join(repositoryRoot, "apps/calory_tracker");
const temporaryDirectory = mkdtempSync(join(tmpdir(), "calorie-tracker-e2e-"));
const databasePath = join(temporaryDirectory, "calorie-tracker.sqlite");
const frontendPort = new URL(FRONTEND_ORIGIN).port;
const backendPort = new URL(BACKEND_ORIGIN).port;
const fixturePort = Number(new URL(FIXTURE_ORIGIN).port);

const backendEnvironment = {
  ...process.env,
  DATABASE_URL: databasePath,
  PORT: backendPort,
  HOST: "127.0.0.1",
  NODE_ENV: "test",
  AUTH_DISABLE_SIGN_UP: "false",
  AUTH_TRUSTED_ORIGINS: FRONTEND_ORIGIN,
  CORS_ORIGIN: FRONTEND_ORIGIN,
  BETTER_AUTH_URL: BACKEND_ORIGIN,
  BETTER_AUTH_SECRET: "calorie-e2e-isolated-secret-at-least-32-characters",
};

const frontendEnvironment = {
  ...process.env,
  API_URL: BACKEND_ORIGIN,
  VITE_API_URL: BACKEND_ORIGIN,
};

/** Run the real Drizzle migration entrypoint against the temporary SQLite file. */
async function migrateDatabase(): Promise<void> {
  const migration = Bun.spawn(["bun", "run", "src/db/migrate.ts"], {
    cwd: backendDirectory,
    env: backendEnvironment,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await migration.exited;
  if (exitCode !== 0) throw new Error(`Calorie Tracker E2E migration failed with exit code ${exitCode}`);
}

/** Wait until an HTTP process accepts requests or fail with useful startup context. */
async function waitForHttp(url: string, processName: string, attempts = 120): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // The real process is still starting; the bounded retry below owns this expected state.
    }
    await Bun.sleep(250);
  }
  throw new Error(`${processName} did not become reachable at ${url}`);
}

/** Create one anonymous test account through the real Better Auth HTTP boundary. */
async function createAnonymousUser(email: string, password: string, name: string): Promise<void> {
  const response = await fetch(`${BACKEND_ORIGIN}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: FRONTEND_ORIGIN },
    body: JSON.stringify({ email, password, name }),
  });
  if (!response.ok) {
    throw new Error(`Unable to create anonymous E2E user (${response.status}): ${await response.text()}`);
  }
}

/** Insert stable catalog records used by browser search and current-data joins. */
function seedCatalog(sqlite: Database): void {
  sqlite.exec("BEGIN IMMEDIATE");
  try {
    sqlite.query("INSERT INTO category (id, name) VALUES (?, ?)").run(101, "E2E producten");
    sqlite.query("INSERT INTO brand (id, name) VALUES (?, ?)").run("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "Anoniem merk");

    const unitStatement = sqlite.query("INSERT INTO unit_type (id, name, symbol, dimension, conversion_to_base) VALUES (?, ?, ?, ?, ?)");
    unitStatement.run(101, "gram", "g", "MASS", "1");
    unitStatement.run(102, "milliliter", "ml", "VOLUME", "1");
    unitStatement.run(103, "stuk", "st", "COUNT", "1");

    const contentStatement = sqlite.query("INSERT INTO unit_content (id, unit_type_id, amount) VALUES (?, ?, ?)");
    contentStatement.run(101, 101, "100");
    contentStatement.run(102, 102, "500");
    contentStatement.run(103, 103, "1");
    contentStatement.run(104, 101, "250");
    contentStatement.run(105, 101, "75");

    const packageTypeStatement = sqlite.query("INSERT INTO package_type (id, name) VALUES (?, ?)");
    packageTypeStatement.run(101, "Reep");
    packageTypeStatement.run(102, "Fles");
    packageTypeStatement.run(103, "Pot");
    packageTypeStatement.run(104, "Zak");
    packageTypeStatement.run(105, "Doos");

    const productStatement = sqlite.query("INSERT INTO product (id, name, category_id, brand_id, consumption_type, archived_at, created_at, updated_at) VALUES (?, ?, 101, ?, ?, ?, ?, ?)");
    const catalogTimestamp = "2024-01-01T00:00:00.000Z";
    const brandId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    productStatement.run("aaaaaaaa-0001-4000-8000-000000000001", "Volkoren reep", brandId, "FOOD", null, catalogTimestamp, catalogTimestamp);
    productStatement.run("aaaaaaaa-0002-4000-8000-000000000002", "Bronwater", brandId, "DRINK", null, catalogTimestamp, catalogTimestamp);
    productStatement.run("aaaaaaaa-0003-4000-8000-000000000003", "Testcapsule", brandId, "SUPPLEMENT", null, catalogTimestamp, catalogTimestamp);
    productStatement.run("aaaaaaaa-0004-4000-8000-000000000004", "Archiefmix", brandId, "FOOD", null, catalogTimestamp, catalogTimestamp);
    productStatement.run("aaaaaaaa-0005-4000-8000-000000000005", "Privéproduct", brandId, "FOOD", null, catalogTimestamp, catalogTimestamp);

    const packageStatement = sqlite.query("INSERT INTO product_package (id, product_id, unit_content_id, package_type_id, individual_package_type_id, units_per_package, archived_at, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, 1, ?, ?, ?)");
    packageStatement.run(CATALOG.foodPackageId, "aaaaaaaa-0001-4000-8000-000000000001", 101, 101, null, catalogTimestamp, catalogTimestamp);
    packageStatement.run(CATALOG.drinkPackageId, "aaaaaaaa-0002-4000-8000-000000000002", 102, 102, null, catalogTimestamp, catalogTimestamp);
    packageStatement.run(CATALOG.supplementPackageId, "aaaaaaaa-0003-4000-8000-000000000003", 103, 103, null, catalogTimestamp, catalogTimestamp);
    packageStatement.run(CATALOG.archivedPackageId, "aaaaaaaa-0004-4000-8000-000000000004", 104, 104, catalogTimestamp, catalogTimestamp, catalogTimestamp);
    packageStatement.run(CATALOG.privatePackageId, "aaaaaaaa-0005-4000-8000-000000000005", 105, 105, null, catalogTimestamp, catalogTimestamp);

    const macroStatement = sqlite.query("INSERT INTO product_macro_profile (product_id, reference_basis, calories_kcal, protein_g, carbohydrates_g, fat_g, calories_source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'MANUAL', ?, ?)");
    macroStatement.run("aaaaaaaa-0001-4000-8000-000000000001", "PER_100_G", "240", "8", "36", "7", catalogTimestamp, catalogTimestamp);
    macroStatement.run("aaaaaaaa-0002-4000-8000-000000000002", "PER_100_ML", "10", "0", "2", "0", catalogTimestamp, catalogTimestamp);
    macroStatement.run("aaaaaaaa-0003-4000-8000-000000000003", "PER_UNIT", "25", "4", "1", "1", catalogTimestamp, catalogTimestamp);
    macroStatement.run("aaaaaaaa-0004-4000-8000-000000000004", "PER_100_G", "100", "5", "10", "3", catalogTimestamp, catalogTimestamp);
    macroStatement.run("aaaaaaaa-0005-4000-8000-000000000005", "PER_100_G", "180", "6", "20", "5", catalogTimestamp, catalogTimestamp);
    sqlite.exec("COMMIT");
  } catch (cause: unknown) {
    sqlite.exec("ROLLBACK");
    throw cause;
  }
}

/** Read a test user's generated Better Auth identifier by deterministic email. */
function findUserId(sqlite: Database, email: string): string {
  const row = sqlite.query("SELECT id FROM user WHERE email = ?").get(email);
  if (typeof row !== "object" || row === null || !("id" in row)) throw new Error(`Missing E2E user ${email}`);
  const id = Reflect.get(row, "id");
  if (typeof id !== "string") throw new Error(`Invalid E2E user id for ${email}`);
  return id;
}

/** Build a stable UTC instant that remains on the supplied date in Europe/Amsterdam. */
function instant(date: string, hour: string): string {
  return `${date}T${hour}:00:00.000Z`;
}

/** Restore deterministic user-owned goals and logs before each browser scenario. */
function resetScenario(sqlite: Database, date: string): void {
  const userAId = findUserId(sqlite, USER_A.email);
  const userBId = findUserId(sqlite, USER_B.email);
  sqlite.exec("BEGIN IMMEDIATE");
  try {
    sqlite.exec("DELETE FROM user_nutrition_goal; DELETE FROM consumption_log;");
    sqlite.query("UPDATE product_package SET archived_at = NULL WHERE id IN (?, ?, ?, ?)").run(CATALOG.foodPackageId, CATALOG.drinkPackageId, CATALOG.supplementPackageId, CATALOG.privatePackageId);
    sqlite.query("UPDATE product_package SET archived_at = ? WHERE id = ?").run("2024-01-01T00:00:00.000Z", CATALOG.archivedPackageId);

    const logStatement = sqlite.query("INSERT INTO consumption_log (id, user_id, product_package_id, quantity, input_mode, input_unit_type_id, consumed_at, timezone, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, 'PACKAGE', NULL, ?, 'Europe/Amsterdam', ?, ?, NULL)");
    logStatement.run(LOGS.earlyFood, userAId, CATALOG.foodPackageId, "1", instant(date, "06"), instant(date, "05"), instant(date, "05"));
    logStatement.run(LOGS.lateDrink, userAId, CATALOG.drinkPackageId, "1", instant(date, "09"), instant(date, "05"), instant(date, "05"));
    logStatement.run(LOGS.supplement, userAId, CATALOG.supplementPackageId, "2", instant(date, "11"), instant(date, "05"), instant(date, "05"));
    logStatement.run(LOGS.archived, userAId, CATALOG.archivedPackageId, "1", instant(date, "13"), instant(date, "05"), instant(date, "05"));
    logStatement.run(LOGS.otherUser, userBId, CATALOG.privatePackageId, "1", instant(date, "08"), instant(date, "05"), instant(date, "05"));
    sqlite.query("INSERT INTO user_nutrition_goal (user_id, calories_kcal, protein_g, carbohydrates_g, fat_g, created_at, updated_at) VALUES (?, 250, '100', NULL, NULL, ?, ?)").run(userAId, instant(date, "04"), instant(date, "04"));
    sqlite.exec("COMMIT");
  } catch (cause: unknown) {
    sqlite.exec("ROLLBACK");
    throw cause;
  }
}

/** Parse a JSON object from a fixture-control request. */
async function readObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value)) : null;
  } catch {
    return null;
  }
}

/** Serve deterministic database setup operations without changing production routes. */
function startControlServer(sqlite: Database): ReturnType<typeof Bun.serve> {
  return Bun.serve({
    hostname: "127.0.0.1",
    port: fixturePort,
    /** Handle one local E2E setup operation against the real temporary database. */
    async fetch(request): Promise<Response> {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") return Response.json({ ready: true });
      const body = await readObject(request);
      if (request.method === "POST" && url.pathname === "/reset") {
        const date = body?.date;
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response("Invalid date", { status: 400 });
        resetScenario(sqlite, date);
        return Response.json({ reset: true });
      }
      if (request.method === "POST" && url.pathname === "/touch-log") {
        const id = body?.id;
        if (typeof id !== "string") return new Response("Invalid id", { status: 400 });
        sqlite.query("UPDATE consumption_log SET quantity = '3', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
        return Response.json({ touched: true });
      }
      return new Response("Not found", { status: 404 });
    },
  });
}

await migrateDatabase();
const sqlite = new Database(databasePath);
sqlite.exec("PRAGMA foreign_keys = ON;");
seedCatalog(sqlite);

const backend = Bun.spawn(["bun", "run", "src/index.ts"], {
  cwd: backendDirectory,
  env: backendEnvironment,
  stdout: "inherit",
  stderr: "inherit",
});
await waitForHttp(`${BACKEND_ORIGIN}/health`, "backend");
await createAnonymousUser(USER_A.email, USER_A.password, "Anonieme tester A");
await createAnonymousUser(USER_B.email, USER_B.password, "Anonieme tester B");
resetScenario(sqlite, currentAmsterdamDate());
const controlServer = startControlServer(sqlite);

const frontendViteConfig = join(sourceDirectory, "calorie-tracker.vite.config.ts");
const frontend = Bun.spawn(["bun", "run", "dev", ".", "--config", frontendViteConfig, "--host", "127.0.0.1", "--port", frontendPort], {
  cwd: frontendDirectory,
  env: frontendEnvironment,
  stdout: "inherit",
  stderr: "inherit",
});

let stopping = false;

/** Stop all isolated fixture resources and remove the temporary database. */
async function stopFixture(exitCode: number): Promise<never> {
  if (stopping) process.exit(exitCode);
  stopping = true;
  controlServer.stop(true);
  frontend.kill("SIGTERM");
  backend.kill("SIGTERM");
  await Promise.all([frontend.exited, backend.exited]);
  sqlite.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
  process.exit(exitCode);
}

/** Handle a runner termination signal with complete fixture cleanup. */
function handleTermination(): void {
  void stopFixture(0);
}

process.on("SIGINT", handleTermination);
process.on("SIGTERM", handleTermination);

const frontendExitCode = await frontend.exited;
if (!stopping) {
  console.error(`Calorie Tracker frontend exited unexpectedly with code ${frontendExitCode}`);
  await stopFixture(frontendExitCode || 1);
}
