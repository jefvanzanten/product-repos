import type { ConsumptionTypeFilter } from "../../../../../core/domain/consumption-types";
import type { AvailableInputUnit, UnifiedSearchResult } from "../../../domain/consumption-log";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFetcher, useNavigate } from "react-router";
import { ModalDialog } from "../../../../../core/presentation/components/modal-dialog/modal-dialog";
import { Icon } from "../../../../../core/presentation/components/icon/icon";
import { presentLogFormSubmissionError } from "./log-form-errors";
import { getProductSearchMode } from "./product-search";
import { getTodayDate } from "../../../../../core/domain/dates-and-timezones";
import { selectInputUnitKey, shouldIncludeLegacyInputUnit } from "../../../../../core/domain/quantities";
import { logbookPath } from "../../../../../core/presentation/routing/calorie-tracker-routes";
import type { ConsumableSelection } from "../../../domain/consumable-selection";
import { createLogFormSubmission } from "../../../domain/log-form-submission";
import { createExistingUnit, createExistingUnitKey, createUnitKey } from "../../../domain/log-form-units";
import type { LogFormActionResult, LogFormMode } from "../../types/log-form.types";
import { formatTimeInTimezone, toFormMomentInTimezone } from "../../formatting/consumption-moment";
import { SearchResultList } from "./search-result-list";
import { QuantityFields } from "./quantity-fields";
import styles from "./log-form.module.css";

type ConsumableLookupData =
  | { readonly ok: true; readonly query: string | null; readonly results: ReadonlyArray<UnifiedSearchResult> }
  | { readonly ok: false; readonly query: string | null; readonly error: string };

type ProductUnitsData =
  | { readonly ok: true; readonly productId: string; readonly units: ReadonlyArray<AvailableInputUnit> }
  | { readonly ok: false; readonly productId: string | null; readonly error: string };

