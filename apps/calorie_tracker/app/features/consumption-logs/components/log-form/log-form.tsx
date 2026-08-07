import type {
  AvailableInputUnit,
  ConsumptionTypeFilter,
  Dish,
  PackageSearchResult,
  UnifiedSearchResult,
} from "@product-repos/contracts/calorie-tracker";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFetcher, useNavigate } from "react-router";
import { FocusDialog } from "../../../../components/focus-dialog/focus-dialog";
import { Icon } from "../../../../components/icon/icon";
import { getProductSearchMode } from "../../../../domain/consumption-types";
import { getTodayInTimezone } from "../../../../domain/dates-and-timezones";
import { selectInputUnitKey, shouldIncludeLegacyInputUnit } from "../../../../domain/quantities";
import { logbookPath } from "../../../../routing/calorie-tracker-routes";
import type { LogFormActionResult, LogFormMode } from "../../types/log-form.types";
import { formatTimeInTimezone, toFormMomentInTimezone } from "../../utils/consumption-moment";
import { SearchResultList } from "./search-result-list";
import { createLogFormSubmission } from "./log-form-submission";
import { createExistingUnit, createExistingUnitKey, createUnitKey } from "./log-form-units";
import { QuantityFields } from "./quantity-fields";
import styles from "./log-form.module.css";

type ConsumableLookupData =
  | { readonly ok: true; readonly query: string | null; readonly results: ReadonlyArray<UnifiedSearchResult> }
  | { readonly ok: false; readonly query: string | null; readonly error: string };

type PackageUnitsData =
  | { readonly ok: true; readonly packageId: number; readonly units: ReadonlyArray<AvailableInputUnit> }
  | { readonly ok: false; readonly packageId: number | null; readonly error: string };

