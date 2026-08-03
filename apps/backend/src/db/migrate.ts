import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { loadBackendConfig } from "../config.ts";
import { createDatabase } from "./index.ts";

const resources = createDatabase(loadBackendConfig(process.env));
try {
  migrate(resources.database, { migrationsFolder: "./drizzle/migrations" });
  console.log("Migraties succesvol uitgevoerd.");
} finally {
  resources.close();
}
