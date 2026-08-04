import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import styles from "./root.module.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

/**
 * Render the Dutch Inventory document shell.
 *
 * @param props - Document children rendered inside the shared HTML shell.
 * @returns The Inventory HTML document.
 */
export function Layout({ children }: { readonly children: React.ReactNode }): React.ReactNode {
  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Provide application-wide server-state caching and render the active route.
 *
 * @returns The application query provider and active route outlet.
 */
export default function App(): React.ReactNode {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

/**
 * Render route failures at the Inventory boundary.
 *
 * @param props - Route error captured by React Router.
 * @returns The localized route failure page.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps): React.ReactNode {
  let message = "Er ging iets mis";
  let details = "Er is een onverwachte fout opgetreden.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Pagina niet gevonden" : "Routefout";
    details = error.status === 404
      ? "De gevraagde pagina kon niet worden gevonden."
      : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className={styles.errorPage}>
      <h1 className={styles.errorTitle}>{message}</h1>
      <p className={styles.errorDetails}>{details}</p>
      {stack && <pre className={styles.errorStack}><code>{stack}</code></pre>}
    </main>
  );
}
