import { Form, Link, useNavigation } from "react-router";
import { recipeEditPath, recipeListPath, userRecipesPath } from "../../../../../core/presentation/routing/recipe-routes";
import type { RecipeDetail } from "../../../domain/recipe";
import { formatRecipeDecimal, recipeInputModeLabel } from "../../formatting/recipe-formatting";

/** Recipe detail page properties. */
type RecipeDetailPageProps = {
  readonly recipe: RecipeDetail;
  readonly owner: boolean;
  readonly actionError?: string;
};

/** Render recipe content and available owner controls. */
export function RecipeDetailPage({ recipe, owner, actionError }: RecipeDetailPageProps): React.ReactNode {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <main className="page detail-page">
      <Link className="back-link" to={owner ? userRecipesPath(recipe.userId) : recipeListPath()}>← Terug naar recepten</Link>
      <article className="recipe-detail">
        <header className="detail-header">
          <div>
            <p className="eyebrow">Recept van {recipe.makerDisplayName ?? "Anonieme maker"}</p>
            <h1>{recipe.name}</h1>
            <div className="detail-facts">
              <span><strong>{formatRecipeDecimal(recipe.servings)}</strong> porties</span>
              <span>{recipe.visibility === "PUBLIC" ? "Publiek" : "Privé"}</span>
              {recipe.archivedAt !== null && <span>Gearchiveerd</span>}
            </div>
          </div>
          <span className="detail-monogram" aria-hidden="true">{recipe.name.slice(0, 1).toUpperCase()}</span>
        </header>

        <section className="detail-section">
          <p className="section-number">01</p>
          <div>
            <h2>Ingrediënten</h2>
            <ul className="ingredient-list">
              {recipe.ingredients.map((ingredient) => (
                <li key={`${ingredient.productId}-${ingredient.quantity}`}>
                  <span>{ingredient.displayName}{ingredient.productArchived && <em> · gearchiveerd product</em>}</span>
                  <strong>{formatRecipeDecimal(ingredient.quantity)} {ingredient.inputUnitType?.symbol ?? recipeInputModeLabel(ingredient.inputMode)}</strong>
                  {ingredient.inputMode === "FULL_PRODUCT" && Number(ingredient.quantity) >= 1 && (
                    <small>{formatRecipeDecimal(ingredient.quantity)} volledige {Number(ingredient.quantity) === 1 ? "verpakking" : "verpakkingen"}</small>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {recipe.instructions && (
          <section className="detail-section">
            <p className="section-number">02</p>
            <div><h2>Bereiding</h2><p className="instructions">{recipe.instructions}</p></div>
          </section>
        )}

        {actionError && <p className="form-error detail-action-error" role="alert">{actionError}</p>}
        {owner && (
          <section className="owner-actions" aria-label="Recept beheren">
            {recipe.ownerActions.canEdit && (
              <Link className="button button-primary" to={recipeEditPath(recipe.userId, recipe.id)}>Recept bewerken</Link>
            )}
            {recipe.ownerActions.canEdit && (
              <Form method="post">
                <button className="button button-secondary" name="intent" value="visibility" disabled={busy} type="submit">
                  Maak {recipe.visibility === "PUBLIC" ? "privé" : "publiek"}
                </button>
              </Form>
            )}
            {recipe.ownerActions.canArchive && (
              <Form method="post" onSubmit={(event) => { if (!window.confirm("Wil je dit recept archiveren?")) event.preventDefault(); }}>
                <button className="button button-danger" name="intent" value="archive" disabled={busy} type="submit">Archiveren</button>
              </Form>
            )}
            {recipe.ownerActions.canRestore && (
              <Form method="post"><button className="button button-primary" name="intent" value="restore" disabled={busy} type="submit">Herstellen</button></Form>
            )}
          </section>
        )}
      </article>
    </main>
  );
}
