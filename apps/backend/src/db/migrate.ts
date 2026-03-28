import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const dbPath = process.env.DATABASE_URL || "./db/sqlite.db";
const sqlite = new Database(dbPath, { create: true });
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle/migrations" });
console.log("Migraties succesvol uitgevoerd.");
sqlite.close();