/** Selected consumable in the log form: catalog package or user-owned dish. */
export type ConsumableSelection =
  | { readonly kind: "PACKAGE"; readonly value: PackageSearchResult }
  | { readonly kind: "DISH"; readonly value: { readonly id: string; readonly name: string; readonly imageUrl: string | null; readonly servings: string } };

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
  initialDish,
  createDishHref,
  closePath,
}: {
  readonly mode: LogFormMode;
  readonly date: string;
  readonly type: ConsumptionTypeFilter;
  readonly timezone: string;
  readonly initialResults: ReadonlyArray<UnifiedSearchResult>;
  readonly initialDish: Dish | null;
  readonly createDishHref: string;
  readonly closePath: string;
}): ReactNode {
  const navigate = useNavigate();
  const searchFetcher = useFetcher<ConsumableLookupData>();
  const unitsFetcher = useFetcher<PackageUnitsData>();
  const mutationFetcher = useFetcher<LogFormActionResult>();
  const requestedUnitsPackageId = useRef<number | null>(null);
  const editDish = mode._tag === "Edit" && mode.log.type === "DISH" ? mode.log : null;
  const initialSelection: ConsumableSelection | null = mode._tag === "Edit"
    ? mode.log.type === "DISH"
      ? { kind: "DISH", value: mode.log.dish }
      : { kind: "PACKAGE", value: mode.log.package }
    : initialDish === null
      ? null
      : { kind: "DISH", value: { id: initialDish.id, name: initialDish.name, imageUrl: initialDish.imageUrl, servings: initialDish.servings } };
  const [searchInput, setSearchInput] = useState("");
  const [selection, setSelection] = useState<ConsumableSelection | null>(initialSelection);
  const [quantity, setQuantity] = useState(mode._tag === "Edit" ? mode.log.quantity.replace(".", ",") : "1");
  const initialMoment = mode._tag === "Edit"
    ? { date: mode.log.localDate, time: formatTimeInTimezone(mode.log.consumedAt, mode.log.timezone) }
    : toFormMomentInTimezone(new Date().toISOString(), timezone);
  const [selectedDate, setSelectedDate] = useState(mode._tag === "Edit" ? initialMoment.date : date);
  const [time, setTime] = useState(initialMoment.time);
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(mode._tag === "Edit" && mode.log.type === "PRODUCT" ? createExistingUnitKey(mode.log) : null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [clientId] = useState(() => crypto.randomUUID());
  const searchMode = getProductSearchMode(searchInput);
  const normalizedQuery = searchMode._tag === "Search" ? searchMode.query : null;
  const loadSearchResults = searchFetcher.load;
  const loadUnits = unitsFetcher.load;
  const selectedPackage = selection !== null && selection.kind === "PACKAGE" ? selection.value : null;

  useEffect(() => {
    if (editDish !== null || normalizedQuery === null) return;
    const timer = window.setTimeout(() => {
      void loadSearchResults(`/consumable-lookup?${new URLSearchParams({ query: normalizedQuery })}`);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [editDish, loadSearchResults, normalizedQuery]);

  const selectedOriginalPackage = mode._tag === "Edit" && mode.log.type === "PRODUCT" && selectedPackage !== null
    && shouldIncludeLegacyInputUnit(selectedPackage.packageId, mode.log.package.packageId);
  const selectedOriginalArchived = selectedOriginalPackage && mode._tag === "Edit" && mode.log.type === "PRODUCT"
    && (mode.log.package.productArchived || mode.log.package.packageArchived);

  useEffect(() => {
    if (selectedPackage === null || selectedOriginalArchived) return;
    if (requestedUnitsPackageId.current === selectedPackage.packageId) return;
    requestedUnitsPackageId.current = selectedPackage.packageId;
    void loadUnits(`/package-input-units/${selectedPackage.packageId}`);
  }, [loadUnits, selectedOriginalArchived, selectedPackage]);

  useEffect(() => {
    if (mutationFetcher.data?.ok !== true) return;
    const savedLog = mutationFetcher.data.log;
    const logFilter = savedLog.type === "DISH" ? "food" : savedLog.package.consumptionType.toLowerCase();
    const visible = type === "all" || type === logFilter;
    const message = visible ? "Log opgeslagen." : "Log opgeslagen, maar niet zichtbaar binnen het actieve filter.";
    void navigate(logbookPath({ date: savedLog.localDate, type }), {
      state: {
        calorieTrackerMutation: {
          id: savedLog.id,
          message,
          scrollToCreatedLog: mode._tag === "Create" && visible,
        },
      },
    });
  }, [mode._tag, mutationFetcher.data, navigate, type]);

  const lookupData = searchFetcher.data;
  const lookupMatches = lookupData?.ok === true && lookupData.query === normalizedQuery;
  const rawResults = searchMode._tag === "Recent"
    ? (lookupData?.ok === true && lookupData.query === null ? lookupData.results : initialResults)
    : lookupData?.ok === true && lookupMatches
      ? lookupData.results
      : [];
  const results = mode._tag === "Edit" ? rawResults.filter((result): result is Extract<UnifiedSearchResult, { readonly kind: "PACKAGE" }> => result.kind === "PACKAGE") : rawResults;
  const lookupFailed = lookupData?.ok === false && lookupData.query === normalizedQuery;
  const fetchedUnits = unitsFetcher.data?.ok === true
    && selectedPackage !== null
    && unitsFetcher.data.packageId === selectedPackage.packageId
    ? unitsFetcher.data.units
    : [];
  const existingUnit = selectedOriginalPackage && mode._tag === "Edit" && mode.log.type === "PRODUCT" ? createExistingUnit(mode.log) : null;
  const includesExistingUnit = existingUnit === null || fetchedUnits.some((unit) => createUnitKey(unit) === createUnitKey(existingUnit));
  const availableUnits = existingUnit !== null && !includesExistingUnit ? [existingUnit, ...fetchedUnits] : fetchedUnits;
  const unitsLoaded = selectedOriginalArchived
    || (unitsFetcher.data?.ok === true && selectedPackage !== null && unitsFetcher.data.packageId === selectedPackage.packageId);
  const unitKey = selectedPackage !== null && unitsLoaded && availableUnits.length > 0
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
          kind: "PACKAGE",
          mode,
          selectedPackage,
          quantity,
          availableUnits,
          unitKey,
          selectedDate,
          time,
          timezone,
          initialMoment,
          clientId,
        });
    if (submission._tag === "Failure") {
      setValidationError(submission.error);
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
      : { kind: "PACKAGE", value: result });
    setSelectedUnitKey(null);
  }

  /**
   * Update search input and reload recents immediately when cleared.
   *
   * @param value - The value value.
   * @returns Nothing.
   */
  function changeSearchInput(value: string): void {
    setSearchInput(value);
    if (value.trim().length === 0) void loadSearchResults("/consumable-lookup");
  }

  const formError = validationError ?? (mutationFetcher.data?.ok === false ? mutationFetcher.data.error : null);
  const unitsFailed = unitsFetcher.data?.ok === false
    && selectedPackage !== null
    && unitsFetcher.data.packageId === selectedPackage.packageId;
  return (
    <FocusDialog title={mode._tag === "Create" ? "Consumptielog aanmaken" : "Log bewerken"} onClose={() => void navigate(closePath)} className={styles.dialog}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <header className={styles.topbar}>
          <button type="button" aria-label="Terug" onClick={() => void navigate(closePath)}><Icon name="back" size={24} /></button>
          <h1>{mode._tag === "Create" ? "Log toevoegen" : "Log bewerken"}</h1>
          <button type="button" aria-label="Sluiten" onClick={() => void navigate(closePath)}><Icon name="close" size={24} /></button>
        </header>
        <div className={styles.fields}>
          {editDish === null && (
            <label className={styles.fullField}>
              <span>{mode._tag === "Create" ? "Zoek een product of gerecht" : "Productverpakking"}</span>
              <span className={styles.inputWithIcon}><Icon name="search" /><input value={searchInput} onChange={(event) => changeSearchInput(event.currentTarget.value)} placeholder="Zoek op product, merk of gerecht" /></span>
            </label>
          )}
          <label><span>Datum</span><input type="date" value={selectedDate} max={getTodayInTimezone(timezone)} onChange={(event) => setSelectedDate(event.currentTarget.value)} /></label>
          <label><span>Tijd</span><input type="time" value={time} onChange={(event) => setTime(event.currentTarget.value)} /></label>

          {editDish === null && (
            <SearchResultList
              searchMode={searchMode}
              isPending={searchMode._tag === "Search" && (!lookupMatches || searchFetcher.state !== "idle")}
              failed={lookupFailed}
              results={results}
              selectedKey={selection === null ? null : selection.kind === "PACKAGE" ? `package:${selection.value.packageId}` : `dish:${selection.value.id}`}
              editLog={mode._tag === "Edit" && mode.log.type === "PRODUCT" ? mode.log : null}
              createDishHref={mode._tag === "Create" ? createDishHref : null}
              onRetry={() => {
                void (searchMode._tag === "Search"
                  ? loadSearchResults(`/consumable-lookup?${new URLSearchParams({ query: searchMode.query })}`)
                  : loadSearchResults("/consumable-lookup"));
              }}
              onSelect={selectResult}
            />
          )}
          {editDish !== null && <p className={styles.fullField}>Geselecteerd gerecht: <strong>{editDish.dish.name}</strong></p>}

          {selection !== null && selection.kind === "PACKAGE" && (
            <QuantityFields
              quantity={quantity}
              unitKey={unitKey}
              availableUnits={availableUnits}
              unitsDisabled={!selectedOriginalArchived && (!unitsLoaded || unitsFailed)}
              unitsFailed={!selectedOriginalArchived && unitsFailed}
              onQuantityChange={setQuantity}
              onUnitChange={setSelectedUnitKey}
              onRetryUnits={() => void loadUnits(`/package-input-units/${selection.value.packageId}`)}
            />
          )}
          {selection !== null && selection.kind === "DISH" && (
            <label className={styles.fullField}>
              <span>Hoeveel? (porties)</span>
              <input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.currentTarget.value)} placeholder="bijv. 1,5" />
            </label>
          )}
          {formError !== null && <div className={styles.error} role="alert">{formError}{mode._tag === "Edit" && formError.includes("intussen") && <button type="button" onClick={() => window.location.reload()}>Actuele data herladen</button>}</div>}
        </div>
        <footer className={styles.footer}>
          <button type="button" className="ct-secondary" onClick={() => void navigate(closePath)}>Annuleren</button>
          <button type="submit" className="ct-primary" disabled={mutationFetcher.state !== "idle"}>{mutationFetcher.state !== "idle" ? "Opslaan…" : mode._tag === "Create" ? "Log opslaan" : "Wijzigingen opslaan"}</button>
        </footer>
      </form>
    </FocusDialog>
  );
}
