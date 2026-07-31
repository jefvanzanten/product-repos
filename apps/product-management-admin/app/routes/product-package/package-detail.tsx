import { useEffect, useState } from "react";
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
  PackageDetailActionResult,
  PackageDetailLoaderData,
  ProductPackageWithProductId,
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
            <PackageContentFields errors={actionData?.errors} packageTypes={loaderData.packageTypes} unitTypes={loaderData.unitTypes} values={actionData?.values ?? packageToValues(packageDetail)} variant="light" />
            <div className={styles.actions}>
              <button className={styles.primaryButton} type="submit">Opslaan</button>
              <button className={styles.secondaryButton} type="button" onClick={() => setEditing(false)}>Annuleren</button>
            </div>
          </Form>
        ) : (
          <section className={styles.form}>
            <h2 className={styles.sectionTitle}>Verpakking</h2>
            <dl className={styles.definitionList}>
              <div><dt>Verpakkingstype</dt><dd>{packageDetail.packageType.name}</dd></div>
              <div><dt>Volledige inhoud</dt><dd>{packageDetail.unitContent.amount} {packageDetail.unitContent.unitType.name}</dd></div>
              {packageDetail.portion === null ? null : (
                <>
                  <div><dt>Portie of stuk</dt><dd>{packageDetail.portion.name}</dd></div>
                  <div><dt>Portiegrootte</dt><dd>{packageDetail.portion.unitContent.amount} {packageDetail.portion.unitContent.unitType.name}</dd></div>
                  <div><dt>Aantal in verpakking</dt><dd>{packageDetail.portion.portionsPerPackage ?? "Niet opgegeven"}</dd></div>
                </>
              )}
              <div><dt>Samenvatting</dt><dd>{packageDetail.summary}</dd></div>
            </dl>
            <button className={styles.secondaryButton} type="button" onClick={() => setEditing(true)}>Verpakking bewerken</button>
          </section>
        )}
      </section>
    </main>
  );
}

function packageToValues(packageDetail: ProductPackageWithProductId): Record<string, string> {
  return {
    packageTypeId: String(packageDetail.packageType.id),
    amount: packageDetail.unitContent.amount,
    unitTypeId: String(packageDetail.unitContent.unitType.id),
    portionEnabled: packageDetail.portion === null ? "" : "on",
    portionName: packageDetail.portion?.name ?? "",
    portionAmount: packageDetail.portion?.unitContent.amount ?? "",
    portionUnitTypeId: packageDetail.portion === null ? "" : String(packageDetail.portion.unitContent.unitType.id),
    portionsPerPackage: packageDetail.portion?.portionsPerPackage === null || packageDetail.portion === null ? "" : String(packageDetail.portion.portionsPerPackage),
  };
}
