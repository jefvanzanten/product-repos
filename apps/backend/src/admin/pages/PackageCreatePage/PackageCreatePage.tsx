import type { ProductDetailDto } from "@product-repos/contracts";
import { withCatalogState } from "../../catalog-navigation";
import { cssModule } from "../../css-modules";
import { AdminPage } from "../../components/AdminPage/AdminPage";
import { PackageForm } from "../../components/PackageForm/PackageForm";
import type { CatalogUrlState } from "../../models/catalog-navigation.model";
import type { CatalogReferenceData } from "../../models/reference-data.model";
import type { PackageFormValues } from "../../form-parsing";

const styles = cssModule("PackageCreatePage", ["backLink", "contentCard"] as const);

/** Render the package creation page for one product. */
export function PackageCreatePage(props: { readonly product: ProductDetailDto; readonly references: CatalogReferenceData; readonly values: PackageFormValues; readonly errors: Readonly<Record<string, string>>; readonly catalogState: CatalogUrlState }) {
  return (
    <AdminPage title="Verpakking toevoegen" subtitle={props.product.displayName}>
      <a class={styles.backLink} href={withCatalogState(`/admin/product-catalogus/${props.product.id}`, props.catalogState)}>Terug naar product</a>
      <div class={styles.contentCard}>
        <PackageForm action={withCatalogState(`/admin/product-catalogus/${props.product.id}/verpakkingen/nieuw`, props.catalogState)} references={props.references} values={props.values} errors={props.errors} submitLabel="Verpakking opslaan" />
      </div>
    </AdminPage>
  );
}
