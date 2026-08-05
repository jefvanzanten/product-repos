import { loadBackendConfig } from "../config.ts";
import { createDatabase } from "./index.ts";
import { runBackendMigrations } from "./run-migrations.ts";

const resources = createDatabase(loadBackendConfig(process.env));
try {
  runBackendMigrations(resources.sqlite, resources.database, "./drizzle/migrations");
  console.log("Migraties succesvol uitgevoerd.");
} finally {
  resources.close();
}
