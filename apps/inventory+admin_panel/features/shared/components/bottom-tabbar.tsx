import { NavLink, useLocation } from "react-router";
import styles from "./bottom-tabbar.module.css";
import type React from "react";

export default function BottomTabbar(): React.ReactNode {
  const location = useLocation();
  const isAdminActive = location.pathname.startsWith("/admin");

  return (
    <nav className={styles["bottom-tabbar"]} aria-label="Hoofdnavigatie">
      <NavLink
        to="/"
        className={({ isActive }) =>
          isActive
            ? `${styles["bottom-tab"]} ${styles["bottom-tab--active"]}`
            : styles["bottom-tab"]
        }
      >
        <span className={styles.icon} aria-hidden="true">
          ⌂
        </span>
        <span>Inventarisatie</span>
      </NavLink>
      <NavLink
        to="/admin/product-management"
        className={
          isAdminActive
            ? `${styles["bottom-tab"]} ${styles["bottom-tab--active"]}`
            : styles["bottom-tab"]
        }
      >
        <span className={styles.icon} aria-hidden="true">
          ⌂
        </span>
        <span>Admin</span>
      </NavLink>
    </nav>
  );
}
