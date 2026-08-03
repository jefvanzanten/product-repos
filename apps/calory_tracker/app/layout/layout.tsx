import { isAdministrator } from "@product-repos/auth-client/roles";
import { SessionMonitor } from "@product-repos/auth-client/session-monitor";
import { BottomTabBar } from "@product-repos/shared/bottom-tab-bar";
import type { ReactNode } from "react";
import { Link, Outlet, useLoaderData, useMatches, type LoaderFunctionArgs } from "react-router";
import { authClient } from "../auth/auth-client";
import { CalorieTrackerNavbar } from "../components/calorie-tracker-navbar/calorie-tracker-navbar";
import { requireUser } from "../auth/auth.server";
import { CALORY_TRACKER_BASE_PATH } from "../auth/public-paths";
import {
  loginPath,
  productManagementAdminPath,
  toCalorieTrackerPublicPath,
  type CalorieTrackerRouteHandle,
} from "../routing/calorie-tracker-routes";
import styles from "./layout.module.css";

/** Load the authenticated user for the protected Calorie Tracker shell. */
export async function loader({ request }: LoaderFunctionArgs) {
  return { user: await requireUser(request) };
}

/** Render authenticated routes in the shared Calorie Tracker application shell. */
export default function BottomTabsLayout(): ReactNode {
  const { user } = useLoaderData<typeof loader>();
  const matches = useMatches();
  const isAdmin = isAdministrator(user.role);
  const leafHandle = matches.at(-1)?.handle as CalorieTrackerRouteHandle | undefined;
  const showsTrackerNavbar = leafHandle?.showsTrackerNavbar ?? false;

  return (
    <div className={styles.layout}>
      <SessionMonitor
        appBasePath={CALORY_TRACKER_BASE_PATH}
        authClient={authClient}
        loginPath={toCalorieTrackerPublicPath(loginPath())}
      />
      {showsTrackerNavbar && <CalorieTrackerNavbar />}
      <Outlet />
      <BottomTabBar>
        <Link to="/" aria-current="page">Calorie Tracker</Link>
        {isAdmin && (
          <a href={productManagementAdminPath()}>
            Admin Dashboard
          </a>
        )}
      </BottomTabBar>
    </div>
  );
}
