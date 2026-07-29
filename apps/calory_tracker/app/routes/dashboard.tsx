import styles from "./dashboard.module.css";

/**
 * Return metadata for the Calorie Tracker dashboard.
 *
 * @returns Dashboard title metadata.
 */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Calorie Tracker" }];
}

/**
 * Render the minimal Calory Tracker page.
 *
 * @returns A centered Calory Tracker placeholder.
 */
export default function DashboardRoute(): React.ReactNode {
  return (
    <main className={styles.page}>
      <p>calory tracker</p>
    </main>
  );
}
