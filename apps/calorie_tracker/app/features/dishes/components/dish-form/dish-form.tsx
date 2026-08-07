import type { AvailableInputUnit, ConsumptionTypeFilter, PackageSearchResult } from "@product-repos/contracts/calorie-tracker";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFetcher, useNavigate } from "react-router";
import { FocusDialog } from "../../../../components/focus-dialog/focus-dialog";
import { Icon } from "../../../../components/icon/icon";
import { getProductSearchMode } from "../../../../domain/consumption-types";
import { parsePositiveDecimal, selectInputUnitKey } from "../../../../domain/quantities";
import { newLogWithDishPath } from "../../../../routing/calorie-tracker-routes";
import type { DishFormActionResult } from "../../types/dish-form.types";
import { createUnitKey } from "../../../consumption-logs/components/log-form/log-form-units";
import styles from "../../../consumption-logs/components/log-form/log-form.module.css";

type PackageLookupData =
  | { readonly ok: true; readonly query: string | null; readonly packages: ReadonlyArray<PackageSearchResult> }
  | { readonly ok: false; readonly query: string | null; readonly error: string };

type PackageUnitsData =
  | { readonly ok: true; readonly packageId: number; readonly units: ReadonlyArray<AvailableInputUnit> }
  | { readonly ok: false; readonly packageId: number | null; readonly error: string };

/** One chosen ingredient ready for persistence. */
type DishFormIngredient = {
  readonly packageId: number;
  readonly label: string;
  readonly quantity: string;
  readonly inputMode: AvailableInputUnit["inputMode"];
  readonly inputUnitTypeId: number | null;
  readonly unitLabel: string;
};

