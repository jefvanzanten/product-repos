import { describe, expect, test } from "vitest";
import { preserveProductFormValues, projectCompositionFormData, projectMacroProfileMutation, projectProductFormData } from "./product-form-command-parser";

/** Build a valid composition form that individual tests can adjust. */
function validCompositionForm(): FormData {
  const form = new FormData();
  form.set("productName", "Testproduct");
  form.set("categoryId", "1");
  form.set("consumableEnabled", "on");
  form.set("consumptionType", "FOOD");
  return form;
}

describe("product form command projections", () => {
  test("requires a conscious type while the consumable toggle is enabled", () => {
    const form = validCompositionForm();
    form.delete("consumptionType");
    expect(projectCompositionFormData(form)).toEqual({ ok: false, errors: { consumptionType: "Kies precies één consumptietype." } });
  });

  test("projects an explicitly disabled consumable toggle to null", () => {
    const form = validCompositionForm();
    form.delete("consumableEnabled");
    expect(projectCompositionFormData(form)).toMatchObject({ ok: true, value: { consumptionType: null } });
  });

  test("separates non-destructive nutrition deactivation from composition fields", () => {
    const form = validCompositionForm();
    expect(projectMacroProfileMutation(form)).toEqual({ ok: true, value: { enabled: false } });
    expect(projectProductFormData(form)).toMatchObject({ ok: true, value: { macroProfile: null } });
  });

  test("preserves submitted values and parses an enabled macro mutation", () => {
    const form = validCompositionForm();
    form.set("macroEnabled", "on");
    form.set("referenceBasis", "PER_100_G");
    form.set("proteinG", "7,5");
    const result = projectMacroProfileMutation(form);
    expect(result).toMatchObject({ ok: true, value: { enabled: true, profile: { proteinG: "7.5", referenceBasis: "PER_100_G" } } });
    expect(preserveProductFormValues(form)).toMatchObject({ macroEnabled: "on", proteinG: "7,5" });
  });
});
