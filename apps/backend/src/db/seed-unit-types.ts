import { sqliteConnection } from "./index";

const unitTypes = ["g", "kg", "ml", "l", "stuk"];

for (const name of unitTypes) {
  sqliteConnection.run("INSERT OR IGNORE INTO unit_type (name) VALUES (?)", [name]);
}

console.log(`Unit type seeds toegevoegd: ${unitTypes.join(", ")}`);
sqliteConnection.close();
