import { BottomTabBar } from "../../../packages/shared/components/bottom-tab-bar/bottom-tab-bar";
import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import styles from "./layout.module.css";

/**
 * Render the Calory Tracker routes with host-specific links in the shared tab bar.
 *
 * @returns The active Calory Tracker route and primary navigation.
 */
export default function BottomTabsLayout(): ReactNode {
  const location = useLocation();
  const isAdminActive = location.pathname.startsWith("/admin");
  const isAuthed = true; // TODO: Replace with actual authentication check

  return (
    <div className={styles.layout}>
      <Outlet />
      <BottomTabBar>
        <NavLink to="/" end className={styles["nav-link"]}>
          Calorie Statestieken
        </NavLink>
        <NavLink to="/" end className={styles["nav-link"]}>
          Consumptie Logboek
        </NavLink>
        {isAuthed && (
          <Link
            to="/admin/product-catalogus"
            aria-current={isAdminActive ? "page" : undefined}
          >
            Admin Dashboard
          </Link>
        )}
      </BottomTabBar>
    </div>
  );
}
