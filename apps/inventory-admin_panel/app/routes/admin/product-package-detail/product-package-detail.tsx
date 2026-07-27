import type { Route } from "./+types/product-package-detail";
import { Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { getPackageTypes, getProductPackageDetail, getUnitTypes, mapApiError, updateProductPackage } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import type { FormErrors, PackageTypeDto, ProductPackageDetailDto, UnitTypeDto } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import styles from "../product-detail/product-detail.module.css";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Verpakkingdetail" }];
}

type SubmittedValues = Record<string, string>;
type ActionResult = { readonly errors?: FormErrors; readonly values?: SubmittedValues };

export async function loader({ params }: Route.LoaderArgs) {
  const productId = params.productId;
  const packageId = params.packageId;
  if (!productId) return { packageTypes: [], productId: "", productPackage: null, state: "productNotFound", unitTypes: [] } as const;
  if (!packageId) return { packageTypes: [], productId, productPackage: null, state: "packageNotFound", unitTypes: [] } as const;

  const result = await getProductPackageDetail(productId, packageId);
  if (result.state !== "found") return { packageTypes: [], productId, productPackage: null, state: result.state, unitTypes: [] } as const;

  return {
    packageTypes: await getPackageTypes(),
    productId,
    productPackage: result.productPackage,
    state: "found",
    unitTypes: await getUnitTypes(),
  } as const;
}

export async function action({ params, request }: Route.ActionArgs): Promise<ActionResult | Response> {
  const productId = params.productId;
  const packageId = params.packageId;
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  if (!productId || !packageId) return { errors: { form: "Verpakking ontbreekt." }, values };

  try {
    await updateProductPackage(productId, packageId, packageValuesFromForm(form));
    return redirect(`/admin/product-catalogus/producten/${productId}/verpakkingen/${packageId}`);
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}

export default function ProductPackageDetail({ actionData, loaderData }: Route.ComponentProps): React.ReactNode {
  const [searchParams] = useSearchParams();
  if (loaderData.state === "productNotFound") return <ProductNotFound />;
  if (loaderData.state === "packageNotFound") return <PackageNotFound productId={loaderData.productId} />;

  const productPackage = loaderData.productPackage;
  if (!productPackage) return <PackageNotFound productId={loaderData.productId} />;
  const editMode = searchParams.get("edit") === "1" || actionData?.errors !== undefined;
  const productUrl = `/admin/product-catalogus/producten/${loaderData.productId}`;
  const detailUrl = `${productUrl}/verpakkingen/${productPackage.id}`;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to={productUrl}>← Terug naar product</Link>
        <div>
          <h1 className={styles.title}>{productPackage.summary}</h1>
          <p className={styles.subtitle}>Verpakkingdetail</p>
        </div>
      </header>

      <section className={styles.card} aria-labelledby="verpakking-title">
        <div className={styles.sectionHeader}>
          <h2 id="verpakking-title" className={styles.sectionTitle}>Verpakking</h2>
          {editMode ? null : <Link className={styles.actionButton} to="?edit=1">Verpakking bewerken</Link>}
        </div>
        {editMode
          ? <PackageForm actionData={actionData} cancelTo={detailUrl} packageTypes={loaderData.packageTypes} productPackage={productPackage} unitTypes={loaderData.unitTypes} />
          : <PackageReadOnly productPackage={productPackage} />}
      </section>
    </main>
  );
}

function PackageForm({ actionData, cancelTo, packageTypes, productPackage, unitTypes }: { readonly actionData?: ActionResult; readonly cancelTo: string; readonly packageTypes: ReadonlyArray<PackageTypeDto>; readonly productPackage: ProductPackageDetailDto; readonly unitTypes: ReadonlyArray<UnitTypeDto> }): React.ReactNode {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const values = actionData?.values ?? packageToValues(productPackage);
  const errors = actionData?.errors ?? {};

  return (
    <Form className={styles.form} method="post" preventScrollReset>
      {errors.form ? <p className={styles.formError}>{errors.form}</p> : null}
      <PackageFields errors={errors} packageTypes={packageTypes} unitTypes={unitTypes} values={values} />
      <div className={styles.buttonRow}>
        <button className={styles.submitButton} disabled={busy} type="submit">{busy ? "Opslaan..." : "Opslaan"}</button>
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

function PackageReadOnly({ productPackage }: { readonly productPackage: ProductPackageDetailDto }): React.ReactNode {
  return (
    <dl className={styles.detailsList}>
      <DetailRow label="Type" value={productPackage.packageType.name} />
      <DetailRow label="Inhoud" value={`${productPackage.unitContent.amount} ${productPackage.unitContent.unitType.name}`} />
      <DetailRow label="Aantal per verpakking" value={String(productPackage.unitsPerPackage)} />
      <DetailRow label="Samenvatting" value={productPackage.summary} />
    </dl>
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

function PackageNotFound({ productId }: { readonly productId: string }): React.ReactNode {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Verpakking niet gevonden.</h1>
        <Link className={styles.backLink} to={`/admin/product-catalogus/producten/${productId}`}>← Terug naar product</Link>
      </section>
    </main>
  );
}

function DetailRow({ label, value }: { readonly label: string; readonly value: string }): React.ReactNode {
  return (
    <div className={styles.detailRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function TextInput({ defaultValue, error, label, name, placeholder, type = "text" }: { readonly defaultValue?: string; readonly error?: string; readonly label: string; readonly name: string; readonly placeholder?: string; readonly type?: string }): React.ReactNode {
  return <label className={styles.textLabel}>{label}<input className={styles.textInput} defaultValue={defaultValue} name={name} placeholder={placeholder} type={type} />{error ? <span className={styles.errorText}>{error}</span> : null}</label>;
}

function packageToValues(productPackage: ProductPackageDetailDto): SubmittedValues {
  return {
    amount: productPackage.unitContent.amount,
    packageTypeId: String(productPackage.packageType.id),
    unitTypeId: String(productPackage.unitContent.unitType.id),
    unitsPerPackage: String(productPackage.unitsPerPackage),
  };
}

function packageValuesFromForm(form: FormData) {
  return {
    amount: String(form.get("amount") ?? "").trim().replace(",", "."),
    packageTypeId: Number(form.get("packageTypeId")),
    unitTypeId: Number(form.get("unitTypeId")),
    unitsPerPackage: Number(form.get("unitsPerPackage")),
  };
}
