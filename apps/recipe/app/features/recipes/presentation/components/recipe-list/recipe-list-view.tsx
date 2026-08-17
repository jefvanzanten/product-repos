import { Form, Link } from "react-router";
import { newRecipePath, recipeDetailPath } from "../../../../../core/presentation/routing/recipe-routes";
import { formatRecipeDate } from "../../formatting/recipe-formatting";
import type { RecipeListViewProps } from "../../types/recipe-list.types";

/** Render searchable and sortable recipe cards for public and owner pages. */
export function RecipeListView(props: RecipeListViewProps): React.ReactNode {
  return (
    <main className="page page-list">
      <section className="page-heading">
        <p className="eyebrow">Vind iets lekkers</p>
        <h1>{props.title}</h1>
        <p>Heldere recepten, echte ingrediënten en alle ruimte voor je eigen bereidingswijze.</p>
      </section>
      <Form className="filter-bar" method="get" role="search">
        <label className="search-field">
          <span className="sr-only">Zoek op receptnaam</span>
          <span aria-hidden="true">⌕</span>
          <input name="query" type="search" defaultValue={props.query} placeholder="Zoek een recept" />
        </label>
        <label>
          <span className="sr-only">Sortering</span>
          <select name="sort" defaultValue={props.sort}>
            <option value="newest">Nieuwste eerst</option>
            <option value="oldest">Oudste eerst</option>
            <option value="name">Naam A–Z</option>
          </select>
        </label>
        {props.showArchivedFilter && (
          <label className="check-filter">
            <input name="archived" value="true" type="checkbox" defaultChecked={props.archived} />
            Gearchiveerd
          </label>
        )}
        <button className="button button-primary" type="submit">Toepassen</button>
      </Form>
      {props.page.items.length === 0 ? (
        <section className="empty-state">
          <span className="empty-icon" aria-hidden="true">◇</span>
          <h2>Geen recepten gevonden</h2>
          <p>{props.emptyOwnerList ? "Maak je eerste recept en houd al je favorieten bij elkaar." : "Pas je zoekopdracht of filters aan."}</p>
          {props.emptyOwnerList && <Link className="button button-primary" to={newRecipePath()}>Eerste recept maken</Link>}
        </section>
      ) : (
        <ul className="recipe-grid">
          {props.page.items.map((recipe, index) => (
            <li key={recipe.id}>
              <Link className="recipe-card" to={recipeDetailPath(recipe.userId, recipe.id)}>
                <span className="card-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{recipe.name}</h2>
                  <p>Door {recipe.makerDisplayName ?? "Anonieme maker"}</p>
                </div>
                <div className="card-meta">
                  {recipe.visibility === "PRIVATE" && <span className="status-badge">Privé</span>}
                  {recipe.archivedAt !== null && <span className="status-badge status-muted">Gearchiveerd</span>}
                  <time dateTime={recipe.createdAt}>{formatRecipeDate(recipe.createdAt)}</time>
                  <span aria-hidden="true">→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {props.page.hasMore && props.page.cursor && (
        <div className="load-more">
          <Link className="button button-secondary" to={nextPageSearch(props, props.page.cursor)}>Meer recepten</Link>
        </div>
      )}
    </main>
  );
}

/** Preserve list filters while opening the next cursor page. */
function nextPageSearch(props: RecipeListViewProps, cursor: string): string {
  const search = new URLSearchParams({ sort: props.sort, cursor });
  if (props.query) search.set("query", props.query);
  if (props.archived) search.set("archived", "true");
  return `?${search.toString()}`;
}
