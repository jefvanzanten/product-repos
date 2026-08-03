import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type {
  AvailableInputUnit,
  ConsumptionLog,
  ConsumptionTypeFilter,
  PackageSearchResult,
} from "@product-repos/contracts/calorie-tracker";
import {
  createConsumptionLog,
  getAvailableInputUnits,
  getLoggablePackages,
  updateConsumptionLog,
} from "../../api/calorie-tracker-api/calorie-tracker-api";
import { invalidateCalorieTrackerDate } from "../../api/calorie-tracker-api/calorie-tracker-cache";
import { calorieTrackerQueryKeys } from "../../api/calorie-tracker-api/calorie-tracker-query-keys";
import { getProductSearchMode } from "../../domain/consumption-types";
import { getTodayInTimezone, parseEditedConsumptionMoment } from "../../domain/dates-and-timezones";
import {
  parsePositiveDecimal,
  selectInputUnitKey,
  shouldIncludeLegacyInputUnit,
} from "../../domain/quantities";
import { logbookPath, logDetailPath } from "../../routing/calorie-tracker-routes";
import { FocusDialog } from "../../components/focus-dialog/focus-dialog";
import { Icon } from "../../components/icon/icon";
import { formatTimeInTimezone, toFormMomentInTimezone } from "./consumption-moment";
import type { FormMutationInput, LogFormMode } from "./log-form-types";
import { PackageSearch } from "./package-search";
import { createUnitKey, QuantityFields } from "./quantity-fields";
import styles from "./log-form.module.css";

export type { LogFormMode } from "./log-form-types";

