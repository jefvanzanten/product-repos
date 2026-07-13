import { db } from "./index";
import { brands, productTypes, products, unitContents, unitType } from "./schema";
import { brandsData } from "../../data/brandData";
import { unitsData } from "../../data/unitsData";
import { productData } from "../../data/productData";
import { productTypesData } from "../../data/productTypesData";
import { unitContentsData } from "../../data/unitContentsData";

async function seed() {
  try {
    await db.insert(brands).values(brandsData);
    await db.insert(unitType).values(unitsData);
    await db.insert(productTypes).values(productTypesData);
    await db.insert(unitContents).values(unitContentsData);

    await db.insert(products).values(productData);

    console.log("Seed succesvol afgerond.");
  } catch (error) {
    if (error instanceof Error) {
      console.error("Seed mislukt:", error.message);
      if (error.message.includes("no such table")) {
        console.error("Zorg dat de tabellen zijn aangemaakt. Voer eerst 'db:migrate' uit.");
      }
    } else {
      console.error("Onbekende fout tijdens seed:", error);
    }
    process.exit(1);
  }
}

seed();
