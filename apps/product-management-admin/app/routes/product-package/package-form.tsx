import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { AdminForm as Form, AdminLink as Link } from "../../admin-source-context";
import { requireAdministrator } from "../../auth.server";
import { PackageContentFields } from "../../features/admin/product-forms/package-content-fields";
import type {
  PackageFormActionResult,
  PackageFormLoaderData,
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
          <PackageContentFields errors={actionData?.errors} packageTypes={loaderData.packageTypes} unitTypes={loaderData.unitTypes} values={values} variant="light" />
          <button className={styles.primaryButton} type="submit">Verpakking opslaan</button>
        </Form>
      </section>
    </main>
  );
}
