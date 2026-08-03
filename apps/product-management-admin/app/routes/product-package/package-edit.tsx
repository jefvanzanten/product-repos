import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { AdminForm as Form, AdminLink as Link } from "../../admin-source-context";
import { requireAdministrator } from "../../auth.server";
import { PackageContentFields } from "../../features/admin/product-forms/package-content-fields";
import { PackageImageUpload } from "./package-image-upload";
import type {
  PackageEditActionResult,
  PackageEditLoaderData,
  ProductPackageWithProductId,
} from "./product-package-route.types";
import styles from "./product-package.module.css";
import {
  handlePackageEditRouteAction,
  loadPackageEditRoute,
} from "./package-edit-route.server";

/**
 * Return metadata for the package-edit route.
 *
 * @returns Route metadata.
 */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Verpakking bewerken" }];
}

/**
 * Load the protected package-edit form and its reference data.
 *
 * @param args - React Router loader arguments.
 * @returns Package edit data or a not-found state.
 */
export async function loader(args: LoaderFunctionArgs): Promise<PackageEditLoaderData> {
  await requireAdministrator(args.request);
  return loadPackageEditRoute(args);
}

/**
 * Handle a protected package edit.
 *
 * @param args - React Router action arguments.
 * @returns Validation state or a successful redirect.
 */
export async function action(args: ActionFunctionArgs): Promise<PackageEditActionResult | Response> {
  await requireAdministrator(args.request);
  return handlePackageEditRouteAction(args);
}

/**
 * Render the dedicated package-edit page without an intermediate detail state.
 *
 * @returns Package-edit page.
 */
export default function PackageEdit(): React.ReactNode {
  const actionData = useActionData<PackageEditActionResult>();
  const loaderData = useLoaderData<PackageEditLoaderData>();

  if (!loaderData.found) {
    return <main className={styles.page}><section className={styles.card}><p>{loaderData.productFound ? "Verpakking niet gevonden." : "Product niet gevonden."}</p><Link className={styles.primaryLink} to="/product-catalogus">Terug naar productcatalogus</Link></section></main>;
  }

  const productUrl = `/product-catalogus/${loaderData.product.id}${loaderData.context}`;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to={productUrl}>Terug naar product</Link>
        <h1 className={styles.title}>Verpakking bewerken</h1>
        <p className={styles.intro}>{loaderData.product.displayName}</p>
      </header>
      <section className={styles.card}>
        <Form className={styles.form} encType="multipart/form-data" method="post">
          {actionData?.errors?.form ? <p className={styles.formError}>{actionData.errors.form}</p> : null}
          <PackageImageUpload error={actionData?.errors?.image} imageUrl={loaderData.packageDetail.imageUrl} productName={loaderData.product.displayName} />
          <PackageContentFields errors={actionData?.errors} packageTypes={loaderData.packageTypes} unitTypes={loaderData.unitTypes} values={actionData?.values ?? packageToValues(loaderData.packageDetail)} variant="light" />
          <div className={styles.actions}>
            <Link className={styles.secondaryButton} to={productUrl}>Annuleren</Link>
            <button className={styles.primaryButton} type="submit">Wijzigingen opslaan</button>
          </div>
        </Form>
      </section>
    </main>
  );
}

/**
 * Convert package protocol data into editable package-content values.
 *
 * @param packageDetail - Current package protocol data.
 * @returns Form-compatible string values.
 */
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
