import { LoginPage } from "@product-repos/auth-client/login-page";
import { lookupSession } from "@product-repos/auth-client/session.server";
import { data, redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { authClient } from "../../core/data/auth/auth-client";
import {
  parseCalorieTrackerReturnPath,
  toCalorieTrackerRedirectPath,
} from "../../core/presentation/routing/public-paths";
import { toCalorieTrackerPublicPath } from "../../core/presentation/routing/calorie-tracker-routes";

/** Redirect an already authenticated visitor away from the login page. */
export async function loader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url);
  const returnTo = parseCalorieTrackerReturnPath(requestUrl.searchParams.get("returnTo"));
  const result = await lookupSession(request);
  if (result.tag === "Authenticated") {
    throw redirect(toCalorieTrackerRedirectPath(returnTo));
  }
  if (result.tag === "Unavailable") {
    throw new Response("Authenticatie is tijdelijk niet beschikbaar.", { status: result.status });
  }
  return data({ successPath: toCalorieTrackerPublicPath(returnTo) });
}

/** Render the shared login page with Calorie Tracker content and styling. */
export default function LoginRoute(): React.ReactNode {
  const { successPath } = useLoaderData<typeof loader>();
  return (
    <LoginPage
      appearance="dark"
      appName="Calorie Tracker"
      authClient={authClient}
      intro="Log in om je persoonlijke logs en doelen te openen."
      successPath={successPath}
    />
  );
}
