import { NavLink } from "react-router";
import styles from "./navbar.module.css";
import type React from "react";

export default function NavBar(): React.ReactNode {
  return (
    <nav className={styles["bottom-tabbar"]} aria-label="Hoofdnavigatie">
      <NavLink
        to="/admin/product-management"
        className={({ isActive }) =>
          isActive
            ? `${styles["bottom-tab"]} ${styles["bottom-tab--active"]}`
            : styles["bottom-tab"]
        }
      >
        <span>Producten</span>
      </NavLink>
      <NavLink
        to="/admin/locations"
        className={({ isActive }) =>
          isActive
            ? `${styles["bottom-tab"]} ${styles["bottom-tab--active"]}`
            : styles["bottom-tab"]
        }
      >
        <span>Opbergplaatsen</span>
      </NavLink>
    </nav>
  );
}
