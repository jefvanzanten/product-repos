import type {
  AvailableInputUnit,
  ConsumptionTypeFilter,
  PackageSearchResult,
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
import { PackageSearch } from "./package-search";
import { createLogFormSubmission } from "./log-form-submission";
import { createExistingUnit, createExistingUnitKey, createUnitKey } from "./log-form-units";
import { QuantityFields } from "./quantity-fields";
import styles from "./log-form.module.css";

type PackageLookupData =
  | { readonly ok: true; readonly query: string | null; readonly packages: ReadonlyArray<PackageSearchResult> }
  | { readonly ok: false; readonly query: string | null; readonly error: string };

type PackageUnitsData =
  | { readonly ok: true; readonly packageId: number; readonly units: ReadonlyArray<AvailableInputUnit> }
  | { readonly ok: false; readonly packageId: number | null; readonly error: string };

/**
 * Render the shared package, quantity, date, and time form using route resources.
 *
 * @param properties - Function arguments.
 * @returns The function result.
 */
export function LogForm({
  mode,
  date,
  type,
  timezone,
  initialPackages,
  closePath,
}: {
  readonly mode: LogFormMode;
  readonly date: string;
  readonly type: ConsumptionTypeFilter;
  readonly timezone: string;
  readonly initialPackages: ReadonlyArray<PackageSearchResult>;
  readonly closePath: string;
}): ReactNode {
  const navigate = useNavigate();
  const packageFetcher = useFetcher<PackageLookupData>();
  const unitsFetcher = useFetcher<PackageUnitsData>();
  const mutationFetcher = useFetcher<LogFormActionResult>();
  const requestedUnitsPackageId = useRef<number | null>(null);
  const initialPackage = mode._tag === "Edit" ? mode.log.package : null;
  const [searchInput, setSearchInput] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<PackageSearchResult | null>(initialPackage);
  const [quantity, setQuantity] = useState(mode._tag === "Edit" ? mode.log.quantity.replace(".", ",") : "1");
  const initialMoment = mode._tag === "Edit"
    ? { date: mode.log.localDate, time: formatTimeInTimezone(mode.log.consumedAt, mode.log.timezone) }
    : toFormMomentInTimezone(new Date().toISOString(), timezone);
  const [selectedDate, setSelectedDate] = useState(mode._tag === "Edit" ? initialMoment.date : date);
  const [time, setTime] = useState(initialMoment.time);
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(mode._tag === "Edit" ? createExistingUnitKey(mode.log) : null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [clientId] = useState(() => crypto.randomUUID());
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

  const selectedOriginalPackage = mode._tag === "Edit" && shouldIncludeLegacyInputUnit(selectedPackage?.packageId ?? null, mode.log.package.packageId);
  const selectedOriginalArchived = selectedOriginalPackage && mode._tag === "Edit" && (mode.log.package.productArchived || mode.log.package.packageArchived);

  useEffect(() => {
    if (selectedPackage === null || selectedOriginalArchived) return;
    if (requestedUnitsPackageId.current === selectedPackage.packageId) return;
    requestedUnitsPackageId.current = selectedPackage.packageId;
    void loadUnits(`/package-input-units/${selectedPackage.packageId}`);
  }, [loadUnits, selectedOriginalArchived, selectedPackage]);

  useEffect(() => {
    if (mutationFetcher.data?.ok !== true) return;
    const savedLog = mutationFetcher.data.log;
    const logFilter = savedLog.package.consumptionType.toLowerCase();
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
  const existingUnit = selectedOriginalPackage && mode._tag === "Edit" ? createExistingUnit(mode.log) : null;
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
    const submission = createLogFormSubmission({
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
 * Select a package and discard any unit choice that belonged to the previous package.
 *
 * @param productPackage - The productPackage value.
 * @returns Nothing.
 */
  function selectPackage(productPackage: PackageSearchResult): void {
    setSelectedPackage(productPackage);
    setSelectedUnitKey(null);
  }

  /**
 * Update package search input and reload recents immediately when cleared.
 *
 * @param value - The value value.
 * @returns Nothing.
 */
  function changeSearchInput(value: string): void {
    setSearchInput(value);
    if (value.trim().length === 0) void loadPackages("/package-lookup");
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
          <label className={styles.fullField}>
            <span>{mode._tag === "Create" ? "Product zoeken" : "Productverpakking"}</span>
            <span className={styles.inputWithIcon}><Icon name="search" /><input value={searchInput} onChange={(event) => changeSearchInput(event.currentTarget.value)} placeholder="Zoek op product of merk" /></span>
          </label>
          <label><span>Datum</span><input type="date" value={selectedDate} max={getTodayInTimezone(timezone)} onChange={(event) => setSelectedDate(event.currentTarget.value)} /></label>
          <label><span>Tijd</span><input type="time" value={time} onChange={(event) => setTime(event.currentTarget.value)} /></label>

          <PackageSearch
            searchMode={searchMode}
            isPending={searchMode._tag === "Search" && (!lookupMatches || packageFetcher.state !== "idle")}
            failed={packageLookupFailed}
            packages={resultPackages}
            selectedPackageId={selectedPackage?.packageId}
            editLog={mode._tag === "Edit" ? mode.log : null}
            onRetry={() => {
              void (searchMode._tag === "Search"
                ? loadPackages(`/package-lookup?${new URLSearchParams({ query: searchMode.query })}`)
                : loadPackages("/package-lookup"));
            }}
            onSelect={selectPackage}
          />

          {selectedPackage !== null && (
            <QuantityFields
              quantity={quantity}
              unitKey={unitKey}
              availableUnits={availableUnits}
              unitsDisabled={!selectedOriginalArchived && (!unitsLoaded || unitsFailed)}
              unitsFailed={!selectedOriginalArchived && unitsFailed}
              onQuantityChange={setQuantity}
              onUnitChange={setSelectedUnitKey}
              onRetryUnits={() => void loadUnits(`/package-input-units/${selectedPackage.packageId}`)}
            />
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
