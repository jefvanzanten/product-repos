import { Outlet } from "react-router";
import NavBar from "./components/navbar";

export default function TopNavbarLayout() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-[radial-gradient(circle_at_82%_8%,rgba(79,92,181,0.82),rgba(16,18,36,0.95)_48%,#101124_100%)] px-6 pb-24 pt-10 text-white shadow-2xl">
      <NavBar />
      <Outlet />
    </div>
  );
}
