import { redirectToSessionLogin } from "@product-repos/auth-client/session-monitor";

/** Redirect the active browser to the Inventory login after API session expiry. */
export function redirectExpiredInventorySession(): void {
  redirectToSessionLogin({
    appBasePath: "/inventory",
    loginPath: "/inventory/login",
  });
}
