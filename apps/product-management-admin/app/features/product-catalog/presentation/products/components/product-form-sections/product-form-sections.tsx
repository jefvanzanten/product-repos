import { useState } from "react";
import type { ConsumptionType, MacroProfile } from "../../../../domain/product-catalog";
import styles from "./product-form-sections.module.css";

/** Form values restored after a failed mutation. */
export type ProductFormValues = Readonly<Record<string, string>>;

/** Group related product fields within the continuous form. */
export function ProductFormCard({ children, headerControl, title }: { readonly children: React.ReactNode; readonly headerControl?: React.ReactNode; readonly title: string }): React.ReactNode {
  return <fieldset className={styles.card}><legend className={styles.visuallyHidden}>{title}</legend><div className={styles.sectionHeader}><span className={styles.legend}>{title}</span>{headerControl}</div>{children}</fieldset>;
}

/** Render the shared product-name form card. */
export function ProductNameSection({ error, value }: { readonly error?: string; readonly value?: string }): React.ReactNode {
  return (
    <ProductFormCard title="Productnaam">
      <input aria-label="Productnaam" className={styles.input} defaultValue={value} name="productName" placeholder="Bijv. Zero Sugar" required />
      {error ? <span className={styles.error}>{error}</span> : null}
    </ProductFormCard>
  );
}

