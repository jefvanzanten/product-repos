import { Outlet } from "react-router";
import NavBar from "./components/navbar";

export default function TopNavbarLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}
