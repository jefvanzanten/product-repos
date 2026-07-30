import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import styles from "./admin-layout.module.css";

/**
 * Render the shared admin dashboard frame, navigation, and active child route.
 *
 * Host applications remain responsible for authentication and for mounting this
 * layout beneath their application shell.
 *
 * @returns The shared admin dashboard layout.
 */
export default function AdminLayout(): ReactNode {
  return (
    <div className={styles.layout}>
      <div className={styles.dashboardFrame}>
        <nav className={styles.navbar} aria-label="Adminnavigatie">
          <NavLink
            to="/admin/product-catalogus"
            className={({ isActive }) =>
              isActive
                ? `${styles.navItem} ${styles.activeNavItem}`
                : styles.navItem
            }
          >
            Productcatalogus
          </NavLink>
          <NavLink
            to="/admin/locations"
            className={({ isActive }) =>
              isActive
                ? `${styles.navItem} ${styles.activeNavItem}`
                : styles.navItem
            }
          >
            Opbergplaatsen
          </NavLink>
        </nav>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
