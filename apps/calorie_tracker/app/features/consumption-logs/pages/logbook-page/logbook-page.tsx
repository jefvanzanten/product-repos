import type { ConsumptionTypeFilter } from "@product-repos/contracts/calorie-tracker";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useFetcher, useLocation, useRevalidator, useSearchParams } from "react-router";
import { Icon } from "../../../../components/icon/icon";
import { StatusPanel } from "../../../../components/status-panel/status-panel";
import { formatLocalDate } from "../../../../domain/dates-and-timezones";
import { newLogPath } from "../../../../routing/calorie-tracker-routes";
import { LogItem } from "../../components/logbook/log-item";
import type { LogbookActionResult, LogbookLoaderData } from "../../types/logbook.types";
import { readLogbookScroll, writeLogbookScroll } from "../../utils/logbook-scroll";
import styles from "./logbook-page.module.css";

type UndoNotice = { readonly id: string; readonly expiresAt: number };
type MutationNotice = { readonly id: string; readonly message: string; readonly scrollToCreatedLog: boolean };

const FILTERS: ReadonlyArray<{ readonly value: ConsumptionTypeFilter; readonly label: string }> = [
  { value: "all", label: "Alles" },
  { value: "food", label: "Voeding" },
  { value: "drink", label: "Drinken" },
  { value: "supplement", label: "Supplementen" },
];

/**
 * Render the canonical logbook from route loader data and route-bound mutations.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function LogbookPage({ loaderData }: { readonly loaderData: LogbookLoaderData }): ReactNode {
  const location = useLocation();
  const [, setParameters] = useSearchParams();
  const revalidator = useRevalidator();
  const restoreFetcher = useFetcher<LogbookActionResult>();
  const listRef = useRef<HTMLDivElement>(null);
  const [undo, setUndo] = useState<UndoNotice | null>(readUndoNotice);
  const [dismissedMessageLocationKey, setDismissedMessageLocationKey] = useState<string | null>(null);
  const mutationNotice = useMemo(() => readMutationNotice(location.state), [location.state]);
  const { routeState, content, loadFailed } = loaderData;
  const actionMessage = restoreFetcher.data === undefined
    ? null
    : restoreFetcher.data.ok
      ? "Log hersteld."
      : restoreFetcher.data.error;
  const liveMessage = dismissedMessageLocationKey === location.key
    ? null
    : actionMessage ?? mutationNotice?.message ?? null;

  useEffect(() => {
    if (content?._tag !== "Ready" || routeState === null) return;
    const list = listRef.current;
    if (list === null) return;
    const scrollKey = `calorie-tracker-scroll:${routeState.date}:${routeState.type}`;
    const createdLogId = mutationNotice?.scrollToCreatedLog === true ? mutationNotice.id : null;
    const createdItem = [...list.children].find((element) => element instanceof HTMLElement && element.dataset.logId === createdLogId);
    if (createdLogId !== null && createdItem instanceof HTMLElement) {
      createdItem.scrollIntoView({ block: "nearest" });
      writeLogbookScroll(scrollKey, list.scrollTop);
    } else {
      list.scrollTop = readLogbookScroll(scrollKey) ?? list.scrollHeight;
    }
    /**
 * Persist list scroll for this canonical date/filter context.
 *
 * @returns Nothing.
 */
    function saveScroll(): void {
      writeLogbookScroll(scrollKey, list?.scrollTop ?? 0);
    }
    list.addEventListener("scroll", saveScroll, { passive: true });
    return () => list.removeEventListener("scroll", saveScroll);
  }, [content, mutationNotice, routeState]);

  useEffect(() => {
    if (undo === null) return;
    const remaining = Math.max(0, undo.expiresAt - Date.now());
    const timer = window.setTimeout(() => {
      clearUndoNotice();
      setUndo(null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [undo]);

  /**
 * Submit the current session-scoped restore capability to the route action.
 *
 * @returns Nothing.
 */
  function handleUndo(): void {
    if (undo === null) return;
    clearUndoNotice();
    setUndo(null);
    void restoreFetcher.submit({ _action: "restore", logId: undo.id }, { method: "post" });
  }

  if (routeState === null) {
    return <main className={styles.page}><section className={styles.panel}><StatusPanel title="Logboek laden" message="Je browsertijdzone wordt ingesteld…" /></section></main>;
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <Link className={`${styles.desktopAdd} ct-primary`} to={newLogPath(routeState)}><Icon name="add" />Log toevoegen</Link>
        <div className={styles.filterGroup} role="group" aria-label="Consumptietypefilter">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={routeState.type === filter.value}
              onClick={() => setParameters({ date: routeState.date, type: filter.value })}
            >{filter.label}</button>
          ))}
        </div>
        <div className={styles.list} ref={listRef}>
          {!loadFailed && content === null && <StatusPanel title="Logboek laden" message="Je consumpties worden opgehaald…" />}
          {loadFailed && <StatusPanel title="Logboek laden lukt niet" message="Controleer je verbinding en probeer opnieuw." action={<button type="button" className="ct-secondary" onClick={() => void revalidator.revalidate()}>Opnieuw proberen</button>} />}
          {content?._tag === "EmptyDate" && <StatusPanel title="Nog geen consumpties" message={`Er zijn geen logs op ${formatLocalDate(routeState.date, "compact")}.`} />}
          {content?._tag === "EmptyFilter" && <StatusPanel title="Geen resultaten binnen dit filter" message="Kies een ander type of toon alle consumpties." action={<button type="button" className="ct-secondary" onClick={() => setParameters({ date: routeState.date, type: "all" })}>Alles tonen</button>} />}
          {content?._tag === "Ready" && content.items.map((item) => <LogItem key={item.id} item={item} routeState={routeState} />)}
        </div>
        <div className={styles.stickyAction}>
          <Link className="ct-primary" to={newLogPath(routeState)}><Icon name="add" />Log toevoegen</Link>
        </div>
      </section>
      {(undo !== null || liveMessage !== null) && (
        <div className="ct-live" role="status" aria-live="polite">
          <span>{undo === null ? liveMessage : "Log verwijderd."}</span>
          {undo !== null && <button type="button" onClick={handleUndo}>Ongedaan maken</button>}
          {undo === null && <button type="button" aria-label="Melding sluiten" onClick={() => setDismissedMessageLocationKey(location.key)}>Sluiten</button>}
        </div>
      )}
    </main>
  );
}

