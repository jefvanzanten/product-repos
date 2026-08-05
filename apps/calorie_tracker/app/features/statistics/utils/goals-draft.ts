import type { NutritionGoal, UpsertNutritionGoal } from "@product-repos/contracts/calorie-tracker";
import { parsePositiveDecimal } from "../../../domain/quantities";
import { STATISTICS, type StatisticDefinition } from "../components/statistic-card";

/** Editable goal toggles and retained input values. */
export type GoalDraft = {
  readonly enabled: Record<StatisticDefinition["key"], boolean>;
  readonly values: Record<StatisticDefinition["key"], string>;
};

/** Result of parsing an editable goal draft. */
export type GoalDraftParseResult =
  | { readonly _tag: "Success"; readonly value: UpsertNutritionGoal }
  | { readonly _tag: "Failure"; readonly error: string };

/**
 * Create an editable goals concept while retaining values from the last successful save.
 *
 * @param goals - The goals value.
 * @param lastSavedDraft - The lastSavedDraft value.
 * @returns The function result.
 */
export function createGoalDraft(goals: NutritionGoal | null, lastSavedDraft: GoalDraft | null): GoalDraft {
  return {
    enabled: {
      caloriesKcal: goals?.caloriesKcal != null,
      proteinG: goals?.proteinG != null,
      carbohydratesG: goals?.carbohydratesG != null,
      fatG: goals?.fatG != null,
    },
    values: {
      caloriesKcal: goals?.caloriesKcal == null ? lastSavedDraft?.values.caloriesKcal ?? "" : String(goals.caloriesKcal),
      proteinG: goals?.proteinG ?? lastSavedDraft?.values.proteinG ?? "",
      carbohydratesG: goals?.carbohydratesG ?? lastSavedDraft?.values.carbohydratesG ?? "",
      fatG: goals?.fatG ?? lastSavedDraft?.values.fatG ?? "",
    },
  };
}

/**
 * Parse goal toggles and values into the shared full-replacement contract.
 *
 * @param draft - The draft value.
 * @returns The function result.
 */
export function parseGoalDraft(draft: GoalDraft): GoalDraftParseResult {
  const parsedValues: Record<StatisticDefinition["key"], string | null> = {
    caloriesKcal: null,
    proteinG: null,
    carbohydratesG: null,
    fatG: null,
  };
  for (const definition of STATISTICS) {
    if (!draft.enabled[definition.key]) continue;
    const parsed = parsePositiveDecimal(draft.values[definition.key]);
    if (parsed._tag === "Failure") {
      return { _tag: "Failure", error: `Vul een positief doel in voor ${definition.label.toLowerCase()}.` };
    }
    if (definition.key === "caloriesKcal" && !/^\d+$/.test(parsed.value.canonical)) {
      return { _tag: "Failure", error: "Calorieën moeten een positief geheel getal zijn." };
    }
    if (definition.key !== "caloriesKcal" && !/^\d+(?:\.\d)?$/.test(parsed.value.canonical)) {
      return { _tag: "Failure", error: `${definition.label} mag maximaal één decimaal hebben.` };
    }
    parsedValues[definition.key] = parsed.value.canonical;
  }
  return {
    _tag: "Success",
    value: {
      caloriesKcal: parsedValues.caloriesKcal === null ? null : Number(parsedValues.caloriesKcal),
      proteinG: parsedValues.proteinG,
      carbohydratesG: parsedValues.carbohydratesG,
      fatG: parsedValues.fatG,
    },
  };
}
