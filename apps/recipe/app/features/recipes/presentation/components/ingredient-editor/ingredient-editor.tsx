import { packageEquivalent } from "../../../domain/package-equivalent";
import type { RecipeInputMode } from "../../../domain/recipe";
import type { IngredientDraft } from "../../types/recipe-form.types";

/** Ingredient editor list properties. */
type IngredientEditorProps = {
  readonly ingredients: ReadonlyArray<IngredientDraft>;
  readonly onChange: (index: number, patch: Partial<IngredientDraft>) => void;
  readonly onRemove: (index: number) => void;
};

/** Render quantity and unit controls for selected recipe ingredients. */
export function IngredientEditor({ ingredients, onChange, onRemove }: IngredientEditorProps): React.ReactNode {
  if (ingredients.length === 0) {
    return <p className="ingredient-placeholder">Nog geen ingrediënten toegevoegd.</p>;
  }

  /** Select one serialized quantity mode and its linked unit identifier. */
  function selectMode(index: number, serialized: string): void {
    const [inputMode, unitId] = serialized.split(":");
    if (!isRecipeInputMode(inputMode)) return;
    onChange(index, { inputMode, inputUnitTypeId: unitId ? Number(unitId) : null });
  }

  return (
    <ol className="ingredient-editor-list">
      {ingredients.map((ingredient, index) => {
        const equivalent = packageEquivalent(ingredient);
        return (
          <li key={ingredient.productId}>
            <div className="ingredient-name"><span>{index + 1}</span><strong>{ingredient.displayName}</strong></div>
            {ingredient.productArchived && (
              <p className="archive-warning">Dit product is gearchiveerd. Verwijder en vervang het om op te slaan.</p>
            )}
            <label className="field compact">
              <span>Hoeveelheid</span>
              <input
                inputMode="decimal"
                value={ingredient.quantity}
                onChange={(event) => onChange(index, { quantity: event.target.value })}
                required
              />
            </label>
            <label className="field compact">
              <span>Eenheid</span>
              <select
                value={`${ingredient.inputMode}:${ingredient.inputUnitTypeId ?? ""}`}
                onChange={(event) => selectMode(index, event.target.value)}
              >
                {ingredient.modes.map((mode) => (
                  <option
                    key={`${mode.inputMode}-${mode.unitType?.id ?? "none"}`}
                    value={`${mode.inputMode}:${mode.unitType?.id ?? ""}`}
                  >
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>
            {equivalent && <small className="package-equivalent">{equivalent}</small>}
            <button className="remove-button" type="button" onClick={() => onRemove(index)}>Verwijderen</button>
          </li>
        );
      })}
    </ol>
  );
}

/** Return whether an untrusted value is a supported ingredient input mode. */
function isRecipeInputMode(value: string | undefined): value is RecipeInputMode {
  return value === "FULL_PRODUCT" || value === "PRODUCT_PORTION" || value === "CONTENT_UNIT";
}
