import { LoginPage } from "@product-repos/auth-client/login-page";
import { lookupSession } from "@product-repos/auth-client/session.server";
import { redirect, type LoaderFunctionArgs } from "react-router";
import { authClient } from "../auth-client";

/** Redirect an already authenticated visitor away from the login page. */
export async function loader({ request }: LoaderFunctionArgs) {
  const result = await lookupSession(request);
  if (result._tag === "Authenticated") throw redirect("/");
  if (result._tag === "Unavailable") {
    throw new Response("Authenticatie is tijdelijk niet beschikbaar.", { status: result.status });
  }
  return null;
}

/** Render the shared login page with Inventory content and styling. */
export default function LoginRoute(): React.ReactNode {
  return (
    <LoginPage
      appearance="light"
      appName="Inventory"
      authClient={authClient}
      intro="Log in om de voorraadapplicatie te openen."
    />
  );
}
