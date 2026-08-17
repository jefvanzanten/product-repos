import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBackendRuntime, type BackendRuntime } from "../src/composition.ts";
import { loadBackendConfig } from "../src/config.ts";
import { runBackendMigrations } from "../src/db/run-migrations.ts";

const tempDir = mkdtempSync(join(tmpdir(), "backend-api-test-"));
const databasePath = join(tempDir, "sqlite.db");
const sqlite = new Database(databasePath, { create: true });
sqlite.exec("PRAGMA foreign_keys = ON");
const testDb = drizzle(sqlite);
const migrationsFolder = fileURLToPath(new URL("../drizzle/migrations", import.meta.url));
runBackendMigrations(sqlite, testDb, migrationsFolder);

/** Parse an inserted SQLite row identifier at the test persistence boundary. */
function readInsertedId(row: unknown): number {
  if (typeof row !== "object" || row === null || !("id" in row)) throw new Error("SQLite insert did not return an id");
  const id = Reflect.get(row, "id");
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1) throw new Error("SQLite insert returned an invalid id");
  return id;
}

const categoryId = readInsertedId(sqlite.query("INSERT INTO category (name) VALUES (?) RETURNING id").get("Frisdrank"));
const brandId = crypto.randomUUID();
sqlite.query("INSERT INTO brand (id, name) VALUES (?, ?)").run(brandId, "Testmerk");
const unitTypeId = readInsertedId(sqlite.query("INSERT INTO unit_type (name, symbol, dimension, conversion_to_base) VALUES (?, ?, ?, ?) RETURNING id").get("liter", "l", "VOLUME", 1000));
const massUnitTypeId = readInsertedId(sqlite.query("INSERT INTO unit_type (name, symbol, dimension, conversion_to_base) VALUES (?, ?, ?, ?) RETURNING id").get("gram", "g", "MASS", 1));
const countUnitTypeId = readInsertedId(sqlite.query("INSERT INTO unit_type (name, symbol, dimension, conversion_to_base) VALUES (?, ?, ?, ?) RETURNING id").get("stuk", "st", "COUNT", 1));
const packageTypeId = readInsertedId(sqlite.query("INSERT INTO package_type (singular_name, plural_name) VALUES (?, ?) RETURNING id").get("fles", "flessen"));
sqlite.close();

/** Compose the migrated temporary backend and own its complete test cleanup. */
function createBackendTestRuntime(): BackendRuntime & { readonly cleanup: () => void } {
  const backend = createBackendRuntime(loadBackendConfig({
    NODE_ENV: "test",
    DATABASE_URL: databasePath,
    AUTH_DISABLE_SIGN_UP: "false",
    AUTH_TRUSTED_ORIGINS: "http://localhost:5173",
    BETTER_AUTH_SECRET: "test-only-better-auth-secret-at-least-32-chars",
  }));
  /** Close backend resources and remove the temporary database directory. */
  function cleanup(): void {
    backend.close();
    rmSync(tempDir, { recursive: true, force: true });
  }
  return { ...backend, cleanup };
}

const runtime = createBackendTestRuntime();

/** Real Hono application backed by the migrated temporary SQLite database. */
export const app = runtime.app;

/** Injected Drizzle database used by focused repository integration checks. */
export const testDatabase = runtime.resources.database;

/** Raise a test-only defect so the real global error boundary can be exercised. */
function throwTestDefect(): never {
  throw new Error("sensitive persistence detail");
}

app.get("/__test/defect", throwTestDefect);

/** Create a Better Auth test user and return its session cookie. */
async function createTestUser(email: string, name: string): Promise<string> {
  const response = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ email, name, password: "test-password-1234" }),
  });
  if (!response.ok) throw new Error(`Unable to create test user: ${response.status}`);
  const sessionCookie = response.headers
    .get("set-cookie")
    ?.split(/,(?=[^;,]+=)/)
    .map((value) => value.trim())
    .find((value) => value.includes("session_token"))
    ?.split(";", 1)[0];
  if (!sessionCookie) throw new Error("Better Auth did not return a test session cookie");
  return sessionCookie;
}

/** Send an API request with a supplied Better Auth session cookie. */
function requestWithSession(
  sessionCookie: string,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("cookie", sessionCookie);
  headers.set("origin", "http://localhost:5173");
  return Promise.resolve(app.request(path, { ...init, headers }));
}

const adminSessionCookie = await createTestUser("admin@example.test", "Test Admin");
const userSessionCookie = await createTestUser("user@example.test", "Test User");
const otherUserSessionCookie = await createTestUser("other-user@example.test", "Other Test User");
runtime.resources.sqlite
  .query("UPDATE user SET role = 'admin' WHERE email = ?")
  .run("admin@example.test");

/** Send an API request authenticated as the test administrator. */
export function requestAsAdmin(path: string, init: RequestInit = {}): Promise<Response> {
  return requestWithSession(adminSessionCookie, path, init);
}

/** Create one composition and concrete product through the target admin API. */
export async function createTestProduct(input: {
  readonly name: string;
  readonly consumptionType?: "FOOD" | "DRINK" | "SUPPLEMENT";
  readonly macroProfile?: unknown;
  readonly amount: string;
  readonly unitTypeId: number;
  readonly portion?: { readonly singularName: string; readonly pluralName: string; readonly amount: string; readonly unitTypeId: number; readonly portionsPerProduct: number | null } | null;
}): Promise<{ readonly compositionId: string; readonly productId: string }> {
  const headers = { "Content-Type": "application/json" };
  const compositionResponse = await requestAsAdmin("/product-compositions", { method: "POST", headers, body: JSON.stringify({ name: `${input.name} ${crypto.randomUUID()}`, categoryId, brandId: null, consumptionType: input.consumptionType ?? "FOOD", macroProfile: input.macroProfile ?? null }) });
  if (compositionResponse.status !== 201) throw new Error(`Unable to create test composition: ${compositionResponse.status}`);
  const composition = await compositionResponse.json() as { readonly id: string };
  const productResponse = await requestAsAdmin("/products", { method: "POST", headers, body: JSON.stringify({ productCompositionId: composition.id, packageTypeId, content: { amount: input.amount, unitTypeId: input.unitTypeId }, imageUrl: null, barcode: null, portion: input.portion ?? null }) });
  if (productResponse.status !== 201) throw new Error(`Unable to create test product: ${productResponse.status}`);
  const product = await productResponse.json() as { readonly productId: string };
  return { compositionId: composition.id, productId: product.productId };
}

/** Send an API request authenticated as a regular test user. */
export function requestAsUser(path: string, init: RequestInit = {}): Promise<Response> {
  return requestWithSession(userSessionCookie, path, init);
}

/** Send an API request authenticated as a second isolated regular test user. */
export function requestAsOtherUser(path: string, init: RequestInit = {}): Promise<Response> {
  return requestWithSession(otherUserSessionCookie, path, init);
}

/** Execute a parameterized mutation against the migrated route-integration SQLite database. */
export function executeTestSql(sql: string, ...parameters: ReadonlyArray<string | number | null>): void {
  runtime.resources.sqlite.query(sql).run(...parameters);
}

/** Stable catalog references seeded into the route-integration database. */
export const testCatalog = {
  categoryId,
  brandId,
  unitTypeId,
  massUnitTypeId,
  countUnitTypeId,
  packageTypeId,
} as const;

process.once("exit", runtime.cleanup);
