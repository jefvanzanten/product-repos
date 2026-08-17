import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import type { Brand } from "../../../../domain/product-catalog";
import { useAdminPath } from "../../../../../../core/presentation/routing/admin-source-context";
import {
  dedupeBrands,
  filterBrandSuggestions,
  findBrandNameById,
  normalizeBrandName,
} from "../../utils/brand-suggestions";
import styles from "./brand-combobox.module.css";

type BrandLookupData = {
  readonly brandQuery: string;
  readonly brands: ReadonlyArray<Brand>;
};

type BrandComboboxProps = {
  readonly defaultBrandId?: string;
  readonly defaultBrandName?: string;
  readonly defaultQuery?: string;
  readonly error?: string;
  readonly initialBrands: ReadonlyArray<Brand>;
};

/**
 * Render a brand search field that supports selecting or creating a brand.
 *
 * @param props - Initial brand values, available brands, and validation error.
 * @returns The brand combobox form fields.
 */
export function BrandCombobox({ defaultBrandId, defaultBrandName, defaultQuery, error, initialBrands }: BrandComboboxProps): React.ReactNode {
  const fetcher = useFetcher<BrandLookupData>();
  const [inputValue, setInputValue] = useState(defaultBrandName || defaultQuery || findBrandNameById(initialBrands, defaultBrandId) || "");
  const [selectedBrandId, setSelectedBrandId] = useState(defaultBrandName ? "" : (defaultBrandId ?? ""));
  const [newBrandName, setNewBrandName] = useState(defaultBrandName ?? "");
  const [open, setOpen] = useState(false);
  const trimmedInput = inputValue.trim();
  const fetchedBrandsForInput = fetcher.data?.brandQuery === trimmedInput ? fetcher.data.brands : undefined;
  const suggestions = useMemo(() => {
    if (!trimmedInput) return [];
    return dedupeBrands(fetchedBrandsForInput ?? filterBrandSuggestions(initialBrands, trimmedInput));
  }, [fetchedBrandsForInput, initialBrands, trimmedInput]);
  const hasExactSuggestion = suggestions.some((brand) => normalizeBrandName(brand.name) === normalizeBrandName(trimmedInput));
  const showSuggestionBox = open && trimmedInput.length > 0;
  const isLookingUpSuggestions = showSuggestionBox && fetchedBrandsForInput === undefined;
  const canCreateNewBrand = !isLookingUpSuggestions && !hasExactSuggestion;
  const brandLookupPath = useAdminPath(`/brand-lookup?merk=${encodeURIComponent(trimmedInput)}`);

  useEffect(() => {
    if (!open || !trimmedInput || fetchedBrandsForInput !== undefined) return;
    const timer = window.setTimeout(() => {
      void fetcher.load(brandLookupPath);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [brandLookupPath, fetchedBrandsForInput, fetcher, open, trimmedInput]);

  /** Clear the selected brand when the user edits the query. */
  function clearSelectedBrand(value: string): void {
    setInputValue(value);
    setSelectedBrandId("");
    setNewBrandName("");
    setOpen(true);
  }

  /** Select an existing brand suggestion. */
  function selectExistingBrand(brand: Brand): void {
    setInputValue(brand.name);
    setSelectedBrandId(brand.id);
    setNewBrandName("");
    setOpen(false);
  }

  /** Select the current query as a new brand. */
  function selectNewBrand(): void {
    if (!trimmedInput) return;
    setInputValue(trimmedInput);
    setSelectedBrandId("");
    setNewBrandName(trimmedInput);
    setOpen(false);
  }

  return (
    <div className={styles.brandCombobox} onBlur={(event) => { const nextFocus = event.relatedTarget; if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) return; setOpen(false); }}>
      <label className={styles.brandLabel}><span className={styles.visuallyHidden}>Merk</span><input aria-autocomplete="list" aria-expanded={showSuggestionBox} autoComplete="off" className={styles.brandInput} name="brandQuery" placeholder="Typ om merken te zoeken, bijv. Coca-Cola" type="text" value={inputValue} onChange={(event) => clearSelectedBrand(event.currentTarget.value)} onFocus={() => setOpen(true)} /></label>
      <input name="brandId" type="hidden" value={selectedBrandId} />
      <input name="brandName" type="hidden" value={newBrandName} />
      {showSuggestionBox ? (
        <div className={styles.suggestions} role="listbox">
          {suggestions.map((brand) => <button key={brand.id} className={styles.suggestionButton} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => selectExistingBrand(brand)}>{brand.name}</button>)}
          {isLookingUpSuggestions ? <p className={styles.lookupStatus}>Merken zoeken...</p> : null}
          {canCreateNewBrand ? <button className={styles.createBrandButton} type="button" onMouseDown={(event) => event.preventDefault()} onClick={selectNewBrand}>+ Maak “{trimmedInput}” aan als nieuw merk</button> : null}
        </div>
      ) : null}
      {selectedBrandId ? <p className={styles.statusText}>Geselecteerd merk: {inputValue}</p> : null}
      {newBrandName ? <p className={styles.statusText}>Nieuw merk wordt aangemaakt: {newBrandName}</p> : null}
      {!selectedBrandId && !newBrandName && trimmedInput ? <p className={styles.hintText}>Kies een suggestie of gebruik de plus-optie onderaan.</p> : null}
      {error ? <span className={styles.errorText}>{error}</span> : null}
    </div>
  );
}
