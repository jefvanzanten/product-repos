import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { optionalUser } from "./core/presentation/auth/auth.server";
import { recipeListPath } from "./core/presentation/routing/recipe-routes";
import { RecipeShell } from "./core/presentation/shell/recipe-shell";
import "./app.css";

/** Load the optional application identity for shared navigation. */
export async function loader({ request }: LoaderFunctionArgs) {
  return { user: await optionalUser(request) };
}

/**
 * Render the complete Dutch HTML document.
 *
 * @param properties - React Router document properties.
 * @returns The complete Recipe document.
 */
export function Layout({ children }: { readonly children: React.ReactNode }): React.ReactNode {
  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f7f2e8" />
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

/** Render the Recipe application shell and active route. */
export default function App(): React.ReactNode {
  const { user } = useLoaderData<typeof loader>();
  return <RecipeShell user={user} />;
}

/**
 * Render route failures without distinguishing inaccessible recipes.
 *
 * @param properties - React Router error boundary properties.
 * @returns A neutral user-facing error page.
 */
export function ErrorBoundary({ error }: { readonly error: unknown }): React.ReactNode {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="state-page">
      <p className="eyebrow">{notFound ? "404" : "Oeps"}</p>
      <h1>{notFound ? "Recept niet gevonden" : "Er ging iets mis"}</h1>
      <p>{notFound ? "Deze pagina bestaat niet of is niet beschikbaar." : "Probeer het later opnieuw."}</p>
      <Link className="button button-primary" to={recipeListPath()}>Naar alle recepten</Link>
    </main>
  );
}
