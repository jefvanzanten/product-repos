import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { productInputOptionsPath, toRecipePublicPath } from "../../../../../core/presentation/routing/recipe-routes";
import { getRecipeInputOptionsInBrowser } from "../../../data/recipe-resource-api";
import type {
  RecipeDetail,
  RecipeIngredientInputOptions,
  RecipeProductSearchResult,
  RecipeVisibility,
} from "../../../domain/recipe";
import { recipeInputModeLabel } from "../../formatting/recipe-formatting";
import type { IngredientDraft, RecipeFormProps } from "../../types/recipe-form.types";
import { IngredientEditor } from "../ingredient-editor/ingredient-editor";
import { ProductPicker } from "../product-picker/product-picker";

/** Render the accessible create/edit recipe editor. */
export function RecipeForm({ recipe, initialOptions = {}, error, fieldErrors }: RecipeFormProps): React.ReactNode {
  const [name, setName] = useState(recipe?.name ?? "");
  const [visibility, setVisibility] = useState<RecipeVisibility>(recipe?.visibility ?? "PRIVATE");
  const [servings, setServings] = useState(recipe?.servings ?? "1");
  const [instructions, setInstructions] = useState(recipe?.instructions ?? "");
  const [ingredients, setIngredients] = useState<ReadonlyArray<IngredientDraft>>(
    () => createInitialIngredients(recipe, initialOptions),
  );
  const [productError, setProductError] = useState<string | null>(null);
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  /** Add a selected catalog product with its valid quantity modes. */
  async function addProduct(product: RecipeProductSearchResult): Promise<boolean> {
    if (ingredients.some((ingredient) => ingredient.productId === product.productId)) {
      setProductError("Dit product staat al in het recept.");
      return false;
    }

    try {
      const options = await getRecipeInputOptionsInBrowser(toRecipePublicPath(productInputOptionsPath(product.productId)));
      const firstMode = options.modes[0];
      if (firstMode === undefined) throw new Error("No input modes");
      setIngredients((current) => [...current, {
        productId: product.productId,
        displayName: product.displayName,
        productArchived: false,
        modes: options.modes,
        package: options.package,
        quantity: "1",
        inputMode: firstMode.inputMode,
        inputUnitTypeId: firstMode.unitType?.id ?? null,
      }]);
      setProductError(null);
      return true;
    } catch {
      setProductError("Eenheden ophalen lukt nu niet.");
      return false;
    }
  }

  /** Replace one ingredient draft after a field interaction. */
  function updateIngredient(index: number, patch: Partial<IngredientDraft>): void {
    setIngredients((current) => current.map((ingredient, currentIndex) => (
      currentIndex === index ? { ...ingredient, ...patch } : ingredient
    )));
  }

  /** Remove one ingredient draft by its rendered index. */
  function removeIngredient(index: number): void {
    setIngredients((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  const payload = serializeRecipeForm({ name, visibility, servings, instructions, ingredients });
  const hasArchivedIngredient = ingredients.some((ingredient) => ingredient.productArchived);

  return (
    <Form className="recipe-form" method="post">
      <input name="payload" type="hidden" value={payload} />
      {recipe && <input name="expectedUpdatedAt" type="hidden" value={recipe.updatedAt} />}
      <section className="form-section">
        <div className="form-section-heading"><span>01</span><div><h2>De basis</h2><p>Geef je recept een herkenbare naam.</p></div></div>
        <div className="form-grid">
          <label className="field field-wide">
            <span>Naam</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} autoFocus />
            {fieldErrors?.name && <small className="field-error">{fieldErrors.name}</small>}
          </label>
          <label className="field">
            <span>Zichtbaarheid</span>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value === "PUBLIC" ? "PUBLIC" : "PRIVATE")}>
              <option value="PRIVATE">Privé</option>
              <option value="PUBLIC">Publiek</option>
            </select>
          </label>
          <label className="field">
            <span>Aantal porties</span>
            <input inputMode="decimal" value={servings} onChange={(event) => setServings(event.target.value)} required />
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-heading"><span>02</span><div><h2>Ingrediënten</h2><p>Zoek concrete producten en kies de juiste hoeveelheid.</p></div></div>
        <ProductPicker onSelect={addProduct} onQueryChange={() => setProductError(null)} error={productError} />
        <IngredientEditor ingredients={ingredients} onChange={updateIngredient} onRemove={removeIngredient} />
        {fieldErrors?.ingredients && <p className="field-error">{fieldErrors.ingredients}</p>}
      </section>

      <section className="form-section">
        <div className="form-section-heading"><span>03</span><div><h2>Bereiding</h2><p>Vrije tekst voor je werkwijze.</p></div></div>
        <label className="field field-wide">
          <span>Instructies <em>optioneel</em></span>
          <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={8} placeholder="Beschrijf de bereiding…" />
        </label>
      </section>

      {(error || hasArchivedIngredient) && (
        <p className="form-error" role="alert">{error ?? "Vervang alle gearchiveerde ingrediënten voordat je opslaat."}</p>
      )}
      <div className="form-actions">
        <button className="button button-primary" disabled={busy || hasArchivedIngredient} type="submit">
          {busy ? "Opslaan…" : recipe ? "Wijzigingen opslaan" : "Recept opslaan"}
        </button>
      </div>
    </Form>
  );
}

/** Build editable ingredient drafts from an optional existing recipe. */
function createInitialIngredients(
  recipe: RecipeDetail | undefined,
  initialOptions: Readonly<Record<string, RecipeIngredientInputOptions>>,
): ReadonlyArray<IngredientDraft> {
  return recipe?.ingredients.map((ingredient) => ({
    productId: ingredient.productId,
    displayName: ingredient.displayName,
    productArchived: ingredient.productArchived,
    modes: initialOptions[ingredient.productId]?.modes ?? [{
      inputMode: ingredient.inputMode,
      unitType: ingredient.inputUnitType,
      label: ingredient.inputUnitType?.name ?? recipeInputModeLabel(ingredient.inputMode),
    }],
    package: initialOptions[ingredient.productId]?.package ?? null,
    quantity: ingredient.quantity,
    inputMode: ingredient.inputMode,
    inputUnitTypeId: ingredient.inputUnitType?.id ?? null,
  })) ?? [];
}

/** Serialize controlled editor state for server-side validation. */
function serializeRecipeForm(input: {
  readonly name: string;
  readonly visibility: RecipeVisibility;
  readonly servings: string;
  readonly instructions: string;
  readonly ingredients: ReadonlyArray<IngredientDraft>;
}): string {
  return JSON.stringify({
    name: input.name,
    visibility: input.visibility,
    servings: input.servings.replace(",", "."),
    instructions: input.instructions.trim() || null,
    ingredients: input.ingredients.map((ingredient) => ({
      productId: ingredient.productId,
      quantity: ingredient.quantity.replace(",", "."),
      inputMode: ingredient.inputMode,
      inputUnitTypeId: ingredient.inputUnitTypeId,
    })),
  });
}
