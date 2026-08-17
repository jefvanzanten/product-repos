import type { NutritionGoal } from "../../domain/statistics";
import { useEffect, useState, type ReactNode } from "react";
import { useFetcher } from "react-router";
import { ModalDialog } from "../../../../core/presentation/components/modal-dialog/modal-dialog";
import { Icon } from "../../../../core/presentation/components/icon/icon";
import type { StatisticsActionResult } from "../types/statistics.types";
import { createGoalDraft, parseGoalDraft, type GoalDraft } from "../view-models/goals-draft";
import { STATISTICS } from "../view-models/statistic-definitions";
import styles from "../pages/statistics-page/statistics-page.module.css";

/**
 * Render and persist the accessible optional-goals modal through the route action.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function GoalsDialog({
  goals,
  lastSavedDraft,
  onSaved,
  onClose,
}: {
  readonly goals: NutritionGoal | null;
  readonly lastSavedDraft: GoalDraft | null;
  readonly onSaved: (draft: GoalDraft) => void;
  readonly onClose: () => void;
}): ReactNode {
  const fetcher = useFetcher<StatisticsActionResult>();
  const [draft, setDraft] = useState<GoalDraft>(() => createGoalDraft(goals, lastSavedDraft));
  const [validationError, setValidationError] = useState<string | null>(null);
  const parsedDraft = parseGoalDraft(draft);

  useEffect(() => {
    if (fetcher.data?.ok !== true) return;
    onSaved(draft);
    onClose();
  }, [draft, fetcher.data, onClose, onSaved]);

  /**
 * Validate the draft and submit one closed JSON payload to the route action.
 *
 * @param event - The event value.
 * @returns Nothing.
 */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (parsedDraft.tag === "Failure") {
      setValidationError(parsedDraft.error);
      return;
    }
    setValidationError(null);
    void fetcher.submit(
      { goals: JSON.stringify(parsedDraft.value) },
      { method: "post" },
    );
  }

  const error = validationError ?? (fetcher.data?.ok === false ? fetcher.data.error : null);
  return (
    <ModalDialog title="Persoonlijke dagdoelen" onClose={onClose}>
      <form className={styles.goalsForm} onSubmit={handleSubmit}>
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
          <button type="submit" className="ct-primary" disabled={fetcher.state !== "idle"}>
            <Icon name="add" />{fetcher.state !== "idle" ? "Opslaan…" : "Opslaan"}
          </button>
        </footer>
      </form>
    </ModalDialog>
  );
}
