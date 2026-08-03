import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import type { ConsumptionLog } from "@product-repos/contracts/calorie-tracker";
import { deleteConsumptionLog, getConsumptionLog } from "../../api/calorie-tracker-api/calorie-tracker-api";
import { invalidateCalorieTrackerDate } from "../../api/calorie-tracker-api/calorie-tracker-cache";
import { calorieTrackerQueryKeys } from "../../api/calorie-tracker-api/calorie-tracker-query-keys";
import { canonicalizeTrackerUrl } from "../../domain/consumption-types";
import { formatLocalDate, getTodayInTimezone } from "../../domain/dates-and-timezones";
import { formatDecimal } from "../../domain/quantities";
import { ConsumptionTypeBadge } from "../../components/consumption-type-badge/consumption-type-badge";
import { Icon } from "../../components/icon/icon";
import { ProductImage } from "../../components/product-image/product-image";
import { StatusPanel } from "../../components/status-panel/status-panel";
import { useBrowserTimezone } from "../../hooks/use-browser-timezone";
import {
  editLogPath,
  logbookPath,
  type CalorieTrackerRouteHandle,
} from "../../routing/calorie-tracker-routes";
import styles from "./log-detail.module.css";

/** Route metadata presents detail independently while retaining its parent route context. */
export const handle: CalorieTrackerRouteHandle = {
  showsTrackerNavbar: false,
  logPresentation: "detail",
};

/** Return metadata for the refreshable consumption-log detail route. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Logdetail | Calorie Tracker" }];
}

/** Render current catalog-derived detail and delete capability for one private log. */
export default function LogDetailRoute(): ReactNode {
  const routeParameters = useParams();
  const logId = routeParameters.logId ?? "";
  const resolvedTimezone = useBrowserTimezone();
  const timezone = resolvedTimezone ?? "UTC";
  const today = getTodayInTimezone(timezone);
  const [parameters, setParameters] = useSearchParams();
  const canonical = canonicalizeTrackerUrl(parameters.get("date"), parameters.get("type"), today);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (resolvedTimezone === null || !canonical.requiresReplace) return;
    setParameters(canonical.state, { replace: true });
  }, [canonical, resolvedTimezone, setParameters]);

  const detailQuery = useQuery({
    queryKey: calorieTrackerQueryKeys.log(logId),
    enabled: resolvedTimezone !== null,
    retry: false,
    queryFn: ({ signal }) => getConsumptionLog(logId, { timezone, signal }),
  });
  const logbookHref = logbookPath(canonical.state);
  const outcome = detailQuery.data;

  /** Delete immediately and expose a session-scoped five-second restore capability. */
  async function handleDelete(): Promise<void> {
    setDeleteError(null);
    setDeleting(true);
    const result = await deleteConsumptionLog(logId, { timezone });
    if (result._tag === "Failure") {
      setDeleting(false);
      setDeleteError(result.error._tag === "HttpFailure" ? result.error.response.message : "Verwijderen lukt niet. Probeer opnieuw.");
      return;
    }
    const backendExpiry = new Date(result.value.restoreUntil).getTime();
    const expiresAt = Math.min(Date.now() + 5_000, backendExpiry);
    window.sessionStorage.setItem("calorie-tracker-undo", JSON.stringify({ id: logId, expiresAt }));
    if (outcome?._tag === "Success") {
      await invalidateCalorieTrackerDate(queryClient, outcome.value.localDate);
    }
    queryClient.removeQueries({ queryKey: calorieTrackerQueryKeys.log(logId) });
    void navigate(logbookHref);
  }

  if (outcome === undefined) {
    return <DetailFrame backHref={logbookHref}><StatusPanel title="Log laden" message="De loggegevens worden opgehaald…" /></DetailFrame>;
  }
  if (outcome._tag === "Failure") {
    const notFound = outcome.error._tag === "HttpFailure" && outcome.error.status === 404;
    return <DetailFrame backHref={logbookHref}><StatusPanel title={notFound ? "Log niet gevonden" : "Log laden lukt niet"} message={notFound ? "Deze log is niet beschikbaar." : "Controleer je verbinding en probeer opnieuw."} action={!notFound && <button type="button" className="ct-secondary" onClick={() => void detailQuery.refetch()}>Opnieuw proberen</button>} /></DetailFrame>;
  }

  return <DetailContent log={outcome.value} routeState={canonical.state} deleteError={deleteError} deleting={deleting} onDelete={() => void handleDelete()} />;
}

