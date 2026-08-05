import type { CaloriesSource, ConsumptionType, MacroProfile, MacroReferenceBasis } from "@product-repos/contracts";

/** Common product fields projected from create and edit forms. */
export type ProductFormProjection = {
  readonly name: string;
  readonly categoryId: number;
  readonly consumptionType: ConsumptionType;
  readonly macroProfile: MacroProfile | null;
};

/** Result of projecting browser FormData into product application input. */
export type ProductFormProjectionResult =
  | { readonly ok: true; readonly value: ProductFormProjection }
  | { readonly ok: false; readonly errors: Record<string, string> };

/** Project shared product FormData while preserving null versus a known zero value. */
export function projectProductFormData(form: FormData): ProductFormProjectionResult {
  const errors: Record<string, string> = {};
  const name = String(form.get("productName") ?? "").trim();
  if (!name) errors.productName = "Vul een productnaam in.";

  const categoryId = Number(form.get("categoryId"));
  if (!Number.isInteger(categoryId) || categoryId < 1) errors.categoryId = "Kies een categorie.";

  const consumptionType = parseConsumptionType(form.get("consumptionType"));
  if (consumptionType === null) errors.consumptionType = "Kies precies één consumptietype.";

  const macroProfile = parseMacroProfile(form, errors);
  if (Object.keys(errors).length > 0 || consumptionType === null) return { ok: false, errors };
  return { ok: true, value: { name, categoryId, consumptionType, macroProfile } };
}

/** Convert all submitted values to strings so React Router can restore the form. */
export function preserveProductFormValues(form: FormData): Record<string, string> {
  return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
}

/** Parse the selected consumption type from one radio group. */
function parseConsumptionType(value: FormDataEntryValue | null): ConsumptionType | null {
  if (value === "FOOD" || value === "DRINK" || value === "SUPPLEMENT") return value;
  return null;
}

/** Parse an optional macro profile and attach field-specific errors. */
function parseMacroProfile(form: FormData, errors: Record<string, string>): MacroProfile | null {
  if (String(form.get("macroEnabled") ?? "") !== "on") return null;

  const referenceBasis = parseReferenceBasis(form.get("referenceBasis"));
  if (referenceBasis === null) errors.referenceBasis = "Kies een referentiebasis.";
  const caloriesKcal = parseNullableDecimal(form.get("caloriesKcal"), "caloriesKcal", errors);
  const proteinG = parseNullableDecimal(form.get("proteinG"), "proteinG", errors);
  const carbohydratesG = parseNullableDecimal(form.get("carbohydratesG"), "carbohydratesG", errors);
  const fatG = parseNullableDecimal(form.get("fatG"), "fatG", errors);

  if (referenceBasis === null) return null;
  const caloriesSource = parseCaloriesSource(form, caloriesKcal);
  return { referenceBasis, caloriesKcal, proteinG, carbohydratesG, fatG, caloriesSource };
}

/** Parse one macro profile reference basis. */
function parseReferenceBasis(value: FormDataEntryValue | null): MacroReferenceBasis | null {
  if (value === "PER_100_G" || value === "PER_100_ML" || value === "PER_UNIT") return value;
  return null;
}

/** Normalize a nullable Dutch decimal value into the HTTP protocol representation. */
function parseNullableDecimal(value: FormDataEntryValue | null, field: string, errors: Record<string, string>): string | null {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) return null;
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) {
    errors[field] = "Gebruik een niet-negatief getal.";
    return null;
  }
  return String(Number(normalized));
}

/** Preserve an automatic source until the administrator edits the calorie field. */
function parseCaloriesSource(form: FormData, caloriesKcal: string | null): CaloriesSource | null {
  if (caloriesKcal === null) return null;
  const previousSource = String(form.get("caloriesSource") ?? "");
  const caloriesChanged = String(form.get("caloriesChanged") ?? "") === "true";
  return previousSource === "AUTOMATIC" && !caloriesChanged ? "AUTOMATIC" : "MANUAL";
}
