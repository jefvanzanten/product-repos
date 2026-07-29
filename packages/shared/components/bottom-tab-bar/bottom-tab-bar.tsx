import type { ReactNode } from "react";
import styles from "./bottom-tab-bar.module.css";

/**
 * Render a shared bottom tab bar around host-provided navigation links.
 *
 * Active links are styled through their `aria-current="page"` attribute, so
 * each host remains responsible for its own routes and labels.
 *
 * @param props - Bottom tab bar properties.
 * @returns The bottom navigation containing the supplied links.
 */
export function BottomTabBar({
  children,
}: {
  readonly children: ReactNode;
}): ReactNode {
  return (
    <nav className={styles.bottomTabBar} aria-label="Hoofdnavigatie">
      {children}
    </nav>
  );
}
