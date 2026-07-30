import { BottomTabBar } from "@product-repos/shared/bottom-tab-bar";
import type { ReactNode } from "react";
import {
  NavLink,
  Outlet,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { isAdministrator } from "@product-repos/auth-client/roles";
import { requireUser } from "../../../app/auth.server";
import styles from "./layout.module.css";

/** Load the authenticated user for the protected Inventory shell. */
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
      <Outlet />
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
