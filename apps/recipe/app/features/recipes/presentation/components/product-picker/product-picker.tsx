import { useRef, useState } from "react";
import { productSearchPath, toRecipePublicPath } from "../../../../../core/presentation/routing/recipe-routes";
import type { RecipeProductSearchResult } from "../../../domain/recipe";
import { searchRecipeProductsInBrowser } from "../../../data/recipe-resource-api";

/** Product picker properties. */
type ProductPickerProps = {
  readonly onSelect: (product: RecipeProductSearchResult) => Promise<boolean>;
  readonly onQueryChange: () => void;
  readonly error: string | null;
};

/** Render product autocomplete with stale-request protection. */
export function ProductPicker({ onSelect, onQueryChange, error }: ProductPickerProps): React.ReactNode {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReadonlyArray<RecipeProductSearchResult>>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const latestSearch = useRef(0);

  /** Search the product catalog after a user input event. */
  async function handleQuery(value: string): Promise<void> {
    setQuery(value);
    onQueryChange();
    const sequence = ++latestSearch.current;
    const normalized = value.trim();
    if (normalized.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    setSearching(true);
    try {
      const nextResults = await searchRecipeProductsInBrowser(toRecipePublicPath(productSearchPath(normalized)));
      if (sequence !== latestSearch.current) return;
      setResults(nextResults);
      setSearchError(null);
    } catch {
      if (sequence !== latestSearch.current) return;
      setResults([]);
      setSearchError("Producten zoeken lukt nu niet.");
    } finally {
      if (sequence === latestSearch.current) setSearching(false);
    }
  }

  /** Select a result and clear autocomplete after successful addition. */
  async function selectProduct(product: RecipeProductSearchResult): Promise<void> {
    if (!await onSelect(product)) return;
    setQuery("");
    setResults([]);
  }

  return (
    <div className="product-picker">
      <label className="field field-wide">
        <span>Product toevoegen</span>
        <input
          type="search"
          value={query}
          onChange={(event) => void handleQuery(event.target.value)}
          placeholder="Typ minimaal 2 letters"
          autoComplete="off"
        />
      </label>
      {searching && <p className="subtle">Zoeken…</p>}
      {(error ?? searchError) && <p className="field-error" role="alert">{error ?? searchError}</p>}
      {results.length > 0 && (
        <ul className="autocomplete" aria-label="Productresultaten">
          {results.map((product) => (
            <li key={product.productId}>
              <button type="button" onClick={() => void selectProduct(product)}>
                <strong>{product.displayName}</strong>
                <span>{product.packageSummary}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
