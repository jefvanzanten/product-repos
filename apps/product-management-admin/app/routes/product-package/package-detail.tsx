import { useEffect, useState } from "react";
import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { AdminForm as Form, AdminLink as Link } from "../../admin-source-context";
import { requireAdministrator } from "../../auth.server";
import type {
  PackageDetailActionResult,
  PackageDetailLoaderData,
  PackageTypeDto,
  ProductPackageWithProductId,
  UnitTypeDto,
} from "./product-package-route.types";
import styles from "./product-package.module.css";
import {
  handlePackageDetailRouteAction,
  loadPackageDetailRoute,
} from "./package-detail-route.server";

/** Return metadata for the package-detail route. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Verpakking" }];
}

/** Load protected package details and edit reference data. */
export async function loader(args: LoaderFunctionArgs): Promise<PackageDetailLoaderData> {
  await requireAdministrator(args.request);
  return loadPackageDetailRoute(args);
}

/** Handle a protected package edit. */
export async function action(args: ActionFunctionArgs): Promise<PackageDetailActionResult> {
  await requireAdministrator(args.request);
  return handlePackageDetailRouteAction(args);
}

export default function PackageDetail(): React.ReactNode {
  const actionData = useActionData<PackageDetailActionResult>();
  const loaderData = useLoaderData<PackageDetailLoaderData>();
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (actionData?.ok) setEditing(false);
  }, [actionData?.ok]);

  if (!loaderData.found) {
    return <main className={styles.page}><section className={styles.card}><p>{loaderData.productFound ? "Verpakking niet gevonden." : "Product niet gevonden."}</p><Link className={styles.primaryLink} to="/product-catalogus">Terug naar productcatalogus</Link></section></main>;
  }

  const packageDetail = actionData?.packageDetail ?? loaderData.packageDetail;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to={`/product-catalogus/${loaderData.product.id}${loaderData.context}`}>Terug naar product</Link>
        <h1 className={styles.title}>Verpakking</h1>
        <p className={styles.intro}>{loaderData.product.displayName}</p>
      </header>
      <section className={styles.card}>
        {editing ? (
          <Form className={styles.form} method="post">
            {actionData?.errors?.form ? <p className={styles.formError}>{actionData.errors.form}</p> : null}
            <PackageFields packageTypes={loaderData.packageTypes} unitTypes={loaderData.unitTypes} values={actionData?.values ?? packageToValues(packageDetail)} errors={actionData?.errors} />
            <div className={styles.actions}>
              <button className={styles.primaryButton} type="submit">Opslaan</button>
              <button className={styles.secondaryButton} type="button" onClick={() => setEditing(false)}>Annuleren</button>
            </div>
          </Form>
        ) : (
          <section className={styles.form}>
            <h2 className={styles.sectionTitle}>Verpakking</h2>
            <dl className={styles.definitionList}>
              <div><dt>Type</dt><dd>{packageDetail.packageType.name}</dd></div>
              <div><dt>Individueel type</dt><dd>{packageDetail.individualPackageType?.name ?? "Niet van toepassing"}</dd></div>
              <div><dt>Inhoud per individueel stuk</dt><dd>{packageDetail.unitContent.amount} {packageDetail.unitContent.unitType.name}</dd></div>
              <div><dt>Aantal per verpakking</dt><dd>{packageDetail.unitsPerPackage}</dd></div>
              <div><dt>Samenvatting</dt><dd>{packageDetail.summary}</dd></div>
            </dl>
            <button className={styles.secondaryButton} type="button" onClick={() => setEditing(true)}>Verpakking bewerken</button>
          </section>
        )}
      </section>
    </main>
  );
}

function PackageFields({ errors, packageTypes, unitTypes, values }: { readonly errors?: Record<string, string>; readonly packageTypes: ReadonlyArray<PackageTypeDto>; readonly unitTypes: ReadonlyArray<UnitTypeDto>; readonly values: Record<string, string> }): React.ReactNode {
  return (
    <>
      <label className={styles.label}>Verpakkingstype
        <select className={styles.input} name="packageTypeId" defaultValue={values.packageTypeId ?? ""} required>
          {packageTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={styles.label}>Individueel verpakkingstype (verplicht bij meer dan één stuk)
        <select className={styles.input} name="individualPackageTypeId" defaultValue={values.individualPackageTypeId ?? ""}>
          <option value="">Geen (één stuk)</option>
          {packageTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={styles.label}>Inhoud per individueel stuk
        <input className={styles.input} name="amount" defaultValue={values.amount ?? ""} />
      </label>
      {errors?.amount ? <p className={styles.formError}>{errors.amount}</p> : null}
      <label className={styles.label}>Inhoudseenheid
        <select className={styles.input} name="unitTypeId" defaultValue={values.unitTypeId ?? ""} required>
          {unitTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={styles.label}>Aantal per verpakking
        <input className={styles.input} name="unitsPerPackage" type="number" defaultValue={values.unitsPerPackage ?? "1"} />
      </label>
    </>
  );
}

function packageToValues(packageDetail: ProductPackageWithProductId): Record<string, string> {
  return {
    packageTypeId: String(packageDetail.packageType.id),
    individualPackageTypeId: packageDetail.individualPackageType === null ? "" : String(packageDetail.individualPackageType.id),
    amount: packageDetail.unitContent.amount,
    unitTypeId: String(packageDetail.unitContent.unitType.id),
    unitsPerPackage: String(packageDetail.unitsPerPackage),
  };
}
