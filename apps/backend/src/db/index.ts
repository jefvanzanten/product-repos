import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

const dbPath = process.env.DATABASE_URL || "./db/sqlite.db";

const sqlite = new Database(dbPath);

export const db = drizzle(sqlite);

export const sqliteConnection = sqlite;

export const closeDatabase = () => {
  sqlite.close();
};
