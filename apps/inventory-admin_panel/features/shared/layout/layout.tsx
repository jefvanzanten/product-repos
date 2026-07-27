import { Outlet } from "react-router";
import BottomTabbar from "../components/bottom-tabbar/bottom-tabbar";
import styles from "./layout.module.css";

export default function BottomTabsLayout() {
  return (
    <div className={styles.layout}>
      <Outlet />
      <BottomTabbar />
    </div>
  );
}
