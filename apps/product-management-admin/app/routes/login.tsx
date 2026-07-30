import { isAdministrator } from "@product-repos/auth-client/roles";
import { LoginPage } from "@product-repos/auth-client/login-page";
import { lookupSession } from "@product-repos/auth-client/session.server";
import { data, redirect, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { authClient } from "../auth-client";
import {
  parseAdminReturnPath,
  toAdminRedirectPath,
} from "../admin-navigation";
import { buildAdminLoginSuccessPath } from "../auth.server";
import { resolveAdminSource } from "../admin-source.server";

/**
 * Resolve a safe login destination and redirect an existing administrator.
 *
 * @param args - React Router loader arguments.
 * @returns Login route data for an unauthenticated visitor.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url);
  const resolvedSource = resolveAdminSource(request);
  const successPath = buildAdminLoginSuccessPath(requestUrl, resolvedSource.source);
  const sessionResult = await lookupSession(request);

  if (sessionResult._tag === "Authenticated") {
    if (!isAdministrator(sessionResult.session.user.role)) {
      throw new Response("Beheerderstoegang vereist.", { status: 403 });
    }
    const returnPath = parseAdminReturnPath(requestUrl.searchParams.get("returnTo"));
    throw redirect(toAdminRedirectPath(returnPath, resolvedSource.source));
  }
  if (sessionResult._tag === "Unavailable") {
    throw new Response("Authenticatie is tijdelijk niet beschikbaar.", {
      status: sessionResult.status,
    });
  }

  const headers = new Headers();
  if (resolvedSource.setCookie !== null) headers.append("Set-Cookie", resolvedSource.setCookie);
  return data({ successPath }, { headers });
}

/** Render the Product Management Admin login page. */
export default function LoginRoute(): React.ReactNode {
  const { successPath } = useLoaderData<typeof loader>();
  return (
    <LoginPage
      appearance="dark"
      appName="Product Management Admin"
      authClient={authClient}
      intro="Log in met een beheerdersaccount om de productcatalogus te beheren."
      successPath={successPath}
    />
  );
}
