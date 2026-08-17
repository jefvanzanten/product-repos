import {
  lookupSession,
  type AuthenticatedUser,
} from "@product-repos/auth-client/session.server";
import { redirect } from "react-router";
import { inventoryLoginPath } from "../routing/inventory-routes";
import { returnPathFromRequest, toInventoryRedirectPath } from "../routing/public-paths";

/** Require an authenticated user for an Inventory server request. */
export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const result = await lookupSession(request);
  if (result.tag === "Unauthenticated") {
    throw redirect(toInventoryRedirectPath(inventoryLoginPath(returnPathFromRequest(request))));
  }
  if (result.tag === "Unavailable") {
    throw new Response("Authenticatie is tijdelijk niet beschikbaar.", {
      status: result.status,
    });
  }
  return result.session.user;
}