/**
 * Render the route-bound dish creation form with an ingredient picker.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function DishForm({
  date,
  type,
  initialPackages,
  closePath,
}: {
  readonly date: string;
  readonly type: ConsumptionTypeFilter;
  readonly initialPackages: ReadonlyArray<PackageSearchResult>;
  readonly closePath: string;
}): ReactNode {
  const navigate = useNavigate();
  const packageFetcher = useFetcher<PackageLookupData>();
  const unitsFetcher = useFetcher<PackageUnitsData>();
  const mutationFetcher = useFetcher<DishFormActionResult>();
  const requestedUnitsPackageId = useRef<number | null>(null);
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [ingredients, setIngredients] = useState<ReadonlyArray<DishFormIngredient>>([]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<PackageSearchResult | null>(null);
  const [ingredientQuantity, setIngredientQuantity] = useState("1");
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const searchMode = getProductSearchMode(searchInput);
  const normalizedQuery = searchMode._tag === "Search" ? searchMode.query : null;
  const loadPackages = packageFetcher.load;
  const loadUnits = unitsFetcher.load;

  useEffect(() => {
    if (normalizedQuery === null) return;
    const timer = window.setTimeout(() => {
      void loadPackages(`/package-lookup?${new URLSearchParams({ query: normalizedQuery })}`);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadPackages, normalizedQuery]);

  useEffect(() => {
    if (selectedPackage === null) return;
    if (requestedUnitsPackageId.current === selectedPackage.packageId) return;
    requestedUnitsPackageId.current = selectedPackage.packageId;
    void loadUnits(`/package-input-units/${selectedPackage.packageId}`);
  }, [loadUnits, selectedPackage]);

  useEffect(() => {
    if (mutationFetcher.data?.ok !== true) return;
    void navigate(newLogWithDishPath(mutationFetcher.data.dish.id, { date, type }), {
      state: { calorieTrackerMutation: { message: "Gerecht opgeslagen. Log nu hoeveel porties je at." } },
    });
  }, [date, mutationFetcher.data, navigate, type]);

  const packageLookupData = packageFetcher.data;
  const lookupMatches = packageLookupData?.ok === true && packageLookupData.query === normalizedQuery;
  const resultPackages = searchMode._tag === "Recent"
    ? (packageLookupData?.ok === true && packageLookupData.query === null ? packageLookupData.packages : initialPackages)
    : packageLookupData?.ok === true && lookupMatches
      ? packageLookupData.packages
      : [];
  const packageLookupFailed = packageLookupData?.ok === false && packageLookupData.query === normalizedQuery;
  const fetchedUnits = unitsFetcher.data?.ok === true
    && selectedPackage !== null
    && unitsFetcher.data.packageId === selectedPackage.packageId
    ? unitsFetcher.data.units
    : [];
  const unitsLoaded = unitsFetcher.data?.ok === true && selectedPackage !== null && unitsFetcher.data.packageId === selectedPackage.packageId;
  const unitKey = selectedPackage !== null && unitsLoaded && fetchedUnits.length > 0
    ? selectInputUnitKey(selectedUnitKey, fetchedUnits.map(createUnitKey))
    : selectedUnitKey;
  const selectedUnit = fetchedUnits.find((unit) => createUnitKey(unit) === unitKey);

  /**
   * Append the currently picked package and quantity to the ingredient list.
   *
   * @returns Nothing.
   */
  function addIngredient(): void {
    if (selectedPackage === null || selectedUnit === undefined) {
      setValidationError("Kies eerst een product en een eenheid voor het ingrediënt.");
      return;
    }
    const parsed = parsePositiveDecimal(ingredientQuantity);
    if (parsed._tag === "Failure") {
      setValidationError("Vul een ingrediënthoeveelheid groter dan nul in.");
      return;
    }
    setValidationError(null);
    const label = selectedPackage.brand === null
      ? selectedPackage.productName
      : `${selectedPackage.productName} · ${selectedPackage.brand.name}`;
    setIngredients((current) => [...current, {
      packageId: selectedPackage.packageId,
      label,
      quantity: parsed.value.canonical,
      inputMode: selectedUnit.inputMode,
      inputUnitTypeId: selectedUnit.unitType?.id ?? null,
      unitLabel: selectedUnit.label,
    }]);
    setSelectedPackage(null);
    setSelectedUnitKey(null);
    setIngredientQuantity("1");
    setSearchInput("");
  }

  /**
   * Validate the dish concept and submit it to the route action.
   *
   * @param event - Form submission event.
   * @returns Nothing.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setValidationError(null);
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setValidationError("Geef het gerecht een naam.");
      return;
    }
    const parsedServings = parsePositiveDecimal(servings);
    if (parsedServings._tag === "Failure") {
      setValidationError("Vul een aantal porties groter dan nul in.");
      return;
    }
    if (ingredients.length === 0) {
      setValidationError("Voeg minimaal één ingrediënt toe.");
      return;
    }
    const payload = {
      name: trimmedName,
      imageUrl: null,
      servings: parsedServings.value.canonical,
      ingredients: ingredients.map((ingredient) => ({
        packageId: ingredient.packageId,
        quantity: ingredient.quantity,
        inputMode: ingredient.inputMode,
        inputUnitTypeId: ingredient.inputUnitTypeId,
      })),
    };
    void mutationFetcher.submit({ payload: JSON.stringify(payload) }, { method: "post" });
  }

  const formError = validationError ?? (mutationFetcher.data?.ok === false ? mutationFetcher.data.error : null);
  return (
    <FocusDialog title="Gerecht aanmaken" onClose={() => void navigate(closePath)} className={styles.dialog}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <header className={styles.topbar}>
          <button type="button" aria-label="Terug" onClick={() => void navigate(closePath)}><Icon name="back" size={24} /></button>
          <h1>Gerecht aanmaken</h1>
          <button type="button" aria-label="Sluiten" onClick={() => void navigate(closePath)}><Icon name="close" size={24} /></button>
        </header>
        <div className={styles.fields}>
          <label className={styles.fullField}><span>Naam</span><input value={name} onChange={(event) => setName(event.currentTarget.value)} placeholder="bijv. Spaghetti bolognese" /></label>
          <label className={styles.fullField}><span>Aantal porties</span><input inputMode="decimal" value={servings} onChange={(event) => setServings(event.currentTarget.value)} /></label>

          <section className={styles.results}>
            <h2>Ingrediënten</h2>
            {ingredients.length === 0 && <p>Nog geen ingrediënten toegevoegd.</p>}
            {ingredients.map((ingredient, index) => (
              <div key={`${ingredient.packageId}-${index}`} className={styles.productResult}>
                <span>
                  <strong>{ingredient.label}</strong>
                  <small>{ingredient.quantity.replace(".", ",")} {ingredient.unitLabel}</small>
                </span>
                <button type="button" aria-label={`Verwijder ingrediënt ${ingredient.label}`} onClick={() => setIngredients((current) => current.filter((_, position) => position !== index))}><Icon name="delete" /></button>
              </div>
            ))}
          </section>

          <label className={styles.fullField}>
            <span>Ingrediënt zoeken</span>
            <span className={styles.inputWithIcon}><Icon name="search" /><input value={searchInput} onChange={(event) => setSearchInput(event.currentTarget.value)} placeholder="Zoek op product of merk" /></span>
          </label>

          <section className={styles.results} aria-live="polite">
            {searchMode._tag === "TooShort" && <p>Typ minimaal twee tekens om te zoeken.</p>}
            {searchMode._tag === "Search" && (!lookupMatches || packageFetcher.state !== "idle") && <p>Producten laden…</p>}
            {packageLookupFailed && <p>Producten laden lukt niet. <button type="button" onClick={() => void loadPackages(`/package-lookup?${new URLSearchParams({ query: searchMode._tag === "Search" ? searchMode.query : "" })}`)}>Opnieuw proberen</button></p>}
            {resultPackages.map((productPackage) => (
              <button
                key={productPackage.packageId}
                type="button"
                className={selectedPackage?.packageId === productPackage.packageId ? styles.selectedProduct : styles.productResult}
                onClick={() => { setSelectedPackage(productPackage); setSelectedUnitKey(null); }}
              >
                <span>
                  <strong>{productPackage.productName}{productPackage.brand === null ? "" : ` · ${productPackage.brand.name}`}</strong>
                  <small>{productPackage.summary}</small>
                </span>
                <Icon name={selectedPackage?.packageId === productPackage.packageId ? "check" : "chevron-right"} />
              </button>
            ))}
          </section>

          {selectedPackage !== null && (
            <>
              <label><span>Hoeveelheid</span><input inputMode="decimal" value={ingredientQuantity} onChange={(event) => setIngredientQuantity(event.currentTarget.value)} /></label>
              <label>
                <span>Eenheid</span>
                <select value={unitKey ?? ""} onChange={(event) => setSelectedUnitKey(event.currentTarget.value)} disabled={!unitsLoaded}>
                  <option value="" disabled>Kies eenheid</option>
                  {fetchedUnits.map((unit) => <option key={createUnitKey(unit)} value={createUnitKey(unit)}>{unit.label}</option>)}
                </select>
              </label>
              <button type="button" className="ct-secondary" onClick={addIngredient}><Icon name="add" />Ingrediënt toevoegen</button>
            </>
          )}

          {formError !== null && <div className={styles.error} role="alert">{formError}</div>}
        </div>
        <footer className={styles.footer}>
          <button type="button" className="ct-secondary" onClick={() => void navigate(closePath)}>Annuleren</button>
          <button type="submit" className="ct-primary" disabled={mutationFetcher.state !== "idle"}>{mutationFetcher.state !== "idle" ? "Opslaan…" : "Gerecht opslaan"}</button>
        </footer>
      </form>
    </FocusDialog>
  );
}
