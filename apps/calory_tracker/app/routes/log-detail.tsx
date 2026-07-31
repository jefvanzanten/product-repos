import { useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import type { ConsumptionLog } from "@product-repos/contracts/calorie-tracker";
import { deleteConsumptionLog, getConsumptionLog } from "../calorie-tracker-api";
import { canonicalizeTrackerUrl, formatDecimal, formatLocalDate, getBrowserTimezone, getTodayInTimezone } from "../calorie-tracker-domain";
import { ConsumptionTypeBadge, Icon, ProductImage, StatusPanel } from "../calorie-tracker-components";
import styles from "./log-detail.module.css";

/** Return metadata for the refreshable consumption-log detail route. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Logdetail | Calorie Tracker" }];
}

/** Render current catalog-derived detail and delete capability for one private log. */
export default function LogDetailRoute(): ReactNode {
  const routeParameters = useParams();
  const logId = routeParameters.logId ?? "";
  const timezone = getBrowserTimezone();
  const today = getTodayInTimezone(timezone);
  const [parameters, setParameters] = useSearchParams();
  const canonical = canonicalizeTrackerUrl(parameters.get("date"), parameters.get("type"), today);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!canonical.requiresReplace) return;
    setParameters(canonical.state, { replace: true });
  }, [canonical, setParameters]);

  const detailQuery = useQuery({
    queryKey: ["calorie-tracker", "log", logId],
    queryFn: ({ signal }) => getConsumptionLog(logId, { timezone, signal }),
  });
  const contextSearch = `?${new URLSearchParams(canonical.state)}`;
  const outcome = detailQuery.data;

  /** Delete immediately and expose a session-scoped five-second restore capability. */
  async function handleDelete(): Promise<void> {
    const result = await deleteConsumptionLog(logId, { timezone, signal: new AbortController().signal });
    if (result._tag === "Failure") return;
    const backendExpiry = new Date(result.value.restoreUntil).getTime();
    const expiresAt = Math.min(Date.now() + 5_000, backendExpiry);
    window.sessionStorage.setItem("calorie-tracker-undo", JSON.stringify({ id: logId, expiresAt }));
    await queryClient.invalidateQueries({ queryKey: ["calorie-tracker"] });
    navigate(`/logs${contextSearch}`);
  }

  if (outcome === undefined) {
    return <DetailFrame backHref={`/logs${contextSearch}`}><StatusPanel title="Log laden" message="De loggegevens worden opgehaald…" /></DetailFrame>;
  }
  if (outcome._tag === "Failure") {
    const notFound = outcome.error._tag === "HttpFailure" && outcome.error.status === 404;
    return <DetailFrame backHref={`/logs${contextSearch}`}><StatusPanel title={notFound ? "Log niet gevonden" : "Log laden lukt niet"} message={notFound ? "Deze log is niet beschikbaar." : "Controleer je verbinding en probeer opnieuw."} action={!notFound && <button type="button" className="ct-secondary" onClick={() => void detailQuery.refetch()}>Opnieuw proberen</button>} /></DetailFrame>;
  }

  return <DetailContent log={outcome.value} contextSearch={contextSearch} onDelete={() => void handleDelete()} />;
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
function DetailContent({ log, contextSearch, onDelete }: { readonly log: ConsumptionLog; readonly contextSearch: string; readonly onDelete: () => void }): ReactNode {
  const brand = log.package.brand?.name;
  const archived = log.package.productArchived || log.package.packageArchived;
  const time = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: log.timezone }).format(new Date(log.consumedAt));
  const original = formatOriginalQuantity(log);
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link to={`/logs${contextSearch}`} aria-label="Terug naar logboek"><Icon name="back" size={24} /></Link>
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
        <div className={styles.actions}>
          <Link className="ct-secondary" to={`/logs/${log.id}/bewerken${contextSearch}`}><Icon name="edit" />Bewerken</Link>
          <button type="button" className="ct-danger" onClick={onDelete}><Icon name="delete" />Verwijderen</button>
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
  if (log.inputMode === "INDIVIDUAL_UNIT") return `${quantity} ${log.package.individualPackageType?.name.toLowerCase() ?? "eenheid"}`;
  return `${quantity} ${log.package.packageType.name.toLowerCase()}`;
}
