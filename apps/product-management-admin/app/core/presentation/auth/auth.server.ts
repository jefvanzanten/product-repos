import { isAdministrator } from "@product-repos/auth-client/roles";
import {
  lookupSession,
  type AuthenticatedUser,
} from "@product-repos/auth-client/session.server";
import { redirect } from "react-router";
import {
  getAdminReturnPath,
  parseAdminReturnPath,
  parseAdminSourceFromSearch,
  toAdminPublicPath,
  toAdminRedirectPath,
  withAdminSource,
  type AdminSource,
} from "../routing/admin-navigation";

/**
 * Require an authenticated Product Management Admin user.
 *
 * @param request - Incoming admin request.
 * @returns The authenticated user.
 */
export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const result = await lookupSession(request);
  if (result.tag === "Unauthenticated") {
    const requestUrl = new URL(request.url);
    const source = parseAdminSourceFromSearch(requestUrl.searchParams);
    const loginSearch = new URLSearchParams({
      returnTo: getAdminReturnPath(requestUrl),
    });
    throw redirect(toAdminRedirectPath(`/login?${loginSearch.toString()}`, source));
  }
  if (result.tag === "Unavailable") {
    throw new Response("Authenticatie is tijdelijk niet beschikbaar.", {
      status: result.status,
    });
  }
  return result.session.user;
}

/**
 * Require an authenticated administrator for protected admin content.
 *
 * @param request - Incoming admin request.
 * @returns The authenticated administrator.
 */
export async function requireAdministrator(request: Request): Promise<AuthenticatedUser> {
  const user = await requireUser(request);
  if (!isAdministrator(user.role)) {
    throw new Response("Beheerderstoegang vereist.", { status: 403 });
  }
  return user;
}

/**
 * Build the safe post-login public destination represented by a login URL.
 *
 * @param loginUrl - Parsed admin login URL.
 * @param source - Resolved validated admin source.
 * @returns A basename-safe public admin destination for browser navigation.
 */
export function buildAdminLoginSuccessPath(
  loginUrl: URL,
  source: AdminSource | null,
): string {
  const safeReturnTo = parseAdminReturnPath(loginUrl.searchParams.get("returnTo"));
  return toAdminPublicPath(withAdminSource(safeReturnTo, source));
}
