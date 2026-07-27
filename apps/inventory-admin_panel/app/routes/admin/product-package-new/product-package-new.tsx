import type { Route } from "./+types/product-package-new";
import { Form, Link, redirect, useNavigation } from "react-router";
import { createProductPackage, getPackageTypes, getProductDetail, getUnitTypes, mapApiError } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import type { FormErrors, PackageTypeDto, UnitTypeDto } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import styles from "../product-detail/product-detail.module.css";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Verpakking toevoegen" }];
}

type SubmittedValues = Record<string, string>;
type ActionResult = { readonly errors?: FormErrors; readonly values?: SubmittedValues };

export async function loader({ params }: Route.LoaderArgs) {
  const productId = params.productId;
  if (!productId) return { packageTypes: [], product: null, unitTypes: [] };
  const product = await getProductDetail(productId);
  if (!product) return { packageTypes: [], product: null, unitTypes: [] };
  return { packageTypes: await getPackageTypes(), product, unitTypes: await getUnitTypes() };
}

export async function action({ params, request }: Route.ActionArgs): Promise<ActionResult | Response> {
  const productId = params.productId;
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  if (!productId) return { errors: { form: "Product ontbreekt." }, values };

  try {
    const created = await createProductPackage(productId, packageValuesFromForm(form));
    return redirect(`/admin/product-catalogus/producten/${productId}/verpakkingen/${created.id}`);
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}

export default function NewProductPackage({ actionData, loaderData }: Route.ComponentProps): React.ReactNode {
  const product = loaderData.product;
  if (!product) return <ProductNotFound />;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to={`/admin/product-catalogus/producten/${product.id}`}>← Terug naar product</Link>
        <div>
          <h1 className={styles.title}>Verpakking toevoegen</h1>
          <p className={styles.subtitle}>{product.displayName}</p>
        </div>
      </header>
      <section className={styles.card}>
        <PackageForm actionData={actionData} cancelTo={`/admin/product-catalogus/producten/${product.id}`} packageTypes={loaderData.packageTypes} submitLabel="Verpakking opslaan" unitTypes={loaderData.unitTypes} />
      </section>
    </main>
  );
}

function PackageForm({ actionData, cancelTo, packageTypes, submitLabel, unitTypes }: { readonly actionData?: ActionResult; readonly cancelTo: string; readonly packageTypes: ReadonlyArray<PackageTypeDto>; readonly submitLabel: string; readonly unitTypes: ReadonlyArray<UnitTypeDto> }): React.ReactNode {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const values = actionData?.values ?? { unitsPerPackage: "1" };
  const errors = actionData?.errors ?? {};

  return (
    <Form className={styles.form} method="post" preventScrollReset>
      {errors.form ? <p className={styles.formError}>{errors.form}</p> : null}
      <PackageFields errors={errors} packageTypes={packageTypes} unitTypes={unitTypes} values={values} />
      <div className={styles.buttonRow}>
        <button className={styles.submitButton} disabled={busy} type="submit">{busy ? "Opslaan..." : submitLabel}</button>
        <Link className={styles.secondaryButton} to={cancelTo}>Annuleren</Link>
      </div>
    </Form>
  );
}

function PackageFields({ errors, packageTypes, unitTypes, values }: { readonly errors: FormErrors; readonly packageTypes: ReadonlyArray<PackageTypeDto>; readonly unitTypes: ReadonlyArray<UnitTypeDto>; readonly values: SubmittedValues }): React.ReactNode {
  return (
    <>
      <label className={styles.textLabel}>Verpakkingstype
        <select className={styles.select} name="packageTypeId" defaultValue={values.packageTypeId ?? ""} required>
          <option value="">Kies een verpakkingstype</option>
          {packageTypes.map((packageType) => <option key={packageType.id} value={packageType.id}>{packageType.name}</option>)}
        </select>
        {errors.packageTypeId ? <span className={styles.errorText}>{errors.packageTypeId}</span> : null}
      </label>
      <TextInput defaultValue={values.amount} error={errors.amount} label="Inhoud" name="amount" placeholder="1,5" />
      <label className={styles.textLabel}>Eenheid
        <select className={styles.select} name="unitTypeId" defaultValue={values.unitTypeId ?? ""} required>
          <option value="">Kies een eenheid</option>
          {unitTypes.map((unitType) => <option key={unitType.id} value={unitType.id}>{unitType.name}</option>)}
        </select>
        {errors.unitTypeId ? <span className={styles.errorText}>{errors.unitTypeId}</span> : null}
      </label>
      <TextInput defaultValue={values.unitsPerPackage ?? "1"} error={errors.unitsPerPackage} label="Aantal per verpakking" name="unitsPerPackage" placeholder="1" type="number" />
    </>
  );
}

function ProductNotFound(): React.ReactNode {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Product niet gevonden.</h1>
        <Link className={styles.backLink} to="/admin/product-catalogus/producten">← Terug naar productcatalogus</Link>
      </section>
    </main>
  );
}

function TextInput({ defaultValue, error, label, name, placeholder, type = "text" }: { readonly defaultValue?: string; readonly error?: string; readonly label: string; readonly name: string; readonly placeholder?: string; readonly type?: string }): React.ReactNode {
  return <label className={styles.textLabel}>{label}<input className={styles.textInput} defaultValue={defaultValue} name={name} placeholder={placeholder} type={type} />{error ? <span className={styles.errorText}>{error}</span> : null}</label>;
}

function packageValuesFromForm(form: FormData) {
  return {
    amount: String(form.get("amount") ?? "").trim().replace(",", "."),
    packageTypeId: Number(form.get("packageTypeId")),
    unitTypeId: Number(form.get("unitTypeId")),
    unitsPerPackage: Number(form.get("unitsPerPackage")),
  };
}
