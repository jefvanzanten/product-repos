import {
  lookupSession,
  type AuthenticatedUser,
} from "@product-repos/auth-client/session.server";
import { redirect } from "react-router";
import { toInventoryRedirectPath } from "./public-paths";

/** Require an authenticated user for an Inventory server request. */
export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const result = await lookupSession(request);
  if (result._tag === "Unauthenticated") {
    throw redirect(toInventoryRedirectPath("/login"));
  }
  if (result._tag === "Unavailable") {
    throw new Response("Authenticatie is tijdelijk niet beschikbaar.", {
      status: result.status,
    });
  }
  return result.session.user;
}
