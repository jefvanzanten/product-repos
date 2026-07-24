import { db, closeDatabase } from "../index.ts";
import { unitTypes } from "../schema.ts";

const commonUnitTypes = [
  { name: "g" },
  { name: "kg" },
  { name: "mg" },
  { name: "ml" },
  { name: "l" },
  { name: "cl" },
  { name: "stuk" },
  { name: "portie" },
  { name: "theelepel" },
  { name: "eetlepel" },
];

async function seedCommonUnitTypes() {
  try {
    await db.insert(unitTypes).values(commonUnitTypes).onConflictDoNothing();

    console.log(`${commonUnitTypes.length} veelgebruikte eenheden gecontroleerd/geseed.`);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Seed voor veelgebruikte eenheden mislukt:", error.message);
    } else {
      console.error("Onbekende fout tijdens seed voor veelgebruikte eenheden:", error);
    }

    process.exitCode = 1;
  } finally {
    closeDatabase();
  }
}

await seedCommonUnitTypes();
