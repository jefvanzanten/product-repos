import { db, closeDatabase } from "../index.ts";
import { packagingTypes } from "../schema.ts";

const commonPackagingTypes = [
  { name: "Fles" },
  { name: "Blik" },
  { name: "Pot" },
  { name: "Pak" },
  { name: "Zak" },
  { name: "Doos" },
  { name: "Tube" },
  { name: "Bakje" },
  { name: "Tray" },
  { name: "Wikkel" },
  { name: "Karton" },
  { name: "Sachet" },
];

async function seedCommonPackagingTypes() {
  try {
    await db.insert(packagingTypes).values(commonPackagingTypes).onConflictDoNothing();

    console.log(`${commonPackagingTypes.length} veelgebruikte verpakkingsmaterialen gecontroleerd/geseed.`);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Seed voor veelgebruikte verpakkingsmaterialen mislukt:", error.message);
    } else {
      console.error("Onbekende fout tijdens seed voor veelgebruikte verpakkingsmaterialen:", error);
    }

    process.exitCode = 1;
  } finally {
    closeDatabase();
  }
}

await seedCommonPackagingTypes();
