import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { AdminForm as Form, AdminLink as Link } from "../../admin-source-context";
import { requireAdministrator } from "../../auth.server";
import type {
  PackageFormActionResult,
  PackageFormLoaderData,
  PackageTypeDto,
  UnitTypeDto,
} from "./product-package-route.types";
import styles from "./product-package.module.css";
import {
  handlePackageFormRouteAction,
  loadPackageFormRoute,
} from "./package-form-route.server";

/** Return metadata for the add-package route. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Verpakking toevoegen" }];
}

/** Load protected product and package reference data. */
export async function loader(args: LoaderFunctionArgs): Promise<PackageFormLoaderData> {
  await requireAdministrator(args.request);
  return loadPackageFormRoute(args);
}

/** Handle protected package creation. */
export async function action(args: ActionFunctionArgs): Promise<PackageFormActionResult | Response> {
  await requireAdministrator(args.request);
  return handlePackageFormRouteAction(args);
}

export default function PackageForm(): React.ReactNode {
  const actionData = useActionData<PackageFormActionResult>();
  const loaderData = useLoaderData<PackageFormLoaderData>();
  if (!loaderData.found) {
    return <main className={styles.page}><section className={styles.card}><p>Product niet gevonden.</p><Link className={styles.primaryLink} to="/product-catalogus">Terug naar productcatalogus</Link></section></main>;
  }
  const values = actionData?.values ?? {};
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to={`/product-catalogus/${loaderData.product.id}${loaderData.context}`}>Terug naar product</Link>
        <h1 className={styles.title}>Verpakking toevoegen</h1>
        <p className={styles.intro}>{loaderData.product.displayName}</p>
      </header>
      <section className={styles.card}>
        <Form className={styles.form} method="post">
          {actionData?.errors?.form ? <p className={styles.formError}>{actionData.errors.form}</p> : null}
          <PackageFields packageTypes={loaderData.packageTypes} unitTypes={loaderData.unitTypes} values={values} errors={actionData?.errors} />
          <button className={styles.primaryButton} type="submit">Verpakking opslaan</button>
        </Form>
      </section>
    </main>
  );
}

function PackageFields({ errors, packageTypes, unitTypes, values }: { readonly errors?: Record<string, string>; readonly packageTypes: ReadonlyArray<PackageTypeDto>; readonly unitTypes: ReadonlyArray<UnitTypeDto>; readonly values: Record<string, string> }): React.ReactNode {
  return (
    <>
      <label className={styles.label}>Verpakkingstype
        <select className={styles.input} name="packageTypeId" defaultValue={values.packageTypeId ?? ""} required>
          <option value="">Kies verpakkingstype</option>
          {packageTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={styles.label}>Inhoud
        <input className={styles.input} name="amount" defaultValue={values.amount ?? ""} placeholder="1,5" />
      </label>
      {errors?.amount ? <p className={styles.formError}>{errors.amount}</p> : null}
      <label className={styles.label}>Inhoudseenheid
        <select className={styles.input} name="unitTypeId" defaultValue={values.unitTypeId ?? ""} required>
          <option value="">Kies eenheid</option>
          {unitTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className={styles.label}>Aantal per verpakking
        <input className={styles.input} name="unitsPerPackage" type="number" defaultValue={values.unitsPerPackage ?? "1"} />
      </label>
    </>
  );
}
