import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type {
  AvailableInputUnit,
  ConsumptionLog,
  CreateConsumptionLog,
  PackageSearchResult,
  UpdateConsumptionLog,
} from "@product-repos/contracts/calorie-tracker";
import {
  createConsumptionLog,
  getAvailableInputUnits,
  getLoggablePackages,
  updateConsumptionLog,
} from "../calorie-tracker-api";
import {
  getBrowserTimezone,
  getProductSearchMode,
  parseLocalConsumptionMoment,
  parsePositiveDecimal,
} from "../calorie-tracker-domain";
import { ConsumptionTypeBadge, FocusDialog, Icon, ProductImage } from "../calorie-tracker-components";
import styles from "./log-form.module.css";

/** Add/edit form route mode with the data required for optimistic updates. */
export type LogFormMode =
  | { readonly _tag: "Create" }
  | { readonly _tag: "Edit"; readonly log: ConsumptionLog };

type FormMutationInput =
  | { readonly _tag: "Create"; readonly body: CreateConsumptionLog }
  | { readonly _tag: "Edit"; readonly logId: string; readonly body: UpdateConsumptionLog };

/** Render the shared package, quantity, date, and time form for create and edit routes. */
export function LogForm({
  mode,
  date,
  type,
}: {
  readonly mode: LogFormMode;
  readonly date: string;
  readonly type: string;
}): ReactNode {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const timezone = getBrowserTimezone();
  const initialPackage = mode._tag === "Edit" ? mode.log.package : null;
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<PackageSearchResult | null>(initialPackage);
  const [quantity, setQuantity] = useState(mode._tag === "Edit" ? mode.log.quantity.replace(".", ",") : "1");
  const initialMoment = mode._tag === "Edit"
    ? { date: mode.log.localDate, time: formatTimeInTimezone(mode.log.consumedAt, mode.log.timezone) }
    : toLocalFormMoment(new Date().toISOString());
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
    queryKey: ["calorie-tracker", "packages", searchMode],
    enabled: searchMode._tag !== "TooShort",
    queryFn: ({ signal }) => getLoggablePackages(searchMode._tag === "Search" ? searchMode.query : null, { timezone, signal }),
  });
  const unitsQuery = useQuery({
    queryKey: ["calorie-tracker", "package-units", selectedPackage?.packageId],
    enabled: selectedPackage !== null,
    queryFn: ({ signal }) => selectedPackage === null
      ? Promise.resolve({ _tag: "Success" as const, value: [] })
      : getAvailableInputUnits(selectedPackage.packageId, { timezone, signal }),
  });
  const fetchedUnits = unitsQuery.data?._tag === "Success" ? unitsQuery.data.value : [];
  const existingUnit = mode._tag === "Edit" ? createExistingUnit(mode.log) : null;
  const includesExistingUnit = existingUnit === null || fetchedUnits.some((unit) => createUnitKey(unit) === createUnitKey(existingUnit));
  const availableUnits = existingUnit !== null && !includesExistingUnit ? [existingUnit, ...fetchedUnits] : fetchedUnits;

  useEffect(() => {
    if (unitKey !== null || availableUnits.length === 0) return;
    const firstUnit = availableUnits[0];
    if (firstUnit !== undefined) setUnitKey(createUnitKey(firstUnit));
  }, [availableUnits, unitKey]);

  const mutation = useMutation({
    mutationFn: async (input: FormMutationInput) => input._tag === "Create"
      ? createConsumptionLog(input.body, { timezone, signal: new AbortController().signal })
      : updateConsumptionLog(input.logId, input.body, { timezone, signal: new AbortController().signal }),
  });

  const closeForm = useCallback(() => {
    const target = mode._tag === "Edit" ? `/logs/${mode.log.id}` : "/logs";
    navigate(`${target}?${new URLSearchParams({ date, type })}`);
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
    const parsedMoment = parseLocalConsumptionMoment(selectedDate, time);
    if (parsedMoment._tag === "Failure") {
      setFormError(parsedMoment.error._tag === "FutureMoment" ? "Een toekomstig consumptiemoment is niet toegestaan." : "Dit tijdstip bestaat niet door de zomertijdwisseling.");
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
    await queryClient.invalidateQueries({ queryKey: ["calorie-tracker"] });
    const logFilter = outcome.value.package.consumptionType.toLowerCase();
    const visible = type === "all" || type === logFilter;
    window.sessionStorage.setItem("calorie-tracker-success", visible ? "Log opgeslagen." : "Log opgeslagen, maar niet zichtbaar binnen het actieve filter.");
    navigate(`/logs?${new URLSearchParams({ date: outcome.value.localDate, type })}`);
  }

  const resultPackages = packagesQuery.data?._tag === "Success" ? packagesQuery.data.value : [];
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
          <label><span>Datum</span><input type="date" value={selectedDate} max={getTodayInput()} onChange={(event) => setSelectedDate(event.currentTarget.value)} /></label>
          <label><span>Tijd</span><input type="time" value={time} onChange={(event) => setTime(event.currentTarget.value)} /></label>

          <section className={styles.results} aria-live="polite">
            <h2>{searchMode._tag === "Recent" ? "Recent gebruikt" : "Zoekresultaten"}</h2>
            {searchMode._tag === "TooShort" && <p>Typ minimaal twee tekens om te zoeken.</p>}
            {packagesQuery.isPending && searchMode._tag !== "TooShort" && <p>Producten laden…</p>}
            {packagesQuery.data?._tag === "Failure" && <p>Producten laden lukt niet.</p>}
            {searchMode._tag !== "TooShort" && !packagesQuery.isPending && resultPackages.length === 0 && mode._tag === "Create" && <p>Product niet gevonden</p>}
            {mode._tag === "Edit" && !resultPackages.some((productPackage) => productPackage.packageId === mode.log.package.packageId) && (
              <button type="button" className={styles.selectedProduct} onClick={() => setSelectedPackage(mode.log.package)}>
                <ProductImage type={mode.log.package.consumptionType} imageUrl={mode.log.package.imageUrl} />
                <span><strong>{mode.log.package.productName}{mode.log.package.brand === null ? "" : ` · ${mode.log.package.brand.name}`}</strong><small>{mode.log.package.summary}</small></span>
                <Icon name="check" />
              </button>
            )}
            {resultPackages.map((productPackage) => (
              <button
                type="button"
                key={productPackage.packageId}
                className={selectedPackage?.packageId === productPackage.packageId ? styles.selectedProduct : styles.productResult}
                onClick={() => { setSelectedPackage(productPackage); setUnitKey(null); }}
              >
                <ProductImage type={productPackage.consumptionType} imageUrl={productPackage.imageUrl} />
                <span><strong>{productPackage.productName}{productPackage.brand === null ? "" : ` · ${productPackage.brand.name}`}</strong><small>{productPackage.summary}</small></span>
                {selectedPackage?.packageId === productPackage.packageId ? <Icon name="check" /> : <Icon name="chevron-right" />}
              </button>
            ))}
            {mode._tag === "Edit" && mode.log.package.packageArchived && <p>De huidige gearchiveerde verpakking blijft beperkt bewerkbaar.</p>}
          </section>

          {selectedPackage !== null && (
            <>
              <h2 className={styles.quantityTitle}>Hoeveelheid</h2>
              <label><span>Waarde</span><input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.currentTarget.value)} /></label>
              <label><span>Eenheid</span><select value={unitKey ?? ""} onChange={(event) => setUnitKey(event.currentTarget.value)} disabled={unitsQuery.isPending}>
                <option value="" disabled>Kies eenheid</option>
                {availableUnits.map((unit) => <option key={createUnitKey(unit)} value={createUnitKey(unit)}>{unit.label}</option>)}
              </select></label>
              <aside className={styles.typeNote}><ConsumptionTypeBadge type={selectedPackage.consumptionType} /><span>Type komt uit de productcatalogus</span></aside>
            </>
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

/** Encode an available unit as a stable select option value. */
function createUnitKey(unit: AvailableInputUnit): string {
  return `${unit.inputMode}:${unit.unitType?.id ?? "package"}`;
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
      ? log.package.individualPackageType?.name ?? "Individuele eenheid"
      : log.package.packageType.name;
  return { inputMode: log.inputMode, unitType: log.inputUnitType, label };
}

/** Format an instant as an `HH:mm` value in its originally stored timezone. */
function formatTimeInTimezone(isoValue: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timezone }).formatToParts(new Date(isoValue));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** Convert an ISO instant to browser-local form fields. */
function toLocalFormMoment(isoValue: string): { readonly date: string; readonly time: string } {
  const value = new Date(isoValue);
  const year = String(value.getFullYear()).padStart(4, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

/** Return today's browser-local date for native date maxima. */
function getTodayInput(): string {
  return toLocalFormMoment(new Date().toISOString()).date;
}