/** Render the shared package, quantity, date, and time form for create and edit routes. */
export function LogForm({
  mode,
  date,
  type,
  timezone,
}: {
  readonly mode: LogFormMode;
  readonly date: string;
  readonly type: ConsumptionTypeFilter;
  readonly timezone: string;
}): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialPackage = mode._tag === "Edit" ? mode.log.package : null;
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<PackageSearchResult | null>(initialPackage);
  const [quantity, setQuantity] = useState(mode._tag === "Edit" ? mode.log.quantity.replace(".", ",") : "1");
  const initialMoment = mode._tag === "Edit"
    ? { date: mode.log.localDate, time: formatTimeInTimezone(mode.log.consumedAt, mode.log.timezone) }
    : toFormMomentInTimezone(new Date().toISOString(), timezone);
  const [selectedDate, setSelectedDate] = useState(mode._tag === "Edit" ? initialMoment.date : date);
  const [time, setTime] = useState(initialMoment.time);
  const [unitKey, setUnitKey] = useState<string | null>(mode._tag === "Edit" ? createExistingUnitKey(mode.log) : null);
  const [formError, setFormError] = useState<string | null>(null);
  const [clientId] = useState(() => crypto.randomUUID());
  const searchMode = getProductSearchMode(debouncedSearch);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const packagesQuery = useQuery({
    queryKey: calorieTrackerQueryKeys.packages(searchMode._tag === "Search" ? searchMode.query : "recent"),
    enabled: searchMode._tag !== "TooShort",
    retry: false,
    queryFn: ({ signal }) => getLoggablePackages(searchMode._tag === "Search" ? searchMode.query : null, { timezone, signal }),
  });
  const selectedOriginalPackage = mode._tag === "Edit" && shouldIncludeLegacyInputUnit(selectedPackage?.packageId ?? null, mode.log.package.packageId);
  const selectedOriginalArchived = selectedOriginalPackage && mode._tag === "Edit" && (mode.log.package.productArchived || mode.log.package.packageArchived);
  const unitsQuery = useQuery({
    queryKey: calorieTrackerQueryKeys.packageUnits(selectedPackage?.packageId ?? null),
    enabled: selectedPackage !== null && !selectedOriginalArchived,
    retry: false,
    queryFn: ({ signal }) => selectedPackage === null
      ? Promise.resolve({ _tag: "Success" as const, value: [] })
      : getAvailableInputUnits(selectedPackage.packageId, { timezone, signal }),
  });
  const fetchedUnits = unitsQuery.data?._tag === "Success" ? unitsQuery.data.value : [];
  const existingUnit = selectedOriginalPackage && mode._tag === "Edit" ? createExistingUnit(mode.log) : null;
  const includesExistingUnit = existingUnit === null || fetchedUnits.some((unit) => createUnitKey(unit) === createUnitKey(existingUnit));
  const availableUnits = existingUnit !== null && !includesExistingUnit ? [existingUnit, ...fetchedUnits] : fetchedUnits;

  useEffect(() => {
    if (selectedPackage === null) {
      if (unitKey !== null) setUnitKey(null);
      return;
    }
    if ((!selectedOriginalArchived && unitsQuery.data?._tag !== "Success") || availableUnits.length === 0) return;
    const nextUnitKey = selectInputUnitKey(unitKey, availableUnits.map(createUnitKey));
    if (nextUnitKey !== unitKey) setUnitKey(nextUnitKey);
  }, [availableUnits, selectedOriginalArchived, selectedPackage, unitKey, unitsQuery.data]);

  const mutation = useMutation({
    mutationFn: async (input: FormMutationInput) => input._tag === "Create"
      ? createConsumptionLog(input.body, { timezone })
      : updateConsumptionLog(input.logId, input.body, { timezone }),
  });

  const closeForm = useCallback(() => {
    const state = { date, type };
    void navigate(mode._tag === "Edit" ? logDetailPath(mode.log.id, state) : logbookPath(state));
  }, [date, mode, navigate, type]);

  /** Parse and submit the current concept without replacing it on failures. */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);
    if (selectedPackage === null) {
      setFormError("Kies eerst een productverpakking.");
      return;
    }
    const parsedQuantity = parsePositiveDecimal(quantity);
    if (parsedQuantity._tag === "Failure") {
      setFormError("Vul een hoeveelheid groter dan nul in.");
      return;
    }
    if (Number(parsedQuantity.value.canonical) >= 10_000 && !window.confirm("Deze hoeveelheid is uitzonderlijk hoog. Toch opslaan?")) return;
    const selectedUnit = availableUnits.find((unit) => createUnitKey(unit) === unitKey);
    if (selectedUnit === undefined) {
      setFormError("Kies een beschikbare eenheid.");
      return;
    }
    const parsedMoment = parseEditedConsumptionMoment(
      selectedDate,
      time,
      timezone,
      mode._tag === "Edit" ? { date: initialMoment.date, time: initialMoment.time, consumedAt: mode.log.consumedAt } : null,
    );
    if (parsedMoment._tag === "Failure") {
      setFormError(parsedMoment.error._tag === "FutureMoment"
        ? "Een toekomstig consumptiemoment is niet toegestaan."
        : parsedMoment.error._tag === "AmbiguousMoment"
          ? "Dit tijdstip komt twee keer voor door de wintertijdwisseling. Kies een ander tijdstip."
          : "Dit tijdstip bestaat niet door de zomertijdwisseling.");
      return;
    }
    const shared = {
      packageId: selectedPackage.packageId,
      quantity: parsedQuantity.value.canonical,
      inputMode: selectedUnit.inputMode,
      inputUnitTypeId: selectedUnit.unitType?.id ?? null,
      consumedAt: parsedMoment.value,
    };
    const input: FormMutationInput = mode._tag === "Create"
      ? { _tag: "Create", body: { id: clientId, ...shared } }
      : { _tag: "Edit", logId: mode.log.id, body: { expectedUpdatedAt: mode.log.updatedAt, ...shared } };
    const outcome = await mutation.mutateAsync(input);
    if (outcome._tag === "Failure") {
      if (outcome.error._tag === "HttpFailure" && outcome.error.response.code === "LOG_UPDATE_CONFLICT") {
        setFormError("Dit log is intussen gewijzigd. Herlaad de actuele gegevens voordat je opnieuw opslaat.");
      } else {
        setFormError(outcome.error._tag === "HttpFailure" ? outcome.error.response.message : "Opslaan lukt niet. Je invoer is bewaard; probeer opnieuw.");
      }
      return;
    }
    const affectedDates = new Set([outcome.value.localDate]);
    if (mode._tag === "Edit") affectedDates.add(mode.log.localDate);
    await Promise.all([
      ...[...affectedDates].map((affectedDate) => invalidateCalorieTrackerDate(queryClient, affectedDate)),
      queryClient.invalidateQueries({ queryKey: calorieTrackerQueryKeys.log(outcome.value.id) }),
      ...(mode._tag === "Create"
        ? [queryClient.invalidateQueries({ queryKey: calorieTrackerQueryKeys.packageSearches })]
        : []),
    ]);
    const logFilter = outcome.value.package.consumptionType.toLowerCase();
    const visible = type === "all" || type === logFilter;
    const message = visible ? "Log opgeslagen." : "Log opgeslagen, maar niet zichtbaar binnen het actieve filter.";
    void navigate(logbookPath({ date: outcome.value.localDate, type }), {
      state: {
        calorieTrackerMutation: {
          id: outcome.value.id,
          message,
          scrollToCreatedLog: mode._tag === "Create" && visible,
        },
      },
    });
  }

  const resultPackages = packagesQuery.data?._tag === "Success" ? packagesQuery.data.value : [];

  /** Select a package and discard any unit choice that belonged to the previous package. */
  function selectPackage(productPackage: PackageSearchResult): void {
    setSelectedPackage(productPackage);
    setUnitKey(null);
  }

  return (
    <FocusDialog title={mode._tag === "Create" ? "Consumptielog aanmaken" : "Log bewerken"} onClose={closeForm} className={styles.dialog}>
      <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
        <header className={styles.topbar}>
          <button type="button" aria-label="Terug" onClick={closeForm}><Icon name="back" size={24} /></button>
          <h1>{mode._tag === "Create" ? "Log toevoegen" : "Log bewerken"}</h1>
          <button type="button" aria-label="Sluiten" onClick={closeForm}><Icon name="close" size={24} /></button>
        </header>
        <div className={styles.fields}>
          <label className={styles.fullField}>
            <span>{mode._tag === "Create" ? "Product zoeken" : "Productverpakking"}</span>
            <span className={styles.inputWithIcon}><Icon name="search" /><input value={searchInput} onChange={(event) => setSearchInput(event.currentTarget.value)} placeholder="Zoek op product of merk" /></span>
          </label>
          <label><span>Datum</span><input type="date" value={selectedDate} max={getTodayInTimezone(timezone)} onChange={(event) => setSelectedDate(event.currentTarget.value)} /></label>
          <label><span>Tijd</span><input type="time" value={time} onChange={(event) => setTime(event.currentTarget.value)} /></label>

          <PackageSearch
            searchMode={searchMode}
            isPending={packagesQuery.isPending}
            failed={packagesQuery.data?._tag === "Failure"}
            packages={resultPackages}
            selectedPackageId={selectedPackage?.packageId}
            editLog={mode._tag === "Edit" ? mode.log : null}
            onRetry={() => void packagesQuery.refetch()}
            onSelect={selectPackage}
          />

          {selectedPackage !== null && (
            <QuantityFields
              quantity={quantity}
              unitKey={unitKey}
              availableUnits={availableUnits}
              unitsDisabled={!selectedOriginalArchived && (unitsQuery.isPending || unitsQuery.data?._tag === "Failure")}
              unitsFailed={!selectedOriginalArchived && unitsQuery.data?._tag === "Failure"}
              onQuantityChange={setQuantity}
              onUnitChange={setUnitKey}
              onRetryUnits={() => void unitsQuery.refetch()}
            />
          )}
          {formError !== null && <div className={styles.error} role="alert">{formError}{mode._tag === "Edit" && formError.includes("intussen") && <button type="button" onClick={() => window.location.reload()}>Actuele data herladen</button>}</div>}
        </div>
        <footer className={styles.footer}>
          <button type="button" className="ct-secondary" onClick={closeForm}>Annuleren</button>
          <button type="submit" className="ct-primary" disabled={mutation.isPending}>{mutation.isPending ? "Opslaan…" : mode._tag === "Create" ? "Log opslaan" : "Wijzigingen opslaan"}</button>
        </footer>
      </form>
    </FocusDialog>
  );
}

/** Encode an existing log unit in the same form as fetched available units. */
function createExistingUnitKey(log: ConsumptionLog): string {
  return `${log.inputMode}:${log.inputUnitType?.id ?? "package"}`;
}

/** Project an existing input unit so archived logs retain their current legal choice. */
function createExistingUnit(log: ConsumptionLog): AvailableInputUnit {
  const label = log.inputMode === "CONTENT_UNIT"
    ? log.inputUnitType?.symbol ?? "Eenheid"
    : log.inputMode === "INDIVIDUAL_UNIT"
      ? log.package.portion?.name ?? "Individuele eenheid"
      : log.package.packageType.name;
  return { inputMode: log.inputMode, unitType: log.inputUnitType, label };
}
