import { Outlet } from "react-router";
import BottomTabbar from "./components/bottom-tabbar";

export default function BottomTabsLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Outlet />
      <BottomTabbar />
    </div>
  );
}
