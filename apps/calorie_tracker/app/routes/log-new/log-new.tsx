import { useEffect, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { canonicalizeTrackerUrl } from "../../domain/consumption-types";
import { getTodayInTimezone } from "../../domain/dates-and-timezones";
import { useBrowserTimezone } from "../../hooks/use-browser-timezone";
import { LogForm } from "../log-form/log-form";
import type { CalorieTrackerRouteHandle } from "../../routing/calorie-tracker-routes";

/** Route metadata keeps the mounted logbook inert behind this overlay. */
export const handle: CalorieTrackerRouteHandle = {
  showsTrackerNavbar: true,
  logPresentation: "overlay",
};

/** Return metadata for the route-bound create-log flow. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Log toevoegen | Calorie Tracker" }];
}

/** Render a canonical, refreshable create form as mobile fullscreen or desktop modal. */
export default function NewLogRoute(): ReactNode {
  const [parameters, setParameters] = useSearchParams();
  const timezone = useBrowserTimezone();
  const today = getTodayInTimezone(timezone ?? "UTC");
  const canonical = canonicalizeTrackerUrl(parameters.get("date"), parameters.get("type"), today);

  useEffect(() => {
    if (timezone === null || !canonical.requiresReplace) return;
    setParameters(canonical.state, { replace: true });
  }, [canonical, setParameters, timezone]);

  if (timezone === null) return null;

  return <LogForm mode={{ _tag: "Create" }} date={canonical.state.date} type={canonical.state.type} timezone={timezone} />;
}
