import type { ProductDetailDto, ProductPackageDetailDto } from "@product-repos/contracts";
import { withCatalogState } from "../../catalog-navigation";
import { cssModule } from "../../css-modules";
import { AdminPage } from "../../components/AdminPage/AdminPage";
import { PackageForm } from "../../components/PackageForm/PackageForm";
import type { CatalogUrlState } from "../../models/catalog-navigation.model";
import type { CatalogReferenceData } from "../../models/reference-data.model";
import type { PackageFormValues } from "../../form-parsing";

const styles = cssModule("PackageDetailPage", ["backLink", "contentCard", "definitionList", "secondaryButton"] as const);

/** Render package detail in read-only or edit mode. */
export function PackageDetailPage(props: { readonly product: ProductDetailDto; readonly productPackage: ProductPackageDetailDto; readonly edit: boolean; readonly references: CatalogReferenceData | null; readonly values: PackageFormValues | null; readonly errors: Readonly<Record<string, string>>; readonly catalogState: CatalogUrlState }) {
  return (
    <AdminPage title="Verpakking" subtitle={props.product.displayName}>
      <a class={styles.backLink} href={withCatalogState(`/admin/product-catalogus/${props.product.id}`, props.catalogState)}>Terug naar product</a>
      <div class={styles.contentCard}>
        {props.edit && props.references && props.values ? (
          <PackageForm action={withCatalogState(`/admin/product-catalogus/${props.product.id}/verpakkingen/${props.productPackage.id}`, props.catalogState)} references={props.references} values={props.values} errors={props.errors} submitLabel="Opslaan" />
        ) : (
          <PackageReadOnly productId={props.product.id} productPackage={props.productPackage} catalogState={props.catalogState} />
        )}
      </div>
    </AdminPage>
  );
}

function PackageReadOnly(props: { readonly productId: string; readonly productPackage: ProductPackageDetailDto; readonly catalogState: CatalogUrlState }) {
  return (
    <section>
      <h2>Verpakking</h2>
      <dl class={styles.definitionList}>
        <dt>Type</dt><dd>{props.productPackage.packageType.name}</dd>
        <dt>Inhoud</dt><dd>{props.productPackage.unitContent.amount} {props.productPackage.unitContent.unitType.name}</dd>
        <dt>Aantal per verpakking</dt><dd>{props.productPackage.unitsPerPackage}</dd>
        <dt>Eenheidsoort</dt><dd>{props.productPackage.packageType.name}</dd>
        <dt>Samenvatting</dt><dd>{props.productPackage.summary}</dd>
      </dl>
      <a class={styles.secondaryButton} aria-label="Verpakking bewerken" href={withCatalogState(`/admin/product-catalogus/${props.productId}/verpakkingen/${props.productPackage.id}?edit=1`, props.catalogState)}>Verpakking bewerken</a>
    </section>
  );
}
