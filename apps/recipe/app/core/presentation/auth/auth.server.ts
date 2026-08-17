import { lookupSession, type AuthenticatedUser } from "@product-repos/auth-client/session.server";
import { redirect } from "react-router";
import { loginPath } from "../routing/recipe-routes";
import { returnPathFromRequest } from "../routing/public-paths";

/**
 * Resolve an optional Recipe user without forcing public visitors to log in.
 *
 * @param request - Incoming route request.
 * @returns The authenticated user or null for an anonymous visitor.
 */
export async function optionalUser(request: Request): Promise<AuthenticatedUser | null> {
  const result = await lookupSession(request);
  if (result.tag === "Authenticated") return result.session.user;
  if (result.tag === "Unavailable") {
    throw new Response("Authenticatie is tijdelijk niet beschikbaar.", { status: result.status });
  }
  return null;
}

/**
 * Require authentication and preserve a safe Recipe return path.
 *
 * @param request - Incoming protected route request.
 * @returns The authenticated user.
 */
export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const user = await optionalUser(request);
  if (user !== null) return user;
  throw redirect(loginPath(returnPathFromRequest(request)));
}
