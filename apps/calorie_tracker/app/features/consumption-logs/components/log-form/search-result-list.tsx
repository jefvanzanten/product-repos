import type { ProductConsumptionLog, UnifiedSearchResult } from "@product-repos/contracts/calorie-tracker";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Icon } from "../../../../components/icon/icon";
import { ProductImage } from "../../../../components/product-image/product-image";
import type { ProductSearchMode } from "../../../../domain/consumption-types";
import { formatDecimal } from "../../../../domain/quantities";
import styles from "./log-form.module.css";

/** Combined-search row supplied to the list, tagged by kind. */
export type SearchResultItem = UnifiedSearchResult;

/** Stable selection key for one combined search row. */
export function consumableKey(result: UnifiedSearchResult): string {
  return result.kind === "PACKAGE" ? `package:${result.packageId}` : `dish:${result.id}`;
}

/**
 * Render recent/search consumable outcomes and the dish-creation entry point.
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
  createDishHref,
  onRetry,
  onSelect,
}: {
  readonly searchMode: ProductSearchMode;
  readonly isPending: boolean;
  readonly failed: boolean;
  readonly results: ReadonlyArray<UnifiedSearchResult>;
  readonly selectedKey: string | null;
  readonly editLog: ProductConsumptionLog | null;
  readonly createDishHref: string | null;
  readonly onRetry: () => void;
  readonly onSelect: (result: UnifiedSearchResult) => void;
}): ReactNode {
  const includesEditedPackage = editLog === null
    || results.some((result) => result.kind === "PACKAGE" && result.packageId === editLog.package.packageId);
  return (
    <section className={styles.results} aria-live="polite">
      <h2>{searchMode._tag === "Recent" ? "Recent gebruikt" : "Zoekresultaten"}</h2>
      {searchMode._tag === "TooShort" && <p>Typ minimaal twee tekens om te zoeken.</p>}
      {isPending && searchMode._tag !== "TooShort" && <p>Resultaten laden…</p>}
      {failed && <p>Zoeken lukt niet. <button type="button" onClick={onRetry}>Opnieuw proberen</button></p>}
      {searchMode._tag !== "TooShort" && !isPending && !failed && results.length === 0 && editLog === null && <p>Niets gevonden</p>}
      {editLog !== null && !includesEditedPackage && (
        <PackageRow
          result={{ kind: "PACKAGE", ...editLog.package }}
          selected
          onSelect={() => onSelect({ kind: "PACKAGE", ...editLog.package })}
        />
      )}
      {results.map((result) => (
        result.kind === "PACKAGE"
          ? (
            <PackageRow
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
      {editLog !== null && (editLog.package.productArchived || editLog.package.packageArchived) && (
        <p>Het huidige gearchiveerde product of de verpakking blijft beperkt bewerkbaar.</p>
      )}
      {createDishHref !== null && <Link className="ct-secondary" to={createDishHref}><Icon name="add" />Nieuw gerecht aanmaken</Link>}
    </section>
  );
}

/**
 * Render one selectable package search row.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
function PackageRow({
  result,
  selected,
  onSelect,
}: {
  readonly result: Extract<UnifiedSearchResult, { readonly kind: "PACKAGE" }>;
  readonly selected: boolean;
  readonly onSelect: () => void;
}): ReactNode {
  return (
    <button type="button" className={selected ? styles.selectedProduct : styles.productResult} onClick={onSelect}>
      <ProductImage type={result.consumptionType} imageUrl={result.imageUrl} />
      <span>
        <strong>{result.productName}{result.brand === null ? "" : ` · ${result.brand.name}`}</strong>
        <small>{result.summary}</small>
      </span>
      <Icon name={selected ? "check" : "chevron-right"} />
    </button>
  );
}

/**
 * Render one selectable dish search row with derived calories per serving.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
function DishRow({
  result,
  selected,
  onSelect,
}: {
  readonly result: Extract<UnifiedSearchResult, { readonly kind: "DISH" }>;
  readonly selected: boolean;
  readonly onSelect: () => void;
}): ReactNode {
  const calories = result.caloriesPerServing === null ? null : `${formatDecimal(result.caloriesPerServing, 0)} kcal per portie`;
  return (
    <button type="button" className={selected ? styles.selectedProduct : styles.productResult} onClick={onSelect}>
      <ProductImage type="FOOD" imageUrl={result.imageUrl} />
      <span>
        <strong>{result.name}</strong>
        <small>Gerecht · {result.servings.replace(".", ",")} porties{calories === null ? "" : ` · ${calories}`}</small>
      </span>
      <Icon name={selected ? "check" : "chevron-right"} />
    </button>
  );
}
