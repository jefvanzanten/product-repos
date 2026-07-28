import { catalogHref, withCatalogState } from "../../catalog-navigation";
import { cssModule } from "../../css-modules";
import { AdminPage } from "../../components/AdminPage/AdminPage";
import { ProductForm } from "../../components/ProductForm/ProductForm";
import type { CatalogUrlState } from "../../models/catalog-navigation.model";
import type { ProductCreateModel } from "../../models/product-create.model";
import type { ProductFormValues } from "../../form-parsing";

const styles = cssModule("ProductCreatePage", ["backLink", "contentCard"] as const);

/** Render the product creation page. */
export function ProductCreatePage(props: { readonly references: ProductCreateModel; readonly values: ProductFormValues; readonly errors: Readonly<Record<string, string>>; readonly catalogState: CatalogUrlState }) {
  return (
    <AdminPage title="Product aanmaken" subtitle="Vul categorie, merk, product en verpakking in.">
      <a class={styles.backLink} href={catalogHref(props.catalogState)}>&lt;- Productcatalogus</a>
      <div class={styles.contentCard}>
        <ProductForm action={withCatalogState("/admin/product-catalogus/nieuw", props.catalogState)} mode="create" references={props.references} values={props.values} errors={props.errors} submitLabel="Product opslaan" />
      </div>
    </AdminPage>
  );
}
