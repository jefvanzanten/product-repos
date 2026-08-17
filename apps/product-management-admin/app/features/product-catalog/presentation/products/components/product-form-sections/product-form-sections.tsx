import { useState } from "react";
import type { ConsumptionType, MacroProfile } from "../../../../domain/product-catalog";
import styles from "./product-form-sections.module.css";

/** Form values restored after a failed mutation. */
export type ProductFormValues = Readonly<Record<string, string>>;

/** Render one dark Figma product-form card. */
export function ProductFormCard({ children, title }: { readonly children: React.ReactNode; readonly title: string }): React.ReactNode {
  return <fieldset className={styles.card}><legend className={styles.legend}>{title}</legend>{children}</fieldset>;
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

/** Render the required consumption-type radio tile group. */
export function ConsumptionTypeSection({ error, value }: { readonly error?: string; readonly value?: string }): React.ReactNode {
  const options: ReadonlyArray<{ readonly value: ConsumptionType; readonly label: string }> = [
    { value: "FOOD", label: "Voeding" },
    { value: "DRINK", label: "Drinken" },
    { value: "SUPPLEMENT", label: "Supplement" },
  ];
  return (
    <ProductFormCard title="Consumptietype">
      <p className={styles.help}>Kies precies één consumptietype.</p>
      <div className={styles.radioGrid} role="radiogroup" aria-label="Consumptietype">
        {options.map((option) => (
          <label className={styles.radioTile} key={option.value}>
            <input defaultChecked={value === option.value} name="consumptionType" required type="radio" value={option.value} />
            <span aria-hidden="true" className={styles.radioIcon} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error ? <span className={styles.error}>{error}</span> : null}
    </ProductFormCard>
  );
}

/** Render the optional macro-profile toggle, reference basis, and values. */
export function MacroProfileSection({ errors, profile, values }: { readonly errors?: Readonly<Record<string, string>>; readonly profile?: MacroProfile | null; readonly values?: ProductFormValues }): React.ReactNode {
  const initiallyEnabled = values?.macroEnabled === "on" || (values?.macroEnabled === undefined && profile !== null && profile !== undefined);
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [caloriesChanged, setCaloriesChanged] = useState(values?.caloriesChanged === "true");
  const value = (field: keyof MacroProfile): string => values?.[field] ?? String(profile?.[field] ?? "");
  const referenceBasis = values?.referenceBasis ?? profile?.referenceBasis ?? "PER_100_G";
  const basisOptions = [
    ["PER_100_G", "Per 100 g"],
    ["PER_100_ML", "Per 100 ml"],
    ["PER_UNIT", "Per stuk/dosis"],
  ] as const;

  return (
    <ProductFormCard title="Voedingswaarden (optioneel)">
      <label className={styles.toggleLabel}>
        <span className={styles.visuallyHidden}>Macroprofiel inschakelen</span>
        <input checked={enabled} name="macroEnabled" onChange={(event) => setEnabled(event.currentTarget.checked)} type="checkbox" />
        <span aria-hidden="true" className={styles.toggleVisual} />
      </label>
      {enabled ? (
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
export function ProductFormActions({ busy = false, onCancel }: { readonly busy?: boolean; readonly onCancel?: () => void }): React.ReactNode {
  return (
    <div className={onCancel ? styles.actions : styles.createActions}>
      {onCancel ? <button className={styles.cancelButton} type="button" onClick={onCancel}>Annuleren</button> : null}
      <button className={styles.saveButton} disabled={busy} type="submit">{busy ? "Opslaan..." : onCancel ? "Wijzigingen opslaan" : "Product opslaan"}</button>
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
