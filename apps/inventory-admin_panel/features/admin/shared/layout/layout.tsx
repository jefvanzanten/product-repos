import { Outlet } from "react-router";
import NavBar from "../components/navbar/navbar";
import styles from "./layout.module.css";

export default function TopNavbarLayout() {
  return (
    <div className={styles.layout}>
      <div className={styles.dashboardFrame}>
        <NavBar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
