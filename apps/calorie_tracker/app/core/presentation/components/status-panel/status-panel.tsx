import type { ReactNode } from "react";
import styles from "./status-panel.module.css";

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
