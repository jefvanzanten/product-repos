import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import "./app.css";
import styles from "./root.module.css";

/**
 * Render the Product Management Admin document shell.
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

/** Render the active Product Management Admin route. */
export default function App(): React.ReactNode {
  return <Outlet />;
}

/**
 * Render route failures at the Product Management Admin boundary.
 *
 * @param props - React Router route error.
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
    <main className={styles.errorPage}>
      <h1 className={styles.errorTitle}>{title}</h1>
      <p className={styles.errorDetails}>{details}</p>
    </main>
  );
}
