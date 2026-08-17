import { createContext, useContext, type ComponentProps, type ReactNode } from "react";
import {
  Form,
  Link,
  NavLink,
  useLocation,
} from "react-router";
import {
  ADMIN_BASE_PATH,
  withAdminSource,
  type AdminSource,
} from "./admin-navigation";

const AdminSourceContext = createContext<AdminSource | null>(null);

/**
 * Provide the resolved admin source to route-owned navigation components.
 *
 * @param props - Resolved source and nested admin content.
 * @returns A source context provider.
 */
export function AdminSourceProvider({
  children,
  source,
}: {
  readonly children: ReactNode;
  readonly source: AdminSource | null;
}): ReactNode {
  return (
    <AdminSourceContext.Provider value={source}>
      {children}
    </AdminSourceContext.Provider>
  );
}

/**
 * Read the resolved source for the active admin route.
 *
 * @returns The explicit or fallback admin source, or `null`.
 */
export function useAdminSource(): AdminSource | null {
  return useContext(AdminSourceContext);
}

/**
 * Merge the active admin source into an app-internal target.
 *
 * @param target - App-internal admin target.
 * @returns The target retaining the active source context.
 */
export function useAdminPath(target: string): string {
  return withAdminSource(target, useAdminSource());
}

type AdminLinkProps = Omit<ComponentProps<typeof Link>, "to"> & {
  readonly to: string;
};

/**
 * Render an internal React Router link that retains admin source context.
 *
 * @param props - React Router link properties with a string target.
 * @returns A source-preserving internal link.
 */
export function AdminLink({ to, ...props }: AdminLinkProps): ReactNode {
  return <Link {...props} to={useAdminPath(to)} />;
}

type AdminNavLinkProps = Omit<ComponentProps<typeof NavLink>, "to"> & {
  readonly to: string;
};

/**
 * Render an internal navigation link that retains admin source context.
 *
 * @param props - React Router navigation-link properties.
 * @returns A source-preserving navigation link.
 */
export function AdminNavLink({ to, ...props }: AdminNavLinkProps): ReactNode {
  return <NavLink {...props} to={useAdminPath(to)} />;
}

type AdminFormProps = Omit<ComponentProps<typeof Form>, "action"> & {
  readonly action?: string;
};

/**
 * Render a React Router form whose action and fields retain admin source context.
 *
 * @param props - React Router form properties.
 * @returns A source-preserving data-router form.
 */
export function AdminForm({ action, children, ...props }: AdminFormProps): ReactNode {
  const location = useLocation();
  const source = useAdminSource();
  const currentInternalPath = location.pathname.startsWith(ADMIN_BASE_PATH)
    ? location.pathname.slice(ADMIN_BASE_PATH.length) || "/"
    : location.pathname;
  const target = withAdminSource(action ?? currentInternalPath, source);

  return (
    <Form {...props} action={target}>
      {source === null ? null : <input name="source" type="hidden" value={source} />}
      {children}
    </Form>
  );
}
