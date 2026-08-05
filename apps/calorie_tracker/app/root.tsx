import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import "./app.css";

/**
 * Render the Calorie Tracker document shell.
 *
 * @param props - Children rendered by React Router.
 * @returns The complete HTML document.
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
 * Render the active Calorie Tracker route.
 *
 * @returns The active Calorie Tracker route.
 */
export default function App(): React.ReactNode {
  return <Outlet />;
}

/**
 * Render route failures at the application boundary.
 *
 * @param props - React Router error boundary properties.
 * @returns A user-facing error page.
 */
export function ErrorBoundary({ error }: { readonly error: unknown }): React.ReactNode {
  let title = "Er ging iets mis";
  let details = "Er is een onverwachte fout opgetreden.";

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Pagina niet gevonden" : "Routefout";
    details = error.statusText || details;
  } else if (error instanceof Error && import.meta.env.DEV) {
    details = error.message;
  }

  return (
    <main className="route-error">
      <h1>{title}</h1>
      <p>{details}</p>
    </main>
  );
}
