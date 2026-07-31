import { isAdministrator } from "@product-repos/auth-client/roles";
import { BottomTabBar } from "@product-repos/shared/bottom-tab-bar";
import type { ReactNode } from "react";
import { Link, Outlet, useLoaderData, useLocation, type LoaderFunctionArgs } from "react-router";
import { CalorieTrackerNavbar } from "./calorie-tracker-components";
import { requireUser } from "./auth.server";
import styles from "./layout.module.css";

/** Load the authenticated user for the protected Calorie Tracker shell. */
export async function loader({ request }: LoaderFunctionArgs) {
  return { user: await requireUser(request) };
}

/** Render authenticated routes in the shared Calorie Tracker application shell. */
export default function BottomTabsLayout(): ReactNode {
  const { user } = useLoaderData<typeof loader>();
  const location = useLocation();
  const isAdmin = isAdministrator(user.role);
  const showsTrackerNavbar = location.pathname === "/"
    || location.pathname === "/logs"
    || location.pathname === "/logs/nieuw"
    || location.pathname.endsWith("/bewerken");

  return (
    <div className={styles.layout}>
      {showsTrackerNavbar && <CalorieTrackerNavbar />}
      <Outlet />
      <BottomTabBar>
        <Link to="/" aria-current="page">Calory Tracker</Link>
        {isAdmin && (
          <a href="/product-management-admin/product-catalogus?source=calory-tracker">
            Admin Dashboard
          </a>
        )}
      </BottomTabBar>
    </div>
  );
}
