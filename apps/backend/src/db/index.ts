import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const dbPath = process.env.DATABASE_URL || "./db/sqlite.db";
const resolvedDbPath = resolve(dbPath);

mkdirSync(dirname(resolvedDbPath), { recursive: true });

const sqlite = new Database(resolvedDbPath);

export const db = drizzle(sqlite);

export const sqliteConnection = sqlite;

export const closeDatabase = () => {
  sqlite.close();
};
