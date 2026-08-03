import type { ConsumptionLog, PackageSearchResult } from "@product-repos/contracts/calorie-tracker";
import type { ReactNode } from "react";
import { Icon } from "../../components/icon/icon";
import { ProductImage } from "../../components/product-image/product-image";
import type { ProductSearchMode } from "../../domain/consumption-types";
import styles from "./log-form.module.css";

/** Render recent/search package outcomes and retain an archived edit selection. */
export function PackageSearch({
  searchMode,
  isPending,
  failed,
  packages,
  selectedPackageId,
  editLog,
  onRetry,
  onSelect,
}: {
  readonly searchMode: ProductSearchMode;
  readonly isPending: boolean;
  readonly failed: boolean;
  readonly packages: ReadonlyArray<PackageSearchResult>;
  readonly selectedPackageId: number | undefined;
  readonly editLog: ConsumptionLog | null;
  readonly onRetry: () => void;
  readonly onSelect: (productPackage: PackageSearchResult) => void;
}): ReactNode {
  const includesEditedPackage = editLog === null
    || packages.some((productPackage) => productPackage.packageId === editLog.package.packageId);
  return (
    <section className={styles.results} aria-live="polite">
      <h2>{searchMode._tag === "Recent" ? "Recent gebruikt" : "Zoekresultaten"}</h2>
      {searchMode._tag === "TooShort" && <p>Typ minimaal twee tekens om te zoeken.</p>}
      {isPending && searchMode._tag !== "TooShort" && <p>Producten laden…</p>}
      {failed && <p>Producten laden lukt niet. <button type="button" onClick={onRetry}>Opnieuw proberen</button></p>}
      {searchMode._tag !== "TooShort" && !isPending && !failed && packages.length === 0 && editLog === null && <p>Product niet gevonden</p>}
      {editLog !== null && !includesEditedPackage && (
        <PackageOption
          productPackage={editLog.package}
          selected
          onSelect={() => onSelect(editLog.package)}
        />
      )}
      {packages.map((productPackage) => (
        <PackageOption
          key={productPackage.packageId}
          productPackage={productPackage}
          selected={selectedPackageId === productPackage.packageId}
          onSelect={() => onSelect(productPackage)}
        />
      ))}
      {editLog !== null && (editLog.package.productArchived || editLog.package.packageArchived) && (
        <p>Het huidige gearchiveerde product of de verpakking blijft beperkt bewerkbaar.</p>
      )}
    </section>
  );
}

/** Render one selectable package search row. */
function PackageOption({
  productPackage,
  selected,
  onSelect,
}: {
  readonly productPackage: PackageSearchResult;
  readonly selected: boolean;
  readonly onSelect: () => void;
}): ReactNode {
  return (
    <button type="button" className={selected ? styles.selectedProduct : styles.productResult} onClick={onSelect}>
      <ProductImage type={productPackage.consumptionType} imageUrl={productPackage.imageUrl} />
      <span>
        <strong>{productPackage.productName}{productPackage.brand === null ? "" : ` · ${productPackage.brand.name}`}</strong>
        <small>{productPackage.summary}</small>
      </span>
      <Icon name={selected ? "check" : "chevron-right"} />
    </button>
  );
}
