import type { MacroProfile, MacroReferenceBasis, UnitDimension } from "@product-repos/contracts";
import { err, ok, type Result } from "../domain";

/** A normalized macro profile that is safe to persist. */
export type NormalizedMacroProfile = MacroProfile;

/** Normalize and derive a product macro profile according to catalog rules. */
export function parseProductMacroProfile(input: MacroProfile | null | undefined): Result<NormalizedMacroProfile | null> {
  if (input === null || input === undefined) return ok(null);

  const calories = parseNullableDecimal(input.caloriesKcal, "caloriesKcal");
  if (!calories.ok) return calories;
  const protein = parseNullableDecimal(input.proteinG, "proteinG");
  if (!protein.ok) return protein;
  const carbohydrates = parseNullableDecimal(input.carbohydratesG, "carbohydratesG");
  if (!carbohydrates.ok) return carbohydrates;
  const fat = parseNullableDecimal(input.fatG, "fatG");
  if (!fat.ok) return fat;

  const automaticCalories = calculateCalories(protein.value, carbohydrates.value, fat.value);
  let caloriesKcal = calories.value;
  let caloriesSource = input.caloriesSource;

  if (input.caloriesSource === "MANUAL" && caloriesKcal === null) {
    return invalidMacroProfile("Handmatige calorieën vereisen een caloriewaarde.", "caloriesKcal");
  }
  if (input.caloriesSource === "AUTOMATIC") {
    if (automaticCalories === null) return invalidMacroProfile("Automatische calorieën vereisen eiwit, koolhydraten en vet.", "caloriesKcal");
    caloriesKcal = automaticCalories;
    caloriesSource = "AUTOMATIC";
  } else if (caloriesKcal !== null) {
    caloriesSource = "MANUAL";
  } else if (automaticCalories !== null) {
    caloriesKcal = automaticCalories;
    caloriesSource = "AUTOMATIC";
  } else {
    caloriesSource = null;
  }

  const values = [caloriesKcal, protein.value, carbohydrates.value, fat.value];
  if (!values.some((value) => value !== null && Number(value) > 0)) {
    return invalidMacroProfile("Vul minimaal één voedingswaarde groter dan nul in.", "macroProfile");
  }

  return ok({
    referenceBasis: input.referenceBasis,
    caloriesKcal,
    proteinG: protein.value,
    carbohydratesG: carbohydrates.value,
    fatG: fat.value,
    caloriesSource,
  });
}

/** Return the unit dimension required by a macro profile reference basis. */
export function requiredDimensionForReferenceBasis(referenceBasis: MacroReferenceBasis): UnitDimension {
  if (referenceBasis === "PER_100_G") return "MASS";
  if (referenceBasis === "PER_100_ML") return "VOLUME";
  return "COUNT";
}

/** Check whether every package dimension is compatible with a macro profile. */
export function checkMacroProfileDimensions(profile: NormalizedMacroProfile | null, dimensions: ReadonlyArray<UnitDimension>): Result<true> {
  if (profile === null) return ok(true);
  const requiredDimension = requiredDimensionForReferenceBasis(profile.referenceBasis);
  if (dimensions.every((dimension) => dimension === requiredDimension)) return ok(true);
  return err({
    code: "UNIT_DIMENSION_INCOMPATIBLE",
    message: "De referentiebasis past niet bij de inhoudseenheid van iedere verpakking.",
    fields: { referenceBasis: "Kies een referentiebasis die bij alle verpakkingen past." },
  });
}

/** Parse a nullable non-negative decimal into its canonical string representation. */
function parseNullableDecimal(value: string | null, field: string): Result<string | null> {
  if (value === null) return ok(null);
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return invalidMacroProfile("Gebruik een positief getal met een punt als decimaalteken.", field);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return invalidMacroProfile("Voedingswaarden mogen niet negatief zijn.", field);
  return ok(String(parsed));
}

/** Calculate calories from a complete set of macro values using the 4/4/9 rule. */
function calculateCalories(proteinG: string | null, carbohydratesG: string | null, fatG: string | null): string | null {
  if (proteinG === null || carbohydratesG === null || fatG === null) return null;
  const calories = Number(proteinG) * 4 + Number(carbohydratesG) * 4 + Number(fatG) * 9;
  return String(Number(calories.toFixed(12)));
}

/** Construct an expected macro-profile validation failure. */
function invalidMacroProfile(message: string, field: string): Result<never> {
  return err({ code: "PRODUCT_MACRO_PROFILE_INVALID", message, fields: { [field]: message } });
}