/**
 * Render the shared consumable, quantity, date, and time form using route resources.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function LogForm({
  mode,
  date,
  type,
  timezone,
  initialResults,
  closePath,
}: {
  readonly mode: LogFormMode;
  readonly date: string;
  readonly type: ConsumptionTypeFilter;
  readonly timezone: string;
  readonly initialResults: ReadonlyArray<UnifiedSearchResult>;
  readonly closePath: string;
}): ReactNode {
  const navigate = useNavigate();
  const searchFetcher = useFetcher<ConsumableLookupData>();
  const unitsFetcher = useFetcher<ProductUnitsData>();
  const mutationFetcher = useFetcher<LogFormActionResult>();
  const requestedUnitsProductId = useRef<string | null>(null);
  const quantityFieldsRef = useRef<HTMLDivElement>(null);
  const editDish = mode.tag === "Edit" && mode.log.type === "DISH" ? mode.log : null;
  const initialSelection: ConsumableSelection | null = mode.tag === "Edit"
    ? mode.log.type === "DISH"
      ? { kind: "DISH", value: mode.log.dish }
      : { kind: "PRODUCT", value: mode.log.product }
    : null;
  const [searchInput, setSearchInput] = useState("");
  const [selection, setSelection] = useState<ConsumableSelection | null>(initialSelection);
  const [quantity, setQuantity] = useState(mode.tag === "Edit" ? mode.log.quantity.replace(".", ",") : "1");
  const initialMoment = mode.tag === "Edit"
    ? { date: mode.log.localDate, time: formatTimeInTimezone(mode.log.consumedAt, mode.log.timezone) }
    : toFormMomentInTimezone(new Date().toISOString(), timezone);
  const [selectedDate, setSelectedDate] = useState(mode.tag === "Edit" ? initialMoment.date : date);
  const [time, setTime] = useState(initialMoment.time);
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(mode.tag === "Edit" && mode.log.type === "PRODUCT" ? createExistingUnitKey(mode.log) : null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [clientId] = useState(() => crypto.randomUUID());
  const searchMode = getProductSearchMode(searchInput);
  const normalizedQuery = searchMode.tag === "Search" ? searchMode.query : null;
  const loadSearchResults = searchFetcher.load;
  const loadUnits = unitsFetcher.load;
  const selectedProduct = selection !== null && selection.kind === "PRODUCT" ? selection.value : null;

  useEffect(() => {
    if (selection === null) return;
    quantityFieldsRef.current?.scrollIntoView({ block: "nearest" });
  }, [selection]);

  useEffect(() => {
    if (editDish !== null || normalizedQuery === null) return;
    const timer = window.setTimeout(() => {
      void loadSearchResults(`/consumable-lookup?${new URLSearchParams({ query: normalizedQuery })}`);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [editDish, loadSearchResults, normalizedQuery]);

  const selectedOriginalProduct = mode.tag === "Edit" && mode.log.type === "PRODUCT" && selectedProduct !== null
    && shouldIncludeLegacyInputUnit(selectedProduct.productId, mode.log.product.productId);
  const selectedOriginalArchived = selectedOriginalProduct && mode.tag === "Edit" && mode.log.type === "PRODUCT"
    && mode.log.product.archived;

  useEffect(() => {
    if (selectedProduct === null || selectedOriginalArchived) return;
    if (requestedUnitsProductId.current === selectedProduct.productId) return;
    requestedUnitsProductId.current = selectedProduct.productId;
    void loadUnits(`/product-input-units/${selectedProduct.productId}`);
  }, [loadUnits, selectedOriginalArchived, selectedProduct]);

  useEffect(() => {
    if (mutationFetcher.data?.ok !== true) return;
    const savedLog = mutationFetcher.data.log;
    const logFilter = savedLog.type === "DISH" ? "food" : savedLog.product.consumptionType.toLowerCase();
    const visible = type === "all" || type === logFilter;
    const message = visible ? "Log opgeslagen." : "Log opgeslagen, maar niet zichtbaar binnen het actieve filter.";
    void navigate(logbookPath({ date: savedLog.localDate, type }), {
      state: {
        calorieTrackerMutation: {
          id: savedLog.id,
          message,
          scrollToCreatedLog: mode.tag === "Create" && visible,
        },
      },
    });
  }, [mode.tag, mutationFetcher.data, navigate, type]);

  const lookupData = searchFetcher.data;
  const lookupMatches = lookupData?.ok === true && lookupData.query === normalizedQuery;
  const rawResults = searchMode.tag === "Recent"
    ? (lookupData?.ok === true && lookupData.query === null ? lookupData.results : initialResults)
    : lookupData?.ok === true && lookupMatches
      ? lookupData.results
      : [];
  const results = mode.tag === "Edit" ? rawResults.filter((result): result is Extract<UnifiedSearchResult, { readonly kind: "PRODUCT" }> => result.kind === "PRODUCT") : rawResults;
  const lookupFailed = lookupData?.ok === false && lookupData.query === normalizedQuery;
  const fetchedUnits = unitsFetcher.data?.ok === true
    && selectedProduct !== null
    && unitsFetcher.data.productId === selectedProduct.productId
    ? unitsFetcher.data.units
    : [];
  const existingUnit = selectedOriginalProduct && mode.tag === "Edit" && mode.log.type === "PRODUCT" ? createExistingUnit(mode.log) : null;
  const includesExistingUnit = existingUnit === null || fetchedUnits.some((unit) => createUnitKey(unit) === createUnitKey(existingUnit));
  const availableUnits = existingUnit !== null && !includesExistingUnit ? [existingUnit, ...fetchedUnits] : fetchedUnits;
  const unitsLoaded = selectedOriginalArchived
    || (unitsFetcher.data?.ok === true && selectedProduct !== null && unitsFetcher.data.productId === selectedProduct.productId);
  const unitKey = selectedProduct !== null && unitsLoaded && availableUnits.length > 0
    ? selectInputUnitKey(selectedUnitKey, availableUnits.map(createUnitKey))
    : selectedUnitKey;

  /**
   * Validate and submit the current form concept to the owning route action.
   *
   * @param event - Form submission event.
   * @returns Nothing.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setValidationError(null);
    const submission = selection !== null && selection.kind === "DISH"
      ? createLogFormSubmission({
          kind: "DISH",
          mode,
          dishId: selection.value.id,
          quantity,
          selectedDate,
          time,
          timezone,
          initialMoment,
          clientId,
        })
      : createLogFormSubmission({
          kind: "PRODUCT",
          mode,
          selectedProduct,
          quantity,
          availableUnits,
          unitKey,
          selectedDate,
          time,
          timezone,
          initialMoment,
          clientId,
        });
    if (submission.tag === "Failure") {
      setValidationError(presentLogFormSubmissionError(submission.error));
      return;
    }
    if (submission.requiresQuantityConfirmation && !window.confirm("Deze hoeveelheid is uitzonderlijk hoog. Toch opslaan?")) return;
    void mutationFetcher.submit({ payload: JSON.stringify(submission.payload) }, { method: "post" });
  }

  /**
   * Select a consumable and discard any unit choice that belonged to a previous package.
   *
   * @param result - The selected unified search result.
   * @returns Nothing.
   */
  function selectResult(result: UnifiedSearchResult): void {
    setSelection(result.kind === "DISH"
      ? { kind: "DISH", value: { id: result.id, name: result.name, imageUrl: result.imageUrl, servings: result.servings } }
      : { kind: "PRODUCT", value: result });
    setSelectedUnitKey(null);
  }

  /**
   * Update search input, clear the previous selection, and reload recents when cleared.
   *
   * @param value - The value value.
   * @returns Nothing.
   */
  function changeSearchInput(value: string): void {
    setSearchInput(value);
    setSelection(null);
    setSelectedUnitKey(null);
    if (value.trim().length === 0) void loadSearchResults("/consumable-lookup");
  }

  const formError = validationError ?? (mutationFetcher.data?.ok === false ? mutationFetcher.data.error : null);
  const unitsFailed = unitsFetcher.data?.ok === false
    && selectedProduct !== null
    && unitsFetcher.data.productId === selectedProduct.productId;
  const formTitle = mode.tag === "Create" ? "Log toevoegen" : "Log bewerken";
  return (
    <ModalDialog title={formTitle} onClose={() => void navigate(closePath)} className={styles.dialog}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <header className={styles.topbar}>
          <button type="button" aria-label="Terug" onClick={() => void navigate(closePath)}><Icon name="back" size={24} /></button>
          <h1>{formTitle}</h1>
          <button type="button" className={styles.closeButton} aria-label="Sluiten" onClick={() => void navigate(closePath)}><Icon name="close" size={24} /></button>
        </header>
        <div className={styles.fields}>
          {editDish === null && (
            <label className={styles.fullField}>
              <span>{mode.tag === "Create" ? "Zoek een product of gerecht" : "Productverpakking"}</span>
              <span className={styles.inputWithIcon}><Icon name="search" /><input value={searchInput} onChange={(event) => changeSearchInput(event.currentTarget.value)} placeholder="Zoek op product, merk of gerecht" /></span>
            </label>
          )}
          <label><span>Datum</span><input type="date" value={selectedDate} max={getTodayDate(timezone)} onChange={(event) => setSelectedDate(event.currentTarget.value)} /></label>
          <label><span>Tijd</span><input type="time" value={time} onChange={(event) => setTime(event.currentTarget.value)} /></label>

          {editDish === null && (
            <SearchResultList
              searchMode={searchMode}
              isPending={searchMode.tag === "Search" && (!lookupMatches || searchFetcher.state !== "idle")}
              failed={lookupFailed}
              results={results}
              selectedKey={selection === null ? null : selection.kind === "PRODUCT" ? `product:${selection.value.productId}` : `dish:${selection.value.id}`}
              editLog={mode.tag === "Edit" && mode.log.type === "PRODUCT" ? mode.log : null}
              onRetry={() => {
                void (searchMode.tag === "Search"
                  ? loadSearchResults(`/consumable-lookup?${new URLSearchParams({ query: searchMode.query })}`)
                  : loadSearchResults("/consumable-lookup"));
              }}
              onSelect={selectResult}
            />
          )}
          {editDish !== null && <p className={styles.fullField}>Geselecteerd gerecht: <strong>{editDish.dish.name}</strong></p>}

          {selection !== null && (
            <div ref={quantityFieldsRef} className={styles.quantityFields}>
              {selection.kind === "PRODUCT" ? (
                <QuantityFields
                  quantity={quantity}
                  unitKey={unitKey}
                  availableUnits={availableUnits}
                  unitsDisabled={!selectedOriginalArchived && (!unitsLoaded || unitsFailed)}
                  unitsFailed={!selectedOriginalArchived && unitsFailed}
                  onQuantityChange={setQuantity}
                  onUnitChange={setSelectedUnitKey}
                  onRetryUnits={() => void loadUnits(`/product-input-units/${selection.value.productId}`)}
                />
              ) : (
                <label className={styles.fullField}>
                  <span>Hoeveel? (porties)</span>
                  <input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.currentTarget.value)} placeholder="bijv. 1,5" />
                </label>
              )}
            </div>
          )}
          {formError !== null && <div className={styles.error} role="alert">{formError}{mode.tag === "Edit" && formError.includes("intussen") && <button type="button" onClick={() => window.location.reload()}>Actuele data herladen</button>}</div>}
        </div>
        <footer className={`${styles.footer} ${styles.singleActionFooter}`}>
          <button type="submit" className="ct-primary" disabled={mutationFetcher.state !== "idle"}>{mutationFetcher.state !== "idle" ? "Opslaan…" : mode.tag === "Create" ? "Log opslaan" : "Wijzigingen opslaan"}</button>
        </footer>
      </form>
    </ModalDialog>
  );
}
