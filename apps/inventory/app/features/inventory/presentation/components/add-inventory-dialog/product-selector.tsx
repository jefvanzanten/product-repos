import type { ReactNode } from "react";
import type { InventoryProduct } from "../../../domain/inventory";
import type { InventoryProductSearchState } from "../../hooks/use-inventory-product-search";
import styles from "./AddInventoryDialog.module.css";

/**
 * Render product search, results and the current selection.
 *
 * @param props - Product-search hook state.
 * @returns Product selector fields for the add form.
 */
export function ProductSelector({ search }: { readonly search: InventoryProductSearchState }): ReactNode {
  const normalizedInput = search.searchInput.trim();
  const resultsAreCurrent = search.requestQuery === normalizedInput;
  return (
    <>
      <label className={styles.field}>
        <span>Product</span>
        <input type="search" value={search.searchInput} placeholder="Zoek product of verpakking" autoComplete="off" maxLength={200} autoFocus onChange={(event) => search.updateSearch(event.target.value)} />
      </label>

      {normalizedInput.length >= 2 && (
        <div className={styles.results} aria-live="polite">
          {(search.isPending || !resultsAreCurrent) && <p>Producten zoeken…</p>}
          {!search.isPending && resultsAreCurrent && search.failed && <p className={styles.error}>Producten konden niet worden geladen.</p>}
          {!search.isPending && resultsAreCurrent && search.succeeded && search.results.length === 0 && <p>Geen producten gevonden</p>}
          {resultsAreCurrent && search.results.map((result) => <ProductResult key={result.productId} product={result} onSelect={search.selectProduct} />)}
        </div>
      )}

      <section className={styles.selection} aria-label="Gekozen product of verpakking">
        <span>Gekozen product/verpakking</span>
        {search.selectedProduct === null ? (
          <p>Nog geen product gekozen</p>
        ) : (
          <div>
            <strong>{search.selectedProduct.displayName}</strong>
            <span>{search.selectedProduct.categoryPath}</span>
            <button type="button" onClick={search.clearSelection}>Wijzigen</button>
          </div>
        )}
      </section>
    </>
  );
}

/** Render one selectable product-search result. */
function ProductResult({ product, onSelect }: { readonly product: InventoryProduct; readonly onSelect: (product: InventoryProduct) => void }): ReactNode {
  return (
    <button type="button" onClick={() => onSelect(product)}>
      <strong>{product.displayName}</strong>
      <span>{[product.brandName, product.packageSummary].filter(Boolean).join(" · ")}</span>
      {product.categoryPath && <small>{product.categoryPath}</small>}
    </button>
  );
}
