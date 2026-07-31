import { useEffect, useRef, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router";
import { formatLocalDate, getConsumptionTypeLabel } from "./calorie-tracker-domain";
import type { CalorieTrackerConsumptionType } from "@product-repos/contracts/calorie-tracker";
import styles from "./calorie-tracker-components.module.css";

/** Shared contextual navigation for the statistics and logbook routes. */
export function CalorieTrackerNavbar(): ReactNode {
  const location = useLocation();
  const parameters = new URLSearchParams(location.search);
  const date = parameters.get("date");
  const type = parameters.get("type") ?? "all";
  const dateSearch = date === null ? "" : `?${new URLSearchParams({ date })}`;
  const logsSearch = date === null ? "" : `?${new URLSearchParams({ date, type })}`;

  return (
    <nav className={styles.navbar} aria-label="Calorie Tracker">
      <NavLink to={`/${dateSearch}`} end>Caloriestatistieken</NavLink>
      <NavLink to={`/logs${logsSearch}`}>Consumptielogboek</NavLink>
    </nav>
  );
}

/** Native, keyboard-accessible date control styled to the Figma field. */
export function DateControl({
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
      <img src="/calory-tracker/calorie-tracker/calendar.svg" width="17" height="17" alt="" />
      <span aria-hidden="true">{formatLocalDate(date, "compact")}</span>
      <input
        type="date"
        value={date}
        max={today}
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <img src="/calory-tracker/calorie-tracker/chevron-down.svg" width="10" height="6" alt="" />
    </label>
  );
}

/** Colored, textual consumption-type badge. */
export function ConsumptionTypeBadge({ type }: { readonly type: CalorieTrackerConsumptionType }): ReactNode {
  return <span className={`${styles.badge} ${styles[type.toLowerCase()]}`}>{getConsumptionTypeLabel(type)}</span>;
}

/** Exact local placeholder or catalog image for a package. */
export function ProductImage({
  type,
  imageUrl,
  size = "regular",
}: {
  readonly type: CalorieTrackerConsumptionType;
  readonly imageUrl: string | null;
  readonly size?: "regular" | "large";
}): ReactNode {
  const fallback = type === "FOOD"
    ? "product-placeholder-food.svg"
    : type === "DRINK"
      ? "product-placeholder-drink.svg"
      : "product-placeholder-supplement.svg";
  const pixelSize = size === "large" ? 80 : 62;
  return (
    <img
      className={styles.productImage}
      src={imageUrl ?? `/calory-tracker/calorie-tracker/${fallback}`}
      width={pixelSize}
      height={pixelSize}
      alt=""
      onError={(event) => {
        event.currentTarget.src = `/calory-tracker/calorie-tracker/${fallback}`;
      }}
    />
  );
}

/** Accessible loading, error, or empty message panel. */
export function StatusPanel({
  title,
  message,
  action,
}: {
  readonly title: string;
  readonly message: string;
  readonly action?: ReactNode;
}): ReactNode {
  return (
    <section className={styles.statusPanel} aria-live="polite">
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </section>
  );
}

/** Focus-trapped modal surface with Escape handling and opener focus restoration. */
export function FocusDialog({
  title,
  children,
  onClose,
  className = "",
}: {
  readonly title: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
  readonly className?: string;
}): ReactNode {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>("button, input, select, a[href]");
    first?.focus();

    /** Keep Tab focus in the dialog and close it with Escape. */
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || dialog === null) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]"));
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];
      if (firstFocusable === undefined || lastFocusable === undefined) return;
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      openerRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div className={styles.scrim} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className={`${styles.dialog} ${className}`}>
        {children}
      </div>
    </div>
  );
}

type IconName = "add" | "back" | "check" | "chevron-right" | "close" | "delete" | "edit" | "search" | "settings" | "time";

const ICON_LEAVES: Record<IconName, { readonly width: number; readonly height: number }> = {
  add: { width: 13.17, height: 13.17 },
  back: { width: 7.8, height: 13.8 },
  check: { width: 14.48, height: 10.82 },
  "chevron-right": { width: 6.5, height: 11.5 },
  close: { width: 13.8, height: 13.8 },
  delete: { width: 14.83, height: 14.83 },
  edit: { width: 14.1, height: 13.68 },
  search: { width: 14.83, height: 14.83 },
  settings: { width: 20, height: 20 },
  time: { width: 16.5, height: 16.5 },
};

/** Compact icon with separate explicit Figma outer-box and intrinsic leaf dimensions. */
export function Icon({
  name,
  size = 20,
}: {
  readonly name: IconName;
  readonly size?: number;
}): ReactNode {
  const leaf = ICON_LEAVES[name];
  return <span className={styles.icon} style={{ width: size, height: size }}><img src={`/calory-tracker/calorie-tracker/${name}.svg`} width={leaf.width} height={leaf.height} alt="" /></span>;
}
