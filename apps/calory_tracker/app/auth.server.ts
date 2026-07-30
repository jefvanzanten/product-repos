import { isAdministrator } from "@product-repos/auth-client/roles";
import {
  lookupSession,
  type AuthenticatedUser,
} from "@product-repos/auth-client/session.server";
import { redirect } from "react-router";

/** Require an authenticated user for a Calorie Tracker server request. */
export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const result = await lookupSession(request);
  if (result._tag === "Unauthenticated") throw redirect("/login");
  if (result._tag === "Unavailable") {
    throw new Response("Authenticatie is tijdelijk niet beschikbaar.", {
      status: result.status,
    });
  }
  return result.session.user;
}

/** Require an authenticated administrator for a Calorie Tracker admin request. */
export async function requireAdministrator(
  request: Request,
): Promise<AuthenticatedUser> {
  const user = await requireUser(request);
  if (!isAdministrator(user.role)) {
    throw new Response("Beheerderstoegang vereist.", { status: 403 });
  }
  return user;
}
