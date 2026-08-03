import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import { getConsumptionLog } from "../../api/calorie-tracker-api/calorie-tracker-api";
import { canonicalizeTrackerUrl } from "../../domain/consumption-types";
import { getTodayInTimezone } from "../../domain/dates-and-timezones";
import { StatusPanel } from "../../components/status-panel/status-panel";
import { useBrowserTimezone } from "../../hooks/use-browser-timezone";
import { LogForm } from "../log-form/log-form";
import {
  logDetailPath,
  type CalorieTrackerRouteHandle,
} from "../../routing/calorie-tracker-routes";
import { calorieTrackerQueryKeys } from "../../api/calorie-tracker-api/calorie-tracker-query-keys";

/** Route metadata keeps one inert logbook mounted behind the edit overlay. */
export const handle: CalorieTrackerRouteHandle = {
  showsTrackerNavbar: true,
  logPresentation: "overlay",
};

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
    queryKey: calorieTrackerQueryKeys.log(logId),
    enabled: resolvedTimezone !== null,
    retry: false,
    queryFn: ({ signal }) => getConsumptionLog(logId, { timezone, signal }),
  });

  useEffect(() => {
    if (resolvedTimezone === null || !canonical.requiresReplace) return;
    setParameters(canonical.state, { replace: true });
  }, [canonical, resolvedTimezone, setParameters]);

  const outcome = detailQuery.data;
  const detailHref = logDetailPath(logId, canonical.state);
  if (outcome === undefined) return <StatusPanel title="Log laden" message="De actuele gegevens worden opgehaald…" />;
  if (outcome._tag === "Failure") {
    const notFound = outcome.error._tag === "HttpFailure" && outcome.error.status === 404;
    return <StatusPanel title={notFound ? "Log niet gevonden" : "Log laden lukt niet"} message={notFound ? "Deze log is niet beschikbaar." : "Probeer de log opnieuw te laden."} action={<Link className="ct-secondary" to={detailHref}>Terug</Link>} />;
  }
  return <LogForm mode={{ _tag: "Edit", log: outcome.value }} date={canonical.state.date} type={canonical.state.type} timezone={outcome.value.timezone} />;
}
