import type { ConsumptionLog } from "../../../domain/consumption-log";
import { recipeDetailPath } from "@product-repos/shared/recipe-path";
import { useEffect, type ReactNode } from "react";
import { Link, useFetcher, useNavigate, useRevalidator } from "react-router";
import { ConsumptionTypeBadge } from "../../../../../core/presentation/components/consumption-type-badge/consumption-type-badge";
import { Icon } from "../../../../../core/presentation/components/icon/icon";
import { ProductImage } from "../../../../../core/presentation/components/product-image/product-image";
import { StatusPanel } from "../../../../../core/presentation/components/status-panel/status-panel";
import { formatLocalDate } from "../../../../../core/presentation/formatting/dates";
import { formatDecimal } from "../../../../../core/presentation/formatting/numbers";
import {
  editLogPath,
  logbookPath,
} from "../../../../../core/presentation/routing/calorie-tracker-routes";
import type {
  LogDetailActionResult,
  LogDetailLoaderData,
} from "../../types/log-detail.types";
import {
  formatOriginalLogQuantity,
  presentConsumptionLog,
} from "../../log-display";
import styles from "./log-detail-page.module.css";

/**
 * Render current catalog-derived detail and route-bound delete capability.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function LogDetailPage({
  loaderData,
}: {
  readonly loaderData: LogDetailLoaderData;
}): ReactNode {
  const deleteFetcher = useFetcher<LogDetailActionResult>();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { routeState, log, notFound, loadFailed } = loaderData;
  const logbookHref = routeState === null ? "/logs" : logbookPath(routeState);

  useEffect(() => {
    if (deleteFetcher.data?.ok !== true) return;
    const backendExpiry = new Date(
      deleteFetcher.data.result.restoreUntil,
    ).getTime();
    const expiresAt = Math.min(Date.now() + 5_000, backendExpiry);
    window.sessionStorage.setItem(
      "calorie-tracker-undo",
      JSON.stringify({ id: deleteFetcher.data.result.id, expiresAt }),
    );
    void navigate(logbookHref);
  }, [deleteFetcher.data, logbookHref, navigate]);

  if (routeState === null) {
    return (
      <DetailFrame backHref={logbookHref}>
        <StatusPanel
          title="Log laden"
          message="Je browsertijdzone wordt ingesteld…"
        />
      </DetailFrame>
    );
  }
  if (notFound) {
    return (
      <DetailFrame backHref={logbookHref}>
        <StatusPanel
          title="Log niet gevonden"
          message="Deze log is niet beschikbaar."
        />
      </DetailFrame>
    );
  }
  if (loadFailed) {
    return (
      <DetailFrame backHref={logbookHref}>
        <StatusPanel
          title="Log laden lukt niet"
          message="Controleer je verbinding en probeer opnieuw."
          action={
            <button
              type="button"
              className="ct-secondary"
              onClick={() => void revalidator.revalidate()}
            >
              Opnieuw proberen
            </button>
          }
        />
      </DetailFrame>
    );
  }
  if (log === null) {
    return (
      <DetailFrame backHref={logbookHref}>
        <StatusPanel
          title="Log laden"
          message="De loggegevens worden opgehaald…"
        />
      </DetailFrame>
    );
  }

  return (
    <DetailContent
      log={log}
      routeState={routeState}
      deleteError={
        deleteFetcher.data?.ok === false ? deleteFetcher.data.error : null
      }
      deleting={deleteFetcher.state !== "idle"}
      onDelete={() => void deleteFetcher.submit(null, { method: "delete" })}
    />
  );
}

/**
 * Render the detail top bar around loading and failure states.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
function DetailFrame({
  backHref,
  children,
}: {
  readonly backHref: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link to={backHref} aria-label="Terug naar logboek">
          <Icon name="back" size={24} />
        </Link>
        <h1>Logdetail</h1>
      </header>
      <section className={styles.sheet}>{children}</section>
    </main>
  );
}

/**
 * Render all current catalog and nutrition fields for a parsed log.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
function DetailContent({
  log,
  routeState,
  deleteError,
  deleting,
  onDelete,
}: {
  readonly log: ConsumptionLog;
  readonly routeState: {
    readonly date: string;
    readonly type: "all" | "food" | "drink" | "supplement";
  };
  readonly deleteError: string | null;
  readonly deleting: boolean;
  readonly onDelete: () => void;
}): ReactNode {
  const presentation = presentConsumptionLog(log);
  const time = new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: log.timezone,
  }).format(new Date(log.consumedAt));
  const original = formatOriginalLogQuantity(log);
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link to={logbookPath(routeState)} aria-label="Terug naar logboek">
          <Icon name="back" size={24} />
        </Link>
        <div>
          <h1>Logdetail</h1>
          <p>
            {time} · {formatLocalDate(log.localDate)}
          </p>
        </div>
      </header>
      <section className={styles.sheet}>
        <article className={styles.productSummary}>
          <ProductImage
            type={presentation.consumptionType}
            imageUrl={presentation.imageUrl}
            size="large"
          />
          <div>
            <h2>{presentation.title}</h2>
            {presentation.subtitle !== null && <p>{presentation.subtitle}</p>}
            <strong>{presentation.summary}</strong>
            {presentation.consumptionType !== null && (
              <ConsumptionTypeBadge type={presentation.consumptionType} />
            )}
            {presentation.archived && <em>Gearchiveerd</em>}
          </div>
        </article>
        <h2 className={styles.sectionTitle}>Consumptie</h2>
        <dl className={styles.details}>
          <div>
            <dt>Oorspronkelijk</dt>
            <dd>{original}</dd>
          </div>
          <div>
            <dt>Voor berekening</dt>
            <dd>{log.derivedQuantityLabel}</dd>
          </div>
          <div>
            <dt>Datum</dt>
            <dd>{formatLocalDate(log.localDate, "compact")}</dd>
          </div>
          <div>
            <dt>Tijd</dt>
            <dd>{time}</dd>
          </div>
        </dl>
        <h2 className={styles.sectionTitle}>Actuele voedingswaarden</h2>
        <dl className={styles.macros}>
          <MacroValue
            label="Calorieën"
            value={log.macroValues?.caloriesKcal ?? null}
            unit="kcal"
            fractions={0}
          />
          <MacroValue
            label="Eiwit"
            value={log.macroValues?.proteinG ?? null}
            unit="g"
            fractions={1}
          />
          <MacroValue
            label="Koolhydraten"
            value={log.macroValues?.carbohydratesG ?? null}
            unit="g"
            fractions={1}
          />
          <MacroValue
            label="Vet"
            value={log.macroValues?.fatG ?? null}
            unit="g"
            fractions={1}
          />
        </dl>
        {deleteError !== null && <p role="alert">{deleteError}</p>}
        <div className={styles.actions}>
          {log.type === "DISH" && log.dish.recipeAccessible && (
            <a
              className="ct-secondary"
              href={recipeDetailPath(log.dish.userId, log.dish.id)}
            >
              Recept bekijken
            </a>
          )}
          <Link className="ct-secondary" to={editLogPath(log.id, routeState)}>
            <Icon name="edit" />
            Bewerken
          </Link>
          <button
            type="button"
            className="ct-danger"
            onClick={onDelete}
            disabled={deleting}
          >
            <Icon name="delete" />
            {deleting ? "Verwijderen…" : "Verwijderen"}
          </button>
        </div>
      </section>
    </main>
  );
}

/**
 * Render a known zero separately from an unknown nutrition value.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
function MacroValue({
  label,
  value,
  unit,
  fractions,
}: {
  readonly label: string;
  readonly value: string | null;
  readonly unit: string;
  readonly fractions: number;
}): ReactNode {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value === null
          ? "Onbekend"
          : `${formatDecimal(value, fractions)} ${unit}`}
      </dd>
    </div>
  );
}
