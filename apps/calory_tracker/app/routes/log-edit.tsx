import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import { getConsumptionLog } from "../calorie-tracker-api";
import { canonicalizeTrackerUrl, getTodayInTimezone } from "../calorie-tracker-domain";
import { StatusPanel } from "../calorie-tracker-components";
import { useBrowserTimezone } from "../use-browser-timezone";
import { LogForm } from "./log-form";
import LogsRoute from "./logs";
import styles from "./log-route-modal.module.css";

/** Return metadata for the refreshable edit-log route. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Log bewerken | Calorie Tracker" }];
}

/** Load parsed current log data before rendering the shared edit form. */
export default function EditLogRoute(): ReactNode {
  const { logId = "" } = useParams();
  const resolvedTimezone = useBrowserTimezone();
  const timezone = resolvedTimezone ?? "UTC";
  const [parameters, setParameters] = useSearchParams();
  const canonical = canonicalizeTrackerUrl(parameters.get("date"), parameters.get("type"), getTodayInTimezone(timezone));
  const detailQuery = useQuery({
    queryKey: ["calorie-tracker", "log", logId],
    enabled: resolvedTimezone !== null,
    queryFn: ({ signal }) => getConsumptionLog(logId, { timezone, signal }),
  });

  useEffect(() => {
    if (resolvedTimezone === null || !canonical.requiresReplace) return;
    setParameters(canonical.state, { replace: true });
  }, [canonical, resolvedTimezone, setParameters]);

  const outcome = detailQuery.data;
  const detailHref = `/logs/${logId}?${new URLSearchParams(canonical.state)}`;
  if (outcome === undefined) return <StatusPanel title="Log laden" message="De actuele gegevens worden opgehaald…" />;
  if (outcome._tag === "Failure") {
    const notFound = outcome.error._tag === "HttpFailure" && outcome.error.status === 404;
    return <StatusPanel title={notFound ? "Log niet gevonden" : "Log laden lukt niet"} message={notFound ? "Deze log is niet beschikbaar." : "Probeer de log opnieuw te laden."} action={<Link className="ct-secondary" to={detailHref}>Terug</Link>} />;
  }
  return (
    <>
      <div className={styles.backdrop} aria-hidden="true"><LogsRoute /></div>
      <LogForm mode={{ _tag: "Edit", log: outcome.value }} date={canonical.state.date} type={canonical.state.type} timezone={outcome.value.timezone} />
    </>
  );
}
