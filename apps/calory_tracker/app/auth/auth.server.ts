import {
  lookupSession,
  type AuthenticatedUser,
} from "@product-repos/auth-client/session.server";
import { redirect } from "react-router";
import { loginPath } from "../routing/calorie-tracker-routes";
import { returnPathFromRequest, toCaloryTrackerRedirectPath } from "./public-paths";

/** Require an authenticated user for a Calorie Tracker server request. */
export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const result = await lookupSession(request);
  if (result._tag === "Unauthenticated") {
    const returnTo = returnPathFromRequest(request);
    throw redirect(toCaloryTrackerRedirectPath(loginPath(returnTo)));
  }
  if (result._tag === "Unavailable") {
    throw new Response("Authenticatie is tijdelijk niet beschikbaar.", {
      status: result.status,
    });
  }
  return result.session.user;
}
