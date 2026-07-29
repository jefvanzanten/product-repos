import { BottomTabBar } from "@product-repos/admin-dashboard/bottom-tab-bar";
import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import styles from "./layout.module.css";

/**
 * Render the Inventory routes with host-specific links in the shared tab bar.
 *
 * @returns The active Inventory route and primary navigation.
 */
export default function BottomTabsLayout(): ReactNode {
  const location = useLocation();
  const isAdminActive = location.pathname.startsWith("/admin");

  return (
    <div className={styles.layout}>
      <Outlet />
      <BottomTabBar>
        <NavLink to="/" end>
          Inventarisatie
        </NavLink>
        <Link
          to="/admin/product-catalogus"
          aria-current={isAdminActive ? "page" : undefined}
        >
          Admin dashboard
        </Link>
      </BottomTabBar>
    </div>
  );
}