/**
 * Read an unexpired delete notice from session storage.
 *
 * @returns The function result.
 */
function readUndoNotice(): UndoNotice | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem("calorie-tracker-undo");
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isUnknownRecord(value)) return null;
    const { id, expiresAt } = value;
    return typeof id === "string" && typeof expiresAt === "number" && expiresAt > Date.now() ? { id, expiresAt } : null;
  } catch {
    return null;
  }
}

/**
 * Remove the ephemeral five-second undo capability.
 *
 * @returns Nothing.
 */
function clearUndoNotice(): void {
  window.sessionStorage.removeItem("calorie-tracker-undo");
}

/**
 * Parse mutation feedback intentionally carried in React Router navigation state.
 *
 * @param input - The input value.
 * @returns The function result.
 */
function readMutationNotice(input: unknown): MutationNotice | null {
  if (!isUnknownRecord(input) || !isUnknownRecord(input.calorieTrackerMutation)) return null;
  const { id, message, scrollToCreatedLog } = input.calorieTrackerMutation;
  return typeof id === "string" && typeof message === "string" && typeof scrollToCreatedLog === "boolean"
    ? { id, message, scrollToCreatedLog }
    : null;
}

/**
 * Narrow an untrusted value to unknown named properties.
 *
 * @param input - The input value.
 * @returns The function result.
 */
function isUnknownRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}
