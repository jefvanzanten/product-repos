import { useEffect, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { canonicalizeTrackerUrl, getTodayInTimezone } from "../calorie-tracker-domain";
import { useBrowserTimezone } from "../use-browser-timezone";
import { LogForm } from "./log-form";
import LogsRoute from "./logs";
import styles from "./log-route-modal.module.css";

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

  if (timezone === null) return <LogsRoute />;

  return (
    <>
      <div className={styles.backdrop} aria-hidden="true"><LogsRoute /></div>
      <LogForm mode={{ _tag: "Create" }} date={canonical.state.date} type={canonical.state.type} timezone={timezone} />
    </>
  );
}
