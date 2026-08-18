import type { ConsumptionType } from "../../../../../core/domain/consumption-types";
import type { ProductConsumptionLog, UnifiedSearchResult } from "../../../domain/consumption-log";
import type { ReactNode } from "react";
import { Icon } from "../../../../../core/presentation/components/icon/icon";
import { ProductImage } from "../../../../../core/presentation/components/product-image/product-image";
import type { ProductSearchMode } from "./product-search";
import styles from "./search-result-list.module.css";

/** Combined-search row supplied to the list, tagged by kind. */
export type SearchResultItem = UnifiedSearchResult;

interface SearchResultListProps {
  readonly searchMode: ProductSearchMode;
  readonly isPending: boolean;
  readonly failed: boolean;
  readonly results: ReadonlyArray<UnifiedSearchResult>;
  readonly selectedKey: string | null;
  readonly editLog: ProductConsumptionLog | null;
  readonly onRetry: () => void;
  readonly onSelect: (result: UnifiedSearchResult) => void;
}

/**
 * Render recent and searched consumable outcomes.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function SearchResultList({
  searchMode,
  isPending,
  failed,
  results,
  selectedKey,
  editLog,
  onRetry,
  onSelect,
}: SearchResultListProps): ReactNode {
  const includesEditedProduct = editLog === null
    || results.some((result) => result.kind === "PRODUCT" && result.productId === editLog.product.productId);
  return (
    <section className={styles.results} aria-live="polite" data-has-selection={selectedKey !== null}>
      <h2>{searchMode.tag === "Recent" ? "Recent gebruikt" : "Zoekresultaten"}</h2>
      {searchMode.tag === "TooShort" && <p>Typ minimaal twee tekens om te zoeken.</p>}
      {isPending && searchMode.tag !== "TooShort" && <p>Resultaten laden…</p>}
      {failed && <p>Zoeken lukt niet. <button type="button" onClick={onRetry}>Opnieuw proberen</button></p>}
      {searchMode.tag !== "TooShort" && !isPending && !failed && results.length === 0 && editLog === null && <p>Niets gevonden</p>}
      {editLog !== null && !includesEditedProduct && (
        <ProductRow
          result={{ kind: "PRODUCT", ...editLog.product }}
          selected
          onSelect={() => onSelect({ kind: "PRODUCT", ...editLog.product })}
        />
      )}
      {results.map((result) => (
        result.kind === "PRODUCT"
          ? (
            <ProductRow
              key={consumableKey(result)}
              result={result}
              selected={selectedKey === consumableKey(result)}
              onSelect={() => onSelect(result)}
            />
          )
          : (
            <DishRow
              key={consumableKey(result)}
              result={result}
              selected={selectedKey === consumableKey(result)}
              onSelect={() => onSelect(result)}
            />
          )
      ))}
      {editLog?.product.archived && (
        <p>Het huidige gearchiveerde product blijft beperkt bewerkbaar.</p>
      )}
    </section>
  );
}

interface ResultRowProps {
  readonly imageType: ConsumptionType;
  readonly imageUrl: string | null;
  readonly title: ReactNode;
  readonly subtitle: ReactNode;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

/**
 * Render the shared structure of a selectable search-result row.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
function ResultRow({
  imageType,
  imageUrl,
  title,
  subtitle,
  selected,
  onSelect,
}: ResultRowProps): ReactNode {
  return (
    <div className={selected ? styles.selectedProduct : styles.productResult}>
      <button type="button" className={styles.resultMain} onClick={onSelect}>
        <ProductImage type={imageType} imageUrl={imageUrl} />
        <span>
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
      </button>
      {selected && <span className={styles.selectionIndicator}><Icon name="check" /></span>}
    </div>
  );
}

interface ProductRowProps {
  readonly result: Extract<UnifiedSearchResult, { readonly kind: "PRODUCT" }>;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

/**
 * Map concrete-product data to a selectable search-result row.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
function ProductRow({ result, selected, onSelect }: ProductRowProps): ReactNode {
  return (
    <ResultRow
      imageType={result.consumptionType}
      imageUrl={result.imageUrl}
      title={result.displayName}
      subtitle={result.packageSummary}
      selected={selected}
      onSelect={onSelect}
    />
  );
}

interface DishRowProps {
  readonly result: Extract<UnifiedSearchResult, { readonly kind: "DISH" }>;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

/**
 * Map accessible dish data to a selectable search-result row.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
function DishRow({ result, selected, onSelect }: DishRowProps): ReactNode {
  return (
    <ResultRow
      imageType="FOOD"
      imageUrl={result.imageUrl}
      title={result.name}
      subtitle={`Gerecht · ${result.servings.replace(".", ",")} porties${result.isOwnedByViewer || result.makerDisplayName === null ? "" : ` · door ${result.makerDisplayName}`}`}
      selected={selected}
      onSelect={onSelect}
    />
  );
}

/** Stable selection key for one combined search row. */
function consumableKey(result: UnifiedSearchResult): string {
  return result.kind === "PRODUCT" ? `product:${result.productId}` : `dish:${result.id}`;
}
