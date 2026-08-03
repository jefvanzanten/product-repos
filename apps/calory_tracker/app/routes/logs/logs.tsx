import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router";
import type { ConsumptionLog, ConsumptionTypeFilter } from "@product-repos/contracts/calorie-tracker";
import { getConsumptionLogs, restoreConsumptionLog } from "../../api/calorie-tracker-api/calorie-tracker-api";
import { invalidateCalorieTrackerDate } from "../../api/calorie-tracker-api/calorie-tracker-cache";
import { calorieTrackerQueryKeys } from "../../api/calorie-tracker-api/calorie-tracker-query-keys";
import { canonicalizeTrackerUrl } from "../../domain/consumption-types";
import {
  addCalendarDays,
  formatLocalDate,
  getTodayInTimezone,
  sortChronologically,
} from "../../domain/dates-and-timezones";
import { Icon } from "../../components/icon/icon";
import { StatusPanel } from "../../components/status-panel/status-panel";
import { useBrowserTimezone } from "../../hooks/use-browser-timezone";
import { newLogPath } from "../../routing/calorie-tracker-routes";
import { LogItem } from "./log-item";
import { deriveLogsViewState, withRestoredLog } from "./logbook-state";
import { readLogbookScroll, writeLogbookScroll } from "./logbook-scroll";
import styles from "./logs.module.css";

type UndoNotice = { readonly id: string; readonly expiresAt: number };
type MutationNotice = {
  readonly id: string;
  readonly message: string;
  readonly scrollToCreatedLog: boolean;
};

const FILTERS: ReadonlyArray<{ readonly value: ConsumptionTypeFilter; readonly label: string }> = [
  { value: "all", label: "Alles" },
  { value: "food", label: "Voeding" },
  { value: "drink", label: "Drinken" },
  { value: "supplement", label: "Supplementen" },
];

