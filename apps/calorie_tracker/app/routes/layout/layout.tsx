import { isAdministrator } from "@product-repos/auth-client/roles";
import { SessionMonitor } from "@product-repos/auth-client/session-monitor";
import { BottomTabBar } from "@product-repos/shared/bottom-tab-bar";
import { useEffect, useRef, type ReactNode } from "react";
import { Link, Outlet, useFetcher, useLoaderData, useMatches, type LoaderFunctionArgs } from "react-router";
import { authClient } from "../../core/data/auth/auth-client";
import { requireUser } from "../../core/presentation/auth/auth.server";
import { CALORIE_TRACKER_BASE_PATH } from "../../core/presentation/routing/public-paths";
import { CalorieTrackerNavbar } from "../../core/presentation/tracker-shell/components/calorie-tracker-navbar/calorie-tracker-navbar";
import { useBrowserTimezone } from "../../core/presentation/hooks/use-browser-timezone";
import {
  loginPath,
  productManagementAdminPath,
  toCalorieTrackerPublicPath,
  type CalorieTrackerRouteHandle,
} from "../../core/presentation/routing/calorie-tracker-routes";
import { readBrowserTimezone } from "../../core/data/timezone.server";
import styles from "./layout.module.css";

/**
 * Load the authenticated user and the currently registered browser timezone.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  return {
    user: await requireUser(request),
    timezone: readBrowserTimezone(request),
  };
}

/**
 * Render authenticated routes in the shared Calorie Tracker application shell.
 *
 * @returns The function result.
 */
export default function BottomTabsLayout(): ReactNode {
  const { user, timezone: registeredTimezone } = useLoaderData<typeof loader>();
  const browserTimezone = useBrowserTimezone();
  const timezoneFetcher = useFetcher<typeof import("../timezone").action>();
  const submittedTimezone = useRef<string | null>(null);
  const matches = useMatches();
  const isAdmin = isAdministrator(user.role);
  // SAFETY: React Router returns the statically declared handle from this application's route module.
  const leafHandle = matches.at(-1)?.handle as CalorieTrackerRouteHandle | undefined;
  const showsTrackerNavbar = leafHandle?.showsTrackerNavbar ?? false;

  useEffect(() => {
    if (browserTimezone === null || browserTimezone === registeredTimezone) {
      submittedTimezone.current = null;
      return;
    }
    if (timezoneFetcher.state !== "idle" || submittedTimezone.current === browserTimezone) return;
    submittedTimezone.current = browserTimezone;
    void timezoneFetcher.submit(
      { timezone: browserTimezone },
      { method: "post", action: "/timezone" },
    );
  }, [browserTimezone, registeredTimezone, timezoneFetcher]);

  return (
    <div className={styles.layout}>
      <SessionMonitor
        appBasePath={CALORIE_TRACKER_BASE_PATH}
        authClient={authClient}
        loginPath={toCalorieTrackerPublicPath(loginPath())}
      />
      {showsTrackerNavbar && <CalorieTrackerNavbar />}
      <Outlet />
      <BottomTabBar>
        <Link to="/" aria-current="page">Calorie Tracker</Link>
        {isAdmin && <a href={productManagementAdminPath()}>Admin Dashboard</a>}
      </BottomTabBar>
    </div>
  );
}
