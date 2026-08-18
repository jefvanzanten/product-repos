import { useEffect, type ReactNode } from "react";
import type { ProductReposAuthClient } from "../../auth-client";

/** Public routing configuration used when an authenticated browser session disappears. */
export type SessionExpiryNavigation = {
  readonly appBasePath: string;
  readonly loginPath: string;
};

/** Properties for the shared protected-shell session monitor. */
export type SessionMonitorProps = SessionExpiryNavigation & {
  readonly authClient: ProductReposAuthClient;
};

let redirectStarted = false;

/** Build a login path with a same-application return destination from a public URL. */
export function buildSessionExpiredLoginPath(
  currentUrl: string,
  navigation: SessionExpiryNavigation,
): string {
  const url = new URL(currentUrl, "https://product-repos.internal");
  const basePath = normalizeBasePath(navigation.appBasePath);
  const loginUrl = new URL(normalizePublicPath(navigation.loginPath), "https://product-repos.internal");
  const belongsToApplication = url.pathname === basePath
    || url.pathname.startsWith(`${basePath}/`);
  if (!belongsToApplication || url.pathname === loginUrl.pathname) {
    return `${loginUrl.pathname}${loginUrl.search}`;
  }

  const internalPath = url.pathname.slice(basePath.length) || "/";
  const returnTo = `${internalPath}${url.search}${url.hash}`;
  loginUrl.searchParams.set("returnTo", returnTo);
  return `${loginUrl.pathname}${loginUrl.search}`;
}

/** Replace the current document with login once after the backend rejects its session. */
export function redirectToSessionLogin(navigation: SessionExpiryNavigation): void {
  if (redirectStarted) return;
  redirectStarted = true;
  window.location.replace(buildSessionExpiredLoginPath(window.location.href, navigation));
}

/** Monitor Better Auth on focus and connectivity changes and discard a stale protected shell. */
export function SessionMonitor({
  appBasePath,
  authClient,
  loginPath,
}: SessionMonitorProps): ReactNode {
  const session = authClient.useSession();

  useEffect(() => {
    if (session.isPending || session.data !== null || session.error !== null) return;
    redirectToSessionLogin({ appBasePath, loginPath });
  }, [appBasePath, loginPath, session.data, session.error, session.isPending]);

  return null;
}

/** Normalize a public application base without a trailing slash. */
function normalizeBasePath(path: string): string {
  const normalized = normalizePublicPath(path);
  return normalized === "/" ? "" : normalized.replace(/\/$/, "");
}

/** Normalize an absolute same-origin public path. */
function normalizePublicPath(path: string): string {
  return `/${path.replace(/^\/+/, "")}`;
}
