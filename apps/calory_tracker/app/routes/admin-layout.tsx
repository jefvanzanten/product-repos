import { NavLink, Outlet } from "react-router";
import styles from "./admin-layout.module.css";

/**
 * Render the Calorie Tracker-specific shell around shared admin pages.
 *
 * @returns The admin navigation and active shared admin page.
 */
export default function AdminLayout(): React.ReactNode {
  return (
    <div className={styles.layout}>
      <div className={styles.dashboardFrame}>
        <nav className={styles.navbar} aria-label="Adminnavigatie">
          <NavLink
            to="/admin/product-catalogus"
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem
            }
          >
            Productcatalogus
          </NavLink>
          <NavLink
            to="/admin/locations"
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.activeNavItem}` : styles.navItem
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
