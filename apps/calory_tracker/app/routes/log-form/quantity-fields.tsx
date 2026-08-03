import type { AvailableInputUnit, PackageSearchResult } from "@product-repos/contracts/calorie-tracker";
import type { ReactNode } from "react";
import { ConsumptionTypeBadge } from "../../components/consumption-type-badge/consumption-type-badge";
import styles from "./log-form.module.css";

/** Render quantity, unit, and catalog-derived consumption-type inputs. */
export function QuantityFields({
  selectedPackage,
  quantity,
  unitKey,
  availableUnits,
  unitsDisabled,
  unitsFailed,
  onQuantityChange,
  onUnitChange,
  onRetryUnits,
}: {
  readonly selectedPackage: PackageSearchResult;
  readonly quantity: string;
  readonly unitKey: string | null;
  readonly availableUnits: ReadonlyArray<AvailableInputUnit>;
  readonly unitsDisabled: boolean;
  readonly unitsFailed: boolean;
  readonly onQuantityChange: (value: string) => void;
  readonly onUnitChange: (value: string) => void;
  readonly onRetryUnits: () => void;
}): ReactNode {
  return (
    <>
      <label><span>Hoeveelheid</span><input inputMode="decimal" value={quantity} onChange={(event) => onQuantityChange(event.currentTarget.value)} /></label>
      <label>
        <span>Eenheid</span>
        <select value={unitKey ?? ""} onChange={(event) => onUnitChange(event.currentTarget.value)} disabled={unitsDisabled}>
          <option value="" disabled>Kies eenheid</option>
          {availableUnits.map((unit) => <option key={createUnitKey(unit)} value={createUnitKey(unit)}>{unit.label}</option>)}
        </select>
      </label>
      {unitsFailed && <div className={styles.error} role="alert">Eenheden laden lukt niet.<button type="button" onClick={onRetryUnits}>Opnieuw proberen</button></div>}
      <aside className={styles.typeNote}><ConsumptionTypeBadge type={selectedPackage.consumptionType} /><span>Type komt uit de productcatalogus</span></aside>
    </>
  );
}

/** Encode an available unit as a stable select option value. */
export function createUnitKey(unit: AvailableInputUnit): string {
  return `${unit.inputMode}:${unit.unitType?.id ?? "package"}`;
}
