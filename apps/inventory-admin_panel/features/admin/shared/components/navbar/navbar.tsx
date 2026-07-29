import { NavLink } from "react-router";
import styles from "./navbar.module.css";
import type React from "react";

export default function NavBar(): React.ReactNode {
  return (
    <nav className={styles["bottom-tabbar"]} aria-label="Hoofdnavigatie">
      <NavLink
        to="/admin/product-catalogus"
        className={({ isActive }) =>
          isActive
            ? `${styles["nav-item"]} ${styles["nav-item--active"]}`
            : styles["nav-item"]
        }
      >
        <span>Productcatalogus</span>
      </NavLink>
      <NavLink
        to="/admin/locations"
        className={({ isActive }) =>
          isActive
            ? `${styles["nav-item"]} ${styles["nav-item--active"]}`
            : styles["nav-item"]
        }
      >
        <span>Opbergplaatsen</span>
      </NavLink>
    </nav>
  );
}
