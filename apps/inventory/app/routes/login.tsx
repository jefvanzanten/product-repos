import { LoginPage } from "@product-repos/auth-client/login-page";
import { lookupSession } from "@product-repos/auth-client/session.server";
import { data, redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { authClient } from "../core/data/auth/auth-client";
import {
  parseInventoryReturnPath,
  toInventoryPublicPath,
  toInventoryRedirectPath,
} from "../core/presentation/routing/public-paths";

/** Redirect an already authenticated visitor away from the login page. */
export async function loader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url);
  const returnTo = parseInventoryReturnPath(requestUrl.searchParams.get("returnTo"));
  const result = await lookupSession(request);
  if (result.tag === "Authenticated") {
    throw redirect(toInventoryRedirectPath(returnTo));
  }
  if (result.tag === "Unavailable") {
    throw new Response("Authenticatie is tijdelijk niet beschikbaar.", { status: result.status });
  }
  return data({ successPath: toInventoryPublicPath(returnTo) });
}

/** Render the shared login page with Inventory content and styling. */
export default function LoginRoute(): React.ReactNode {
  const { successPath } = useLoaderData<typeof loader>();
  return (
    <LoginPage
      appearance="light"
      appName="Inventory"
      authClient={authClient}
      intro="Log in om de voorraadapplicatie te openen."
      successPath={successPath}
    />
  );
}
