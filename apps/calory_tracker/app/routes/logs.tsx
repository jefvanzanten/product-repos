import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import type { ConsumptionLog, ConsumptionTypeFilter } from "@product-repos/contracts/calorie-tracker";
import { getConsumptionLogs, restoreConsumptionLog } from "../calorie-tracker-api";
import {
  addCalendarDays,
  canonicalizeTrackerUrl,
  formatLocalDate,
  getBrowserTimezone,
  getTodayInTimezone,
  sortChronologically,
} from "../calorie-tracker-domain";
import { ConsumptionTypeBadge, DateControl, Icon, ProductImage, StatusPanel } from "../calorie-tracker-components";
import styles from "./logs.module.css";

type LogsViewState =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "LoadFailed" }
  | { readonly _tag: "EmptyDate" }
  | { readonly _tag: "EmptyFilter" }
  | { readonly _tag: "Ready"; readonly items: ReadonlyArray<ConsumptionLog> };

type UndoNotice = { readonly id: string; readonly expiresAt: number };

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
  const timezone = getBrowserTimezone();
  const today = getTodayInTimezone(timezone);
  const [parameters, setParameters] = useSearchParams();
  const canonical = canonicalizeTrackerUrl(parameters.get("date"), parameters.get("type"), today);
  const { date, type } = canonical.state;
  const listRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [undo, setUndo] = useState<UndoNotice | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  useEffect(() => {
    setUndo(readUndoNotice());
    setLiveMessage(readSuccessMessage());
  }, []);

  useEffect(() => {
    if (!canonical.requiresReplace) return;
    setParameters({ date, type }, { replace: true });
  }, [canonical.requiresReplace, date, setParameters, type]);

  const logsQuery = useQuery({
    queryKey: ["calorie-tracker", "logs", date, type, timezone],
    queryFn: ({ signal }) => getConsumptionLogs(date, type, { timezone, signal }),
  });
  const viewState = deriveLogsViewState(logsQuery.data, type);
  const sortedItems = useMemo(
    () => viewState._tag === "Ready" ? sortChronologically(viewState.items) : [],
    [viewState],
  );
  const scrollKey = `calorie-tracker-scroll:${date}:${type}`;

  useEffect(() => {
    if (viewState._tag !== "Ready") return;
    const list = listRef.current;
    if (list === null) return;
    const stored = window.sessionStorage.getItem(scrollKey);
    list.scrollTop = stored === null ? list.scrollHeight : Number(stored);
    /** Persist list scroll for this canonical date/filter context. */
    function saveScroll(): void {
      window.sessionStorage.setItem(scrollKey, String(list?.scrollTop ?? 0));
    }
    list.addEventListener("scroll", saveScroll, { passive: true });
    return () => list.removeEventListener("scroll", saveScroll);
  }, [scrollKey, viewState._tag]);

  useEffect(() => {
    if (undo === null) return;
    const remaining = undo.expiresAt - Date.now();
    if (remaining <= 0) {
      clearUndoNotice();
      setUndo(null);
      return;
    }
    const timer = window.setTimeout(() => {
      clearUndoNotice();
      setUndo(null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [undo]);

  /** Restore the current undo item through the parsed API seam. */
  async function handleUndo(): Promise<void> {
    if (undo === null) return;
    const outcome = await restoreConsumptionLog(undo.id, { timezone, signal: new AbortController().signal });
    if (outcome._tag === "Failure") {
      setLiveMessage("Herstellen lukt niet meer.");
      clearUndoNotice();
      setUndo(null);
      return;
    }
    clearUndoNotice();
    setUndo(null);
    setLiveMessage("Log hersteld.");
    await queryClient.invalidateQueries({ queryKey: ["calorie-tracker"] });
  }

  /** Replace only the selected date while preserving the active filter. */
  function selectDate(nextDate: string): void {
    setParameters({ date: nextDate, type });
  }

  const contextSearch = `?${new URLSearchParams({ date, type })}`;
  return (
    <main className={styles.page}>
      <div className={styles.mobileDate}>
        <DateControl date={date} today={today} onChange={selectDate} />
      </div>
      <header className={styles.header}>
        <div><h1>Consumpties</h1><p>Bekijk en beheer je consumpties per dag.</p></div>
        <Link className="ct-primary" to={`/logs/nieuw${contextSearch}`}><Icon name="add" />Log toevoegen</Link>
      </header>
      <section className={styles.panel}>
        <div className={styles.controls}>
          <div className={styles.desktopDate}>
            <span>Datum</span>
            <DateControl date={date} today={today} onChange={selectDate} />
          </div>
          <button type="button" className="ct-secondary" onClick={() => selectDate(today)}>Vandaag</button>
          <button type="button" className={styles.dayButton} aria-label="Vorige dag" onClick={() => selectDate(addCalendarDays(date, -1))}><Icon name="back" /></button>
          <button type="button" className={styles.dayButton} aria-label="Volgende dag" disabled={date >= today} onClick={() => selectDate(addCalendarDays(date, 1))}><Icon name="chevron-right" /></button>
        </div>
        <div className={styles.filterGroup} aria-label="Consumptietypefilter">
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
          {viewState._tag === "Ready" && sortedItems.map((item) => <LogItem key={item.id} item={item} contextSearch={contextSearch} />)}
        </div>
        <div className={styles.stickyAction}>
          <Link className="ct-primary" to={`/logs/nieuw${contextSearch}`}><Icon name="add" />Log toevoegen</Link>
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

/** Derive all explicit logbook loading, failure, and empty states. */
function deriveLogsViewState(
  outcome: Awaited<ReturnType<typeof getConsumptionLogs>> | undefined,
  filter: ConsumptionTypeFilter,
): LogsViewState {
  if (outcome === undefined) return { _tag: "Loading" };
  if (outcome._tag === "Failure") return { _tag: "LoadFailed" };
  if (outcome.value.items.length === 0) return filter === "all" ? { _tag: "EmptyDate" } : { _tag: "EmptyFilter" };
  return { _tag: "Ready", items: outcome.value.items };
}

/** Render one compact log item without calorie or macro totals. */
function LogItem({ item, contextSearch }: { readonly item: ConsumptionLog; readonly contextSearch: string }): ReactNode {
  const brand = item.package.brand === null ? "" : ` · ${item.package.brand.name}`;
  const time = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: item.timezone }).format(new Date(item.consumedAt));
  return (
    <Link className={styles.logItem} to={`/logs/${item.id}${contextSearch}`}>
      <ProductImage type={item.package.consumptionType} imageUrl={item.package.imageUrl} />
      <span className={styles.itemCopy}>
        <time dateTime={item.consumedAt}>{time}</time>
        <strong>{item.package.productName}{brand}</strong>
        <span>{item.package.summary}</span>
        <b>{formatOriginalQuantity(item)}</b>
      </span>
      <span className={styles.itemMeta}>
        <ConsumptionTypeBadge type={item.package.consumptionType} />
        {(item.package.productArchived || item.package.packageArchived) && <em>Gearchiveerd</em>}
      </span>
      <Icon name="chevron-right" />
    </Link>
  );
}

/** Format the original input without replacing it by a derived quantity. */
function formatOriginalQuantity(item: ConsumptionLog): string {
  if (item.inputMode === "CONTENT_UNIT") return `${item.quantity.replace(".", ",")} ${item.inputUnitType?.symbol ?? ""}`.trim();
  if (item.inputMode === "INDIVIDUAL_UNIT") return `${item.quantity.replace(".", ",")} ${item.package.individualPackageType?.name.toLowerCase() ?? "eenheid"}`;
  return `${item.quantity.replace(".", ",")} ${item.package.packageType.name.toLowerCase()}`;
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
  } catch (cause: unknown) {
    return null;
  }
}

/** Remove the ephemeral five-second undo capability. */
function clearUndoNotice(): void {
  window.sessionStorage.removeItem("calorie-tracker-undo");
}

/** Consume the latest route mutation confirmation message. */
function readSuccessMessage(): string | null {
  if (typeof window === "undefined") return null;
  const message = window.sessionStorage.getItem("calorie-tracker-success");
  window.sessionStorage.removeItem("calorie-tracker-success");
  return message;
}
