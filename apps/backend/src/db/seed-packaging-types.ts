import { sqliteConnection } from "./index";

const packagingTypes = ["fles", "pot", "zak", "doos", "blik", "pak"];

for (const name of packagingTypes) {
  sqliteConnection.run("INSERT OR IGNORE INTO packaging_type (name) VALUES (?)", [name]);
}

console.log(`Packaging type seeds toegevoegd: ${packagingTypes.join(", ")}`);
sqliteConnection.close();
