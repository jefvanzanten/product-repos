import { SessionMonitor } from "@product-repos/auth-client/session-monitor";
import { BottomTabBar } from "@product-repos/shared/bottom-tab-bar";
import type { ReactNode } from "react";
import {
  NavLink,
  Outlet,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { isAdministrator } from "@product-repos/auth-client/roles";
import { authClient } from "../../../app/auth-client";
import { requireUser } from "../../../app/auth.server";
import { INVENTORY_BASE_PATH, toInventoryPublicPath } from "../../../app/public-paths";
import styles from "./layout.module.css";

/** Auth-derived capabilities exposed to protected Inventory routes. */
export type InventoryOutletContext = {
  readonly isAdmin: boolean;
};

/**
 * Load the authenticated user for the protected Inventory shell.
 *
 * @param args - React Router loader arguments containing the incoming request.
 * @returns The authenticated user required by the protected shell.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  return { user: await requireUser(request) };
}

/**
 * Render the Inventory routes with host-specific links in the shared tab bar.
 *
 * @returns The active Inventory route and primary navigation.
 */
export default function BottomTabsLayout(): ReactNode {
  const { user } = useLoaderData<typeof loader>();
  const isAdmin = isAdministrator(user.role);

  return (
    <div className={styles.layout}>
      <SessionMonitor
        appBasePath={INVENTORY_BASE_PATH}
        authClient={authClient}
        loginPath={toInventoryPublicPath("/login")}
      />
      <Outlet context={{ isAdmin } satisfies InventoryOutletContext} />
      <BottomTabBar>
        <NavLink to="/" end>
          Inventarisatie
        </NavLink>
        {isAdmin ? (
          <a href="/product-management-admin/product-catalogus?source=inventory">
            Admin dashboard
          </a>
        ) : null}
      </BottomTabBar>
    </div>
  );
}
