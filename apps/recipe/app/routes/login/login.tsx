import { LoginPage } from "@product-repos/auth-client/login-page";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { authClient } from "../../core/data/auth/auth-client";
import { loadLoginRoute } from "./login-route.server";

/** Load a safe login return destination. */
export function loader(args: LoaderFunctionArgs) {
  return loadLoginRoute(args);
}

/** Render the shared light Recipe login experience. */
export default function LoginRoute(): React.ReactNode {
  const { returnTo } = useLoaderData<typeof loader>();
  return (
    <LoginPage
      appearance="light"
      appName="Recepten"
      authClient={authClient}
      intro="Log in om je eigen recepten te maken en beheren."
      successPath={returnTo}
    />
  );
}
