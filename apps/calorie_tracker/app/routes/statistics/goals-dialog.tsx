import type { NutritionGoal, UpsertNutritionGoal } from "@product-repos/contracts/calorie-tracker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, type ReactNode } from "react";
import { putNutritionGoals } from "../../api/calorie-tracker-api/calorie-tracker-api";
import { calorieTrackerQueryKeys } from "../../api/calorie-tracker-api/calorie-tracker-query-keys";
import { FocusDialog } from "../../components/focus-dialog/focus-dialog";
import { Icon } from "../../components/icon/icon";
import { createGoalDraft, parseGoalDraft, type GoalDraft } from "./goals-draft";
import { STATISTICS } from "./statistic-card";
import styles from "./statistics.module.css";

/** Render and persist the accessible optional-goals modal. */
export function GoalsDialog({
  goals,
  lastSavedDraft,
  date,
  timezone,
  onSaved,
  onClose,
}: {
  readonly goals: NutritionGoal | null;
  readonly lastSavedDraft: GoalDraft | null;
  readonly date: string;
  readonly timezone: string;
  readonly onSaved: (draft: GoalDraft) => void;
  readonly onClose: () => void;
}): ReactNode {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<GoalDraft>(() => createGoalDraft(goals, lastSavedDraft));
  const [error, setError] = useState<string | null>(null);
  const closeDialog = useCallback(() => onClose(), [onClose]);
  const mutation = useMutation({
    mutationFn: (input: UpsertNutritionGoal) => putNutritionGoals(input, { timezone }),
  });

  /** Parse and save enabled draft values while preserving failures in the dialog. */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsed = parseGoalDraft(draft);
    if (parsed._tag === "Failure") {
      setError(parsed.error);
      return;
    }
    const outcome = await mutation.mutateAsync(parsed.value);
    if (outcome._tag === "Failure") {
      setError(outcome.error._tag === "HttpFailure" ? outcome.error.response.message : "Doelen opslaan lukt niet. Probeer opnieuw.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: calorieTrackerQueryKeys.statistics(date, timezone) });
    onSaved(draft);
    onClose();
  }

  return (
    <FocusDialog title="Persoonlijke dagdoelen" onClose={closeDialog}>
      <form className={styles.goalsForm} onSubmit={(event) => void handleSubmit(event)}>
        <header><h2>Persoonlijke dagdoelen</h2><p>Schakel doelen afzonderlijk in of uit.</p></header>
        {STATISTICS.map((definition) => (
          <label className={styles.goalRow} key={definition.key}>
            <span className={styles.switchLabel}>
              <input
                type="checkbox"
                checked={draft.enabled[definition.key]}
                onChange={(event) => setDraft({ ...draft, enabled: { ...draft.enabled, [definition.key]: event.currentTarget.checked } })}
              />
              <span>{definition.label}</span>
            </span>
            <span className={styles.goalInput}>
              <input
                inputMode="decimal"
                required={draft.enabled[definition.key]}
                disabled={!draft.enabled[definition.key]}
                value={draft.values[definition.key]}
                aria-label={`${definition.label} doel`}
                onChange={(event) => setDraft({ ...draft, values: { ...draft.values, [definition.key]: event.currentTarget.value } })}
              />
              <b>{definition.unit}</b>
            </span>
          </label>
        ))}
        {error !== null && <p className={styles.formError} role="alert">{error}</p>}
        <footer>
          <button type="button" className="ct-secondary" onClick={onClose}>Annuleren</button>
          <button type="submit" className="ct-primary" disabled={mutation.isPending}>
            <Icon name="add" />{mutation.isPending ? "Opslaan…" : "Opslaan"}
          </button>
        </footer>
      </form>
    </FocusDialog>
  );
}
