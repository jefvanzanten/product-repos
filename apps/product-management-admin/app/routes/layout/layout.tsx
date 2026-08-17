import { SessionMonitor } from "@product-repos/auth-client/session-monitor";
import {
  data,
  Outlet,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { AdminBottomTabs } from "../../core/presentation/admin-shell/components/admin-bottom-tabs/admin-bottom-tabs";
import {
  AdminNavLink,
  AdminSourceProvider,
} from "../../core/presentation/routing/admin-source-context";
import { resolveAdminSource } from "../../core/data/admin-source-cookie.server";
import {
  ADMIN_BASE_PATH,
  toAdminPublicPath,
  withAdminSource,
} from "../../core/presentation/routing/admin-navigation";
import { authClient } from "../../core/data/auth/auth-client";
import { requireAdministrator } from "../../core/presentation/auth/auth.server";
import styles from "./layout.module.css";

/**
 * Authorize the layout route and resolve its closed source context.
 *
 * @param args - React Router loader arguments.
 * @returns The resolved source with an optional fallback-cookie response header.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdministrator(request);
  const resolvedSource = resolveAdminSource(request);
  const headers = new Headers();
  if (resolvedSource.setCookie !== null) headers.append("Set-Cookie", resolvedSource.setCookie);
  return data({ source: resolvedSource.source }, { headers });
}

/** Render protected navigation, route content, and bottom tabs. */
export default function Layout(): React.ReactNode {
  const { source } = useLoaderData<typeof loader>();

  return (
    <AdminSourceProvider source={source}>
      <SessionMonitor
        appBasePath={ADMIN_BASE_PATH}
        authClient={authClient}
        loginPath={toAdminPublicPath(withAdminSource("/login", source))}
      />
      <div className={styles.layout}>
        <div className={styles.dashboardFrame}>
          <nav className={styles.navbar} aria-label="Adminnavigatie">
            <AdminNavLink
              to="/product-catalogus"
              className={({ isActive }) =>
                isActive
                  ? `${styles.navItem} ${styles.activeNavItem}`
                  : styles.navItem
              }
            >
              Productcatalogus
            </AdminNavLink>
            <AdminNavLink
              to="/locations"
              className={({ isActive }) =>
                isActive
                  ? `${styles.navItem} ${styles.activeNavItem}`
                  : styles.navItem
              }
            >
              Opbergplaatsen
            </AdminNavLink>
          </nav>
          <div className={styles.content}>
            <Outlet />
          </div>
        </div>
      </div>
      <AdminBottomTabs source={source} />
    </AdminSourceProvider>
  );
}