/** Render the detail top bar around loading and failure states. */
function DetailFrame({ backHref, children }: { readonly backHref: string; readonly children: ReactNode }): ReactNode {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}><Link to={backHref} aria-label="Terug naar logboek"><Icon name="back" size={24} /></Link><h1>Logdetail</h1></header>
      <section className={styles.sheet}>{children}</section>
    </main>
  );
}

/** Render all current catalog and nutrition fields for a parsed log. */
function DetailContent({ log, routeState, deleteError, deleting, onDelete }: { readonly log: ConsumptionLog; readonly routeState: { readonly date: string; readonly type: "all" | "food" | "drink" | "supplement" }; readonly deleteError: string | null; readonly deleting: boolean; readonly onDelete: () => void }): ReactNode {
  const brand = log.package.brand?.name;
  const archived = log.package.productArchived || log.package.packageArchived;
  const time = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: log.timezone }).format(new Date(log.consumedAt));
  const original = formatOriginalQuantity(log);
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link to={logbookPath(routeState)} aria-label="Terug naar logboek"><Icon name="back" size={24} /></Link>
        <div><h1>Logdetail</h1><p>{time} · {formatLocalDate(log.localDate)}</p></div>
      </header>
      <section className={styles.sheet}>
        <article className={styles.productSummary}>
          <ProductImage type={log.package.consumptionType} imageUrl={log.package.imageUrl} size="large" />
          <div><h2>{log.package.productName}</h2>{brand !== undefined && <p>{brand}</p>}<strong>{log.package.summary}</strong><ConsumptionTypeBadge type={log.package.consumptionType} />{archived && <em>Gearchiveerd</em>}</div>
        </article>
        <h2 className={styles.sectionTitle}>Consumptie</h2>
        <dl className={styles.details}>
          <div><dt>Oorspronkelijk</dt><dd>{original}</dd></div>
          <div><dt>Voor berekening</dt><dd>{log.derivedQuantityLabel}</dd></div>
          <div><dt>Datum</dt><dd>{formatLocalDate(log.localDate, "compact")}</dd></div>
          <div><dt>Tijd</dt><dd>{time}</dd></div>
        </dl>
        <h2 className={styles.sectionTitle}>Actuele voedingswaarden</h2>
        <dl className={styles.macros}>
          <MacroValue label="Calorieën" value={log.macroValues?.caloriesKcal ?? null} unit="kcal" fractions={0} />
          <MacroValue label="Eiwit" value={log.macroValues?.proteinG ?? null} unit="g" fractions={1} />
          <MacroValue label="Koolhydraten" value={log.macroValues?.carbohydratesG ?? null} unit="g" fractions={1} />
          <MacroValue label="Vet" value={log.macroValues?.fatG ?? null} unit="g" fractions={1} />
        </dl>
        {deleteError !== null && <p role="alert">{deleteError}</p>}
        <div className={styles.actions}>
          <Link className="ct-secondary" to={editLogPath(log.id, routeState)}><Icon name="edit" />Bewerken</Link>
          <button type="button" className="ct-danger" onClick={onDelete} disabled={deleting}><Icon name="delete" />{deleting ? "Verwijderen…" : "Verwijderen"}</button>
        </div>
      </section>
    </main>
  );
}

/** Render a known zero separately from an unknown nutrition value. */
function MacroValue({ label, value, unit, fractions }: { readonly label: string; readonly value: string | null; readonly unit: string; readonly fractions: number }): ReactNode {
  return <div><dt>{label}</dt><dd>{value === null ? "Onbekend" : `${formatDecimal(value, fractions)} ${unit}`}</dd></div>;
}

/** Format the original quantity and selected input unit. */
function formatOriginalQuantity(log: ConsumptionLog): string {
  const quantity = log.quantity.replace(".", ",");
  if (log.inputMode === "CONTENT_UNIT") return `${quantity} ${log.inputUnitType?.symbol ?? ""}`.trim();
  if (log.inputMode === "INDIVIDUAL_UNIT") return `${quantity} ${log.package.portion?.name.toLowerCase() ?? "eenheid"}`;
  return `${quantity} ${log.package.packageType.name.toLowerCase()}`;
}
