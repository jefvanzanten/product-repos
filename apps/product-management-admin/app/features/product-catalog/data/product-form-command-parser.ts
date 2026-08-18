import { readFormText, readFormEntryText } from "../../../core/data/form-data";
import type { CaloriesSource, ConsumptionType, MacroProfile, MacroProfileMutation, MacroReferenceBasis } from "../domain/product-catalog";

/** Composition identity and nullable consumption classification from a form. */
export type CompositionFormProjection = {
  readonly name: string;
  readonly categoryId: number;
  readonly consumptionType: ConsumptionType | null;
};

/** Create-form projection combining composition identity with optional active nutrition. */
export type ProductFormProjection = CompositionFormProjection & {
  readonly macroProfile: MacroProfile | null;
};

/** Result of projecting browser FormData into product application input. */
export type ProductFormProjectionResult<T = ProductFormProjection> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: Record<string, string> };

/** Project composition identity and its explicit consumable toggle. */
export function projectCompositionFormData(form: FormData): ProductFormProjectionResult<CompositionFormProjection> {
  const errors: Record<string, string> = {};
  const name = readFormText(form, "productName").trim();
  if (!name) errors.productName = "Vul een productnaam in.";

  const categoryId = Number(form.get("categoryId"));
  if (!Number.isInteger(categoryId) || categoryId < 1) errors.categoryId = "Kies een categorie.";

  const consumable = readFormText(form, "consumableEnabled") === "on";
  const consumptionType = consumable ? parseConsumptionType(form.get("consumptionType")) : null;
  if (consumable && consumptionType === null) errors.consumptionType = "Kies precies één consumptietype.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, categoryId, consumptionType } };
}

/** Project an explicit nutrition activation or non-destructive deactivation. */
export function projectMacroProfileMutation(form: FormData): ProductFormProjectionResult<MacroProfileMutation> {
  if (readFormText(form, "macroEnabled") !== "on") return { ok: true, value: { enabled: false } };
  const errors: Record<string, string> = {};
  const profile = parseMacroProfile(form, errors);
  if (Object.keys(errors).length > 0 || profile === null) return { ok: false, errors };
  return { ok: true, value: { enabled: true, profile } };
}

/** Project all fields needed when creating a new composition. */
export function projectProductFormData(form: FormData): ProductFormProjectionResult {
  const composition = projectCompositionFormData(form);
  if (!composition.ok) return composition;
  const mutation = projectMacroProfileMutation(form);
  if (!mutation.ok) return mutation;
  if (composition.value.consumptionType === null && mutation.value.enabled) {
    return { ok: false, errors: { macroProfile: "Voedingswaarden vereisen een consumptieproduct." } };
  }
  return { ok: true, value: { ...composition.value, macroProfile: mutation.value.enabled ? mutation.value.profile : null } };
}

/** Convert all submitted values to strings so React Router can restore the form. */
export function preserveProductFormValues(form: FormData): Record<string, string> {
  return Object.fromEntries([...form.entries()].map(([key, value]) => [key, readFormEntryText(value)]));
}

/** Parse the selected consumption type from one radio group. */
function parseConsumptionType(value: FormDataEntryValue | null): ConsumptionType | null {
  if (value === "FOOD" || value === "DRINK" || value === "SUPPLEMENT") return value;
  return null;
}

/** Parse enabled macro values and attach field-specific errors. */
function parseMacroProfile(form: FormData, errors: Record<string, string>): MacroProfile | null {
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
  const normalized = readFormEntryText(value).trim().replace(",", ".");
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
  const previousSource = readFormText(form, "caloriesSource");
  const caloriesChanged = readFormText(form, "caloriesChanged") === "true";
  return previousSource === "AUTOMATIC" && !caloriesChanged ? "AUTOMATIC" : "MANUAL";
}
