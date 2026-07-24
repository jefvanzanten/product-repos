import { Outlet } from "react-router";
import BottomTabbar from "./components/bottom-tabbar";

export default function BottomTabsLayout() {
  return (
    <div className="min-h-dvh bg-black text-slate-950">
      <Outlet />
      <BottomTabbar />
    </div>
  );
}
