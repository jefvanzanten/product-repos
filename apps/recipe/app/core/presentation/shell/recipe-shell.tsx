import type { AuthenticatedUser } from "@product-repos/auth-client/session.server";
import { SessionMonitor } from "@product-repos/auth-client/session-monitor";
import { Link, Outlet, useNavigate } from "react-router";
import { authClient } from "../../data/auth/auth-client";
import {
  loginPath,
  newRecipePath,
  recipeListPath,
  RECIPE_BASE_PATH,
  toRecipePublicPath,
  userRecipesPath,
} from "../routing/recipe-routes";

/** Properties needed by the application-wide Recipe shell. */
type RecipeShellProps = {
  readonly user: AuthenticatedUser | null;
};

/** Render the shared Recipe navigation, active route, and footer. */
export function RecipeShell({ user }: RecipeShellProps): React.ReactNode {
  return (
    <div className="app-shell">
      {user && (
        <SessionMonitor
          appBasePath={RECIPE_BASE_PATH}
          authClient={authClient}
          loginPath={toRecipePublicPath(loginPath())}
        />
      )}
      <header className="site-header">
        <Link className="brand" to={recipeListPath()} aria-label="Recepten overzicht">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>Recepten</span>
        </Link>
        <nav className="main-nav" aria-label="Hoofdnavigatie">
          <Link to={recipeListPath()}>Alle recepten</Link>
          {user && <Link to={userRecipesPath(user.id)}>Mijn recepten</Link>}
          {user ? <UserNavigation /> : <Link className="button button-quiet" to={loginPath()}>Inloggen</Link>}
        </nav>
      </header>
      <Outlet context={{ user }} />
      <footer className="site-footer">Recepten om te bewaren, te delen en samen te maken.</footer>
    </div>
  );
}

/** Render the authenticated create and sign-out actions. */
function UserNavigation(): React.ReactNode {
  const navigate = useNavigate();

  /** End the browser session and return to the public overview. */
  async function signOut(): Promise<void> {
    await authClient.signOut();
    await navigate(recipeListPath());
    window.location.reload();
  }

  return (
    <>
      <Link className="button button-primary" to={newRecipePath()}>Nieuw recept</Link>
      <button className="link-button" type="button" onClick={() => void signOut()}>Uitloggen</button>
    </>
  );
}
