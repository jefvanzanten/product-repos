import { type ReactNode } from "react";
import { NavLink, useLocation, useMatches, useSearchParams } from "react-router";
import { canonicalizeTrackerUrl } from "../../domain/consumption-types";
import { formatLocalDate, getTodayInTimezone } from "../../domain/dates-and-timezones";
import { useBrowserTimezone } from "../../hooks/use-browser-timezone";
import {
  logbookPath,
  statisticsPath,
  type CalorieTrackerRouteHandle,
} from "../../routing/calorie-tracker-routes";
import styles from "./calorie-tracker-navbar.module.css";

/** Shared contextual navigation for the statistics and logbook routes. */
export function CalorieTrackerNavbar(): ReactNode {
  const location = useLocation();
  const matches = useMatches();
  const [parameters, setParameters] = useSearchParams();
  const resolvedTimezone = useBrowserTimezone();
  const timezone = resolvedTimezone ?? "UTC";
  const today = getTodayInTimezone(timezone);
  const canonical = canonicalizeTrackerUrl(parameters.get("date"), parameters.get("type"), today);
  const { date, type } = canonical.state;
  const leafHandle = matches.at(-1)?.handle as CalorieTrackerRouteHandle | undefined;
  const showsDateHeader = leafHandle?.showsDateHeader ?? false;
  const className = showsDateHeader ? `${styles.navbar} ${styles.dateNavbar}` : styles.navbar;

  /** Change the header date while retaining logbook filter context. */
  function selectHeaderDate(nextDate: string): void {
    const nextParameters = new URLSearchParams({ date: nextDate });
    if (location.pathname === "/logs" || parameters.has("type")) nextParameters.set("type", type);
    setParameters(nextParameters);
  }

  return (
    <header className={styles.trackerHeader}>
      {showsDateHeader && (
        <div className={styles.headerDate}>
          <DateControl date={date} today={today} onChange={selectHeaderDate} />
        </div>
      )}
      <nav className={className} aria-label="Calorie Tracker">
        <NavLink to={statisticsPath(date, type)} end>Caloriestatistieken</NavLink>
        <NavLink to={logbookPath({ date, type })}>Consumptielogboek</NavLink>
      </nav>
    </header>
  );
}

/** Native, keyboard-accessible date control styled to the Figma field. */
function DateControl({
  date,
  today,
  onChange,
  label = "Geselecteerde datum",
}: {
  readonly date: string;
  readonly today: string;
  readonly onChange: (date: string) => void;
  readonly label?: string;
}): ReactNode {
  return (
    <label className={styles.dateControl}>
      <span className={styles.visuallyHidden}>{label}</span>
      <img src="/calorie-tracker/calorie-tracker/calendar.svg" width="17" height="17" alt="" />
      <span aria-hidden="true">{formatLocalDate(date, "compact")}</span>
      <input
        type="date"
        value={date}
        max={today}
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <img src="/calorie-tracker/calorie-tracker/chevron-down.svg" width="10" height="6" alt="" />
    </label>
  );
}
