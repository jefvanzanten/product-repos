import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sql } from "drizzle-orm";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { BackendConfig } from "../config.ts";

/** Concrete Drizzle database type used by persistence adapters. */
export type BackendDatabase = ReturnType<typeof drizzle>;

/** Explicitly owned SQLite and Drizzle resources. */
export type DatabaseResource = {
  readonly database: BackendDatabase;
  readonly sqlite: Database;
  readonly close: () => void;
};

/** Create the technical readiness probe for an injected database. */
export function createDatabaseReadinessProbe(database: BackendDatabase): () => void {
  /** Raise a defect when the database cannot execute a trivial query. */
  function assertDatabaseReady(): void {
    database.get(sql`SELECT 1 as healthy`);
  }
  return assertDatabaseReady;
}

/** Open the configured SQLite database without import-time resource creation. */
export function createDatabase(config: Pick<BackendConfig, "databasePath">): DatabaseResource {
  const resolvedPath = resolve(config.databasePath);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  const sqlite = new Database(resolvedPath, { create: true });
  sqlite.exec("PRAGMA foreign_keys = ON");
  let closed = false;

  /** Close this database resource at most once. */
  function close(): void {
    if (closed) return;
    closed = true;
    sqlite.close();
  }

  return { database: drizzle(sqlite), sqlite, close };
}