/** Render the consumable toggle and its conditionally required type options. */
export function ConsumptionTypeSection({ error, initiallyEnabled, onEnabledChange, value }: { readonly error?: string; readonly initiallyEnabled: boolean; readonly onEnabledChange?: (enabled: boolean) => void; readonly value?: string | null }): React.ReactNode {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [selectedType, setSelectedType] = useState<ConsumptionType | undefined>(value === "FOOD" || value === "DRINK" || value === "SUPPLEMENT" ? value : undefined);
  const options: ReadonlyArray<{ readonly value: ConsumptionType; readonly label: string }> = [
    { value: "FOOD", label: "Voeding" },
    { value: "DRINK", label: "Drinken" },
    { value: "SUPPLEMENT", label: "Supplement" },
  ];
  /** Update local visibility and inform the coordinating composition form. */
  function changeEnabled(nextEnabled: boolean): void {
    setEnabled(nextEnabled);
    onEnabledChange?.(nextEnabled);
  }
  return (
    <ProductFormCard
      title="Consumptieproduct"
      headerControl={<label className={styles.toggleLabel}>
        <span className={styles.visuallyHidden}>Consumptieproduct</span>
        <input checked={enabled} name="consumableEnabled" onChange={(event) => changeEnabled(event.currentTarget.checked)} type="checkbox" />
        <span aria-hidden="true" className={styles.toggleVisual} />
      </label>}
    >
      {enabled ? <>
        <div className={styles.radioGrid} role="radiogroup" aria-label="Consumptietype">
          {options.map((option) => (
            <label className={styles.radioTile} key={option.value}>
              <input checked={selectedType === option.value} name="consumptionType" onChange={() => setSelectedType(option.value)} required type="radio" value={option.value} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </> : null}
      {error ? <span className={styles.error}>{error}</span> : null}
    </ProductFormCard>
  );
}

/** Render the optional macro-profile toggle, reference basis, and values. */
export function MacroProfileSection({ available = true, errors, profile, values }: { readonly available?: boolean; readonly errors?: Readonly<Record<string, string>>; readonly profile?: (MacroProfile & { readonly enabled?: boolean }) | null; readonly values?: ProductFormValues }): React.ReactNode {
  const initiallyEnabled = values?.macroEnabled === "on" || (values?.macroEnabled === undefined && profile !== null && profile !== undefined && profile.enabled !== false);
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const active = available && enabled;
  const [caloriesChanged, setCaloriesChanged] = useState(values?.caloriesChanged === "true");
  const value = (field: keyof MacroProfile): string => values?.[field] ?? String(profile?.[field] ?? "");
  const referenceBasis = values?.referenceBasis ?? profile?.referenceBasis ?? "PER_100_G";
  const basisOptions = [
    ["PER_100_G", "Per 100 g"],
    ["PER_100_ML", "Per 100 ml"],
    ["PER_UNIT", "Per stuk/dosis"],
  ] as const;

  return (
    <ProductFormCard
      title="Voedingswaarden (optioneel)"
      headerControl={<label className={`${styles.toggleLabel} ${styles.nutritionToggleLabel}`}>
        <span className={styles.visuallyHidden}>Macroprofiel inschakelen</span>
        <input checked={active} disabled={!available} name="macroEnabled" onChange={(event) => setEnabled(event.currentTarget.checked)} type="checkbox" />
        <span aria-hidden="true" className={styles.toggleVisual} />
      </label>}
    >
      {!available ? <p className={styles.help}>Voedingswaarden kunnen alleen actief zijn voor een consumptieproduct.</p> : null}
      {active ? (
        <div className={styles.macroContent}>
          <strong className={styles.fieldLabel}>Referentiebasis</strong>
          <div className={styles.radioGrid} role="radiogroup" aria-label="Referentiebasis">
            {basisOptions.map(([basisValue, label]) => (
              <label className={styles.radioTile} key={basisValue}>
                <input defaultChecked={referenceBasis === basisValue} name="referenceBasis" required type="radio" value={basisValue} />
                <span aria-hidden="true" className={styles.radioIcon} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {errors?.referenceBasis ? <span className={styles.error}>{errors.referenceBasis}</span> : null}
          <div className={styles.macroGrid}>
            <MacroInput error={errors?.caloriesKcal} label="Calorieën (kcal)" name="caloriesKcal" placeholder="Bijv. 218" value={value("caloriesKcal")} onInput={() => setCaloriesChanged(true)} />
            <MacroInput error={errors?.proteinG} label="Eiwit (g)" name="proteinG" placeholder="Bijv. 7,4" value={value("proteinG")} />
            <MacroInput error={errors?.carbohydratesG} label="Koolhydraten (g)" name="carbohydratesG" placeholder="Bijv. 18,0" value={value("carbohydratesG")} />
            <MacroInput error={errors?.fatG} label="Vet (g)" name="fatG" placeholder="Bijv. 13,2" value={value("fatG")} />
          </div>
          <input name="caloriesSource" type="hidden" value={values?.caloriesSource ?? profile?.caloriesSource ?? ""} />
          <input name="caloriesChanged" type="hidden" value={String(caloriesChanged)} />
          {errors?.macroProfile ? <span className={styles.error}>{errors.macroProfile}</span> : null}
        </div>
      ) : null}
    </ProductFormCard>
  );
}

/** Render shared create or edit form actions. */
export function ProductFormActions({ busy = false, disabled = false, onCancel }: { readonly busy?: boolean; readonly disabled?: boolean; readonly onCancel?: () => void }): React.ReactNode {
  return (
    <div className={onCancel ? styles.actions : styles.createActions}>
      {onCancel ? <button className={styles.cancelButton} type="button" onClick={onCancel}>Annuleren</button> : null}
      <button className={styles.saveButton} disabled={busy || disabled} type="submit">{busy ? "Opslaan..." : onCancel ? "Wijzigingen opslaan" : "Product opslaan"}</button>
    </div>
  );
}

/** Render one nullable macro decimal field. */
function MacroInput({ error, label, name, onInput, placeholder, value }: { readonly error?: string; readonly label: string; readonly name: string; readonly onInput?: () => void; readonly placeholder: string; readonly value: string }): React.ReactNode {
  return (
    <label className={styles.inputLabel}>{label}
      <input className={styles.input} defaultValue={value} inputMode="decimal" name={name} onInput={onInput} placeholder={placeholder} />
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
}
