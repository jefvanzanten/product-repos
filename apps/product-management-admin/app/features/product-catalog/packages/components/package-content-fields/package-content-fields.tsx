import { useState } from "react";
import type { PackageTypeDto, UnitTypeDto } from "@product-repos/contracts";
import styles from "./package-content-fields.module.css";

/** Values accepted by the shared package-content form controls. */
export type PackageContentFormValues = Readonly<Record<string, string>>;

/** Render required total package content and a separate optional portion definition. */
export function PackageContentFields({
  errors,
  packageTypes,
  unitTypes,
  values,
  variant = "dark",
}: {
  readonly errors?: Readonly<Record<string, string>>;
  readonly packageTypes: ReadonlyArray<PackageTypeDto>;
  readonly unitTypes: ReadonlyArray<UnitTypeDto>;
  readonly values?: PackageContentFormValues;
  readonly variant?: "dark" | "light";
}): React.ReactNode {
  const [hasPortion, setHasPortion] = useState(values?.portionEnabled === "on" || Boolean(values?.portionName));
  const [totalAmount, setTotalAmount] = useState(values?.amount ?? "");
  const [totalUnitTypeId, setTotalUnitTypeId] = useState(values?.unitTypeId ?? "");
  const [portionAmount, setPortionAmount] = useState(values?.portionAmount ?? "");
  const [portionUnitTypeId, setPortionUnitTypeId] = useState(values?.portionUnitTypeId ?? "");
  const [portionsPerPackage, setPortionsPerPackage] = useState(values?.portionsPerPackage ?? "");
  const selectedTotalUnit = unitTypes.find((unitType) => String(unitType.id) === totalUnitTypeId);
  const selectedPortionUnit = unitTypes.find((unitType) => String(unitType.id) === portionUnitTypeId);
  const portionSum = hasPortion ? calculatePortionSum(portionAmount, portionsPerPackage) : null;

  return (
    <div className={`${styles.fields} ${styles[variant]}`}>
      <label className={styles.label}>Verpakkingstype
        <select className={styles.select} name="packageTypeId" defaultValue={values?.packageTypeId ?? ""} required>
          <option value="">Kies verpakkingstype</option>
          {packageTypes.map((packageType) => <option key={packageType.id} value={packageType.id}>{packageType.name}</option>)}
        </select>
      </label>
      {errors?.packageTypeId ? <span className={styles.error}>{errors.packageTypeId}</span> : null}

      <div className={styles.amountGrid}>
        <label className={styles.label}>Volledige verpakkingsinhoud
          <input
            className={styles.input}
            inputMode="decimal"
            name="amount"
            placeholder="Bijv. 88"
            required
            value={totalAmount}
            onChange={(event) => setTotalAmount(event.currentTarget.value)}
          />
        </label>
        <label className={styles.label}>Eenheid volledige inhoud
          <select className={styles.select} name="unitTypeId" required value={totalUnitTypeId} onChange={(event) => setTotalUnitTypeId(event.currentTarget.value)}>
            <option value="">Kies eenheid</option>
            {unitTypes.map((unitType) => <option key={unitType.id} value={unitType.id}>{unitType.name}</option>)}
          </select>
        </label>
      </div>
      {errors?.amount ? <span className={styles.error}>{errors.amount}</span> : null}
      {errors?.unitTypeId ? <span className={styles.error}>{errors.unitTypeId}</span> : null}

      <label className={styles.distributionChoice}>
        <input name="portionEnabled" type="checkbox" checked={hasPortion} onChange={(event) => setHasPortion(event.currentTarget.checked)} />
        <span>Portie of stuk toevoegen (optioneel)</span>
      </label>
      <p className={styles.help}>De portiegrootte staat naast de volledige inhoud en vervangt deze niet.</p>

      <div className={styles.portionFields} hidden={!hasPortion} aria-hidden={!hasPortion}>
        <label className={styles.label}>Naam van één portie of stuk
          <input
            className={styles.input}
            disabled={!hasPortion}
            name="portionName"
            placeholder="Bijv. wafel"
            required={hasPortion}
            defaultValue={values?.portionName ?? ""}
          />
        </label>
        {errors?.["portion.name"] || errors?.portionName ? <span className={styles.error}>{errors["portion.name"] ?? errors.portionName}</span> : null}

        <div className={styles.amountGrid}>
          <label className={styles.label}>Portiegrootte
            <input
              className={styles.input}
              disabled={!hasPortion}
              inputMode="decimal"
              name="portionAmount"
              placeholder="Bijv. 4,9"
              required={hasPortion}
              value={portionAmount}
              onChange={(event) => setPortionAmount(event.currentTarget.value)}
            />
          </label>
          <label className={styles.label}>Eenheid portiegrootte
            <select
              className={styles.select}
              disabled={!hasPortion}
              name="portionUnitTypeId"
              required={hasPortion}
              value={portionUnitTypeId}
              onChange={(event) => setPortionUnitTypeId(event.currentTarget.value)}
            >
              <option value="">Kies eenheid</option>
              {unitTypes.map((unitType) => <option key={unitType.id} value={unitType.id}>{unitType.name}</option>)}
            </select>
          </label>
        </div>
        {errors?.["portion.amount"] || errors?.portionAmount ? <span className={styles.error}>{errors["portion.amount"] ?? errors.portionAmount}</span> : null}
        {errors?.["portion.unitTypeId"] || errors?.portionUnitTypeId ? <span className={styles.error}>{errors["portion.unitTypeId"] ?? errors.portionUnitTypeId}</span> : null}

        <label className={styles.label}>Aantal porties of stuks in de verpakking (optioneel)
          <input
            className={styles.input}
            disabled={!hasPortion}
            min="1"
            name="portionsPerPackage"
            step="1"
            type="number"
            value={portionsPerPackage}
            onChange={(event) => setPortionsPerPackage(event.currentTarget.value)}
          />
        </label>
        {errors?.["portion.portionsPerPackage"] || errors?.portionsPerPackage ? <span className={styles.error}>{errors["portion.portionsPerPackage"] ?? errors.portionsPerPackage}</span> : null}
      </div>

      {portionSum !== null && selectedPortionUnit !== undefined ? (
        <p className={styles.preview}>
          Som van de porties: <strong>{formatDutchDecimal(portionSum)} {selectedPortionUnit.symbol}</strong>
          {selectedTotalUnit !== undefined && totalAmount.trim() !== "" ? ` · volledige inhoud: ${totalAmount.trim()} ${selectedTotalUnit.symbol}` : ""}
        </p>
      ) : null}
      {errors?.portion ? <span className={styles.error}>{errors.portion}</span> : null}
    </div>
  );
}

/** Multiply a positive decimal portion size by an optional integer count without floating-point loss. */
function calculatePortionSum(amountInput: string, unitsInput: string): string | null {
  const amount = amountInput.trim().replace(",", ".");
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount)) return null;
  const units = Number(unitsInput);
  if (!Number.isSafeInteger(units) || units < 1) return null;
  const [integerPart, fractionPart = ""] = amount.split(".");
  if (integerPart === undefined) return null;
  const coefficient = BigInt(`${integerPart}${fractionPart}`) * BigInt(units);
  return renderDecimal(coefficient, fractionPart.length);
}

/** Render a non-negative decimal coefficient without insignificant zeroes. */
function renderDecimal(coefficient: bigint, scale: number): string {
  if (coefficient === 0n) return "0";
  let digits = coefficient.toString();
  if (scale === 0) return digits;
  digits = digits.padStart(scale + 1, "0");
  const splitAt = digits.length - scale;
  return `${digits.slice(0, splitAt)}.${digits.slice(splitAt)}`.replace(/0+$/, "").replace(/\.$/, "");
}

/** Format a canonical decimal for Dutch admin presentation. */
function formatDutchDecimal(value: string): string {
  return value.replace(".", ",");
}
