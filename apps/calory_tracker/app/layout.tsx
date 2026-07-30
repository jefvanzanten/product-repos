import { BottomTabBar } from "@product-repos/shared/bottom-tab-bar";
import type { ReactNode } from "react";
import {
  NavLink,
  Outlet,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { isAdministrator } from "@product-repos/auth-client/roles";
import { requireUser } from "./auth.server";
import styles from "./layout.module.css";

/** Load the authenticated user for the protected Calorie Tracker shell. */
export async function loader({ request }: LoaderFunctionArgs) {
  return { user: await requireUser(request) };
}

/**
 * Render the Calory Tracker routes with host-specific links in the shared tab bar.
 *
 * @returns The active Calory Tracker route and primary navigation.
 */
export default function BottomTabsLayout(): ReactNode {
  const { user } = useLoaderData<typeof loader>();
  const isAdmin = isAdministrator(user.role);

  return (
    <div className={styles.layout}>
      <Outlet />
      <BottomTabBar>
        <NavLink to="/" end className={styles["nav-link"]}>
          Calory Tracker
        </NavLink>
        {isAdmin && (
          <a href="/product-management-admin/product-catalogus?source=calory-tracker">
            Admin Dashboard
          </a>
        )}
      </BottomTabBar>
    </div>
  );
}
