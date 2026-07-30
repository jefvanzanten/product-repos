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
process.env.NODE_ENV = "test";
process.env.AUTH_DISABLE_SIGN_UP = "false";
process.env.AUTH_TRUSTED_ORIGINS = "http://localhost:5173";
process.env.BETTER_AUTH_SECRET = "test-only-better-auth-secret-at-least-32-chars";

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
dbModule.sqliteConnection
  .query("UPDATE user SET role = 'admin' WHERE email = ?")
  .run("admin@example.test");

/** Send an API request authenticated as the test administrator. */
export function requestAsAdmin(path: string, init: RequestInit = {}): Promise<Response> {
  return requestWithSession(adminSessionCookie, path, init);
}

/** Send an API request authenticated as a regular test user. */
export function requestAsUser(path: string, init: RequestInit = {}): Promise<Response> {
  return requestWithSession(userSessionCookie, path, init);
}

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