/** Return metadata for the date-scoped consumption logbook. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Consumptielogboek | Calorie Tracker" }];
}

/** Render the canonical date/filter logbook and preserve contextual scroll state. */
export default function LogsRoute(): ReactNode {
  const resolvedTimezone = useBrowserTimezone();
  const timezone = resolvedTimezone ?? "UTC";
  const today = getTodayInTimezone(timezone);
  const location = useLocation();
  const [parameters, setParameters] = useSearchParams();
  const canonical = canonicalizeTrackerUrl(parameters.get("date"), parameters.get("type"), today);
  const { date, type } = canonical.state;
  const listRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [undo, setUndo] = useState<UndoNotice | null>(readUndoNotice);
  const mutationNotice = useMemo(() => readMutationNotice(location.state), [location.state]);
  const [liveMessage, setLiveMessage] = useState<string | null>(mutationNotice?.message ?? null);
  const [restoredLog, setRestoredLog] = useState<ConsumptionLog | null>(null);

  useEffect(() => {
    if (mutationNotice !== null) setLiveMessage(mutationNotice.message);
  }, [mutationNotice]);

  useEffect(() => {
    if (resolvedTimezone === null || !canonical.requiresReplace) return;
    setParameters({ date, type }, { replace: true });
  }, [canonical.requiresReplace, date, resolvedTimezone, setParameters, type]);

  const logsQuery = useQuery({
    queryKey: calorieTrackerQueryKeys.logs(date, type, timezone),
    enabled: resolvedTimezone !== null,
    retry: false,
    queryFn: ({ signal }) => getConsumptionLogs(date, type, { timezone, signal }),
  });
  const needsUnfilteredCheck = type !== "all" && logsQuery.data?._tag === "Success" && logsQuery.data.value.items.length === 0;
  const unfilteredQuery = useQuery({
    queryKey: calorieTrackerQueryKeys.logs(date, "all", timezone),
    enabled: resolvedTimezone !== null && needsUnfilteredCheck,
    retry: false,
    queryFn: ({ signal }) => getConsumptionLogs(date, "all", { timezone, signal }),
  });
  const baseViewState = resolvedTimezone === null
    ? { _tag: "Loading" as const }
    : deriveLogsViewState(logsQuery.data, type, unfilteredQuery.data);
  const viewState = withRestoredLog(baseViewState, restoredLog, date, type);
  const sortedItems = useMemo(
    () => viewState._tag === "Ready" ? sortChronologically(viewState.items) : [],
    [viewState],
  );
  const scrollKey = `calorie-tracker-scroll:${date}:${type}`;

  useEffect(() => {
    if (viewState._tag !== "Ready") return;
    const list = listRef.current;
    if (list === null) return;
    const createdLogId = mutationNotice?.scrollToCreatedLog === true ? mutationNotice.id : null;
    const createdItem = [...list.children].find((element) => element instanceof HTMLElement && element.dataset.logId === createdLogId);
    if (createdLogId !== null && createdItem instanceof HTMLElement) {
      createdItem.scrollIntoView({ block: "nearest" });
      writeLogbookScroll(scrollKey, list.scrollTop);
    } else {
      list.scrollTop = readLogbookScroll(scrollKey) ?? list.scrollHeight;
    }
    /** Persist list scroll for this canonical date/filter context. */
    function saveScroll(): void {
      writeLogbookScroll(scrollKey, list?.scrollTop ?? 0);
    }
    list.addEventListener("scroll", saveScroll, { passive: true });
    return () => list.removeEventListener("scroll", saveScroll);
  }, [mutationNotice, scrollKey, viewState._tag]);

  useEffect(() => {
    if (undo === null) return;
    const remaining = Math.max(0, undo.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      clearUndoNotice();
      setUndo(null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [undo]);

  /** Restore the current undo item through the parsed API seam. */
  async function handleUndo(): Promise<void> {
    if (undo === null) return;
    const outcome = await restoreConsumptionLog(undo.id, { timezone });
    if (outcome._tag === "Failure") {
      setLiveMessage("Herstellen lukt niet meer.");
      clearUndoNotice();
      setUndo(null);
      return;
    }
    clearUndoNotice();
    setUndo(null);
    setLiveMessage("Log hersteld.");
    setRestoredLog(outcome.value);
    await Promise.all([
      invalidateCalorieTrackerDate(queryClient, outcome.value.localDate),
      queryClient.invalidateQueries({ queryKey: calorieTrackerQueryKeys.log(outcome.value.id) }),
    ]);
  }

  /** Replace only the selected date while preserving the active filter. */
  function selectDate(nextDate: string): void {
    setParameters({ date: nextDate, type });
  }

  const routeState = { date, type };
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.controls}>
          <button type="button" className="ct-secondary" onClick={() => selectDate(today)}>Vandaag</button>
          <button type="button" className={styles.dayButton} aria-label="Vorige dag" onClick={() => selectDate(addCalendarDays(date, -1))}><Icon name="back" /></button>
          <button type="button" className={styles.dayButton} aria-label="Volgende dag" disabled={date >= today} onClick={() => selectDate(addCalendarDays(date, 1))}><Icon name="chevron-right" /></button>
          <Link className={`${styles.desktopAdd} ct-primary`} to={newLogPath(routeState)}><Icon name="add" />Log toevoegen</Link>
        </div>
        <div className={styles.filterGroup} role="group" aria-label="Consumptietypefilter">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={type === filter.value}
              onClick={() => setParameters({ date, type: filter.value })}
            >{filter.label}</button>
          ))}
        </div>
        <div className={styles.list} ref={listRef}>
          {viewState._tag === "Loading" && <StatusPanel title="Logboek laden" message="Je consumpties worden opgehaald…" />}
          {viewState._tag === "LoadFailed" && <StatusPanel title="Logboek laden lukt niet" message="Controleer je verbinding en probeer opnieuw." action={<button type="button" className="ct-secondary" onClick={() => void logsQuery.refetch()}>Opnieuw proberen</button>} />}
          {viewState._tag === "EmptyDate" && <StatusPanel title="Nog geen consumpties" message={`Er zijn geen logs op ${formatLocalDate(date, "compact")}.`} />}
          {viewState._tag === "EmptyFilter" && <StatusPanel title="Geen resultaten binnen dit filter" message="Kies een ander type of toon alle consumpties." action={<button type="button" className="ct-secondary" onClick={() => setParameters({ date, type: "all" })}>Alles tonen</button>} />}
          {viewState._tag === "Ready" && sortedItems.map((item) => <LogItem key={item.id} item={item} routeState={routeState} />)}
        </div>
        <div className={styles.stickyAction}>
          <Link className="ct-primary" to={newLogPath(routeState)}><Icon name="add" />Log toevoegen</Link>
        </div>
      </section>
      {(undo !== null || liveMessage !== null) && (
        <div className="ct-live" role="status" aria-live="polite">
          <span>{undo === null ? liveMessage : "Log verwijderd."}</span>
          {undo !== null && <button type="button" onClick={() => void handleUndo()}>Ongedaan maken</button>}
          {undo === null && <button type="button" aria-label="Melding sluiten" onClick={() => setLiveMessage(null)}>Sluiten</button>}
        </div>
      )}
    </main>
  );
}

/** Read an unexpired delete notice from session storage. */
function readUndoNotice(): UndoNotice | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem("calorie-tracker-undo");
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || !("id" in value) || !("expiresAt" in value)) return null;
    const id = Reflect.get(value, "id");
    const expiresAt = Reflect.get(value, "expiresAt");
    return typeof id === "string" && typeof expiresAt === "number" && expiresAt > Date.now() ? { id, expiresAt } : null;
  } catch {
    return null;
  }
}

/** Remove the ephemeral five-second undo capability. */
function clearUndoNotice(): void {
  window.sessionStorage.removeItem("calorie-tracker-undo");
}

/** Parse mutation feedback intentionally carried in React Router navigation state. */
function readMutationNotice(input: unknown): MutationNotice | null {
  if (!isUnknownRecord(input)) return null;
  const notice = input.calorieTrackerMutation;
  if (!isUnknownRecord(notice)) return null;
  const { id, message, scrollToCreatedLog } = notice;
  return typeof id === "string" && typeof message === "string" && typeof scrollToCreatedLog === "boolean"
    ? { id, message, scrollToCreatedLog }
    : null;
}

/** Narrow an untrusted navigation-state value to unknown named properties. */
function isUnknownRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}
