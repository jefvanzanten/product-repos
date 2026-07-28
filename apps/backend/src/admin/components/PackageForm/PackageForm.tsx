import { cssModule } from "../../css-modules";
import type { CatalogReferenceData } from "../../models/reference-data.model";
import type { PackageFormValues } from "../../form-parsing";
import { FieldError } from "../FieldError/FieldError";

const styles = cssModule("PackageForm", ["form", "section", "formError", "button"] as const);

/** Render package-only mutation form. */
export function PackageForm(props: {
  readonly action: string;
  readonly references: CatalogReferenceData;
  readonly values: PackageFormValues;
  readonly errors: Readonly<Record<string, string>>;
  readonly submitLabel: string;
}) {
  return (
    <form class={styles.form} method="post" action={props.action}>
      <PackageFields references={props.references} values={props.values} errors={props.errors} />
      {props.errors.form ? <p class={styles.formError} role="alert">{props.errors.form}</p> : null}
      <button class={styles.button} type="submit">{props.submitLabel}</button>
    </form>
  );
}

/** Render package fields reused by product and package forms. */
export function PackageFields(props: { readonly references: CatalogReferenceData; readonly values: PackageFormValues; readonly errors: Readonly<Record<string, string>> }) {
  return (
    <section class={styles.section}>
      <h2>Verpakking</h2>
      <label for="packageTypeId">Verpakkingstype</label>
      <select id="packageTypeId" name="packageTypeId" required>
        <option value="">Kies verpakkingstype</option>
        {props.references.packageTypes.map((packageType) => <option value={String(packageType.id)} selected={props.values.packageTypeId === String(packageType.id)}>{packageType.name}</option>)}
      </select>
      <FieldError error={props.errors.packageTypeId} />

      <label for="amount">Inhoud</label>
      <input id="amount" name="amount" value={props.values.amount} inputmode="decimal" placeholder="1,5" required />
      <FieldError error={props.errors.amount} />

      <label for="unitTypeId">Inhoudseenheid</label>
      <select id="unitTypeId" name="unitTypeId" required>
        <option value="">Kies eenheid</option>
        {props.references.unitTypes.map((unitType) => <option value={String(unitType.id)} selected={props.values.unitTypeId === String(unitType.id)}>{unitType.name}</option>)}
      </select>
      <FieldError error={props.errors.unitTypeId} />

      <label for="unitsPerPackage">Aantal per verpakking</label>
      <input id="unitsPerPackage" name="unitsPerPackage" value={props.values.unitsPerPackage} inputmode="numeric" required />
      <FieldError error={props.errors.unitsPerPackage} />
    </section>
  );
}
