import type { ProductDetailDto } from "@product-repos/contracts";
import { catalogHref, withCatalogState } from "../../catalog-navigation";
import { cssModule } from "../../css-modules";
import { AdminPage } from "../../components/AdminPage/AdminPage";
import { ProductForm } from "../../components/ProductForm/ProductForm";
import { PackageRow } from "../../components/ProductRow/ProductRow";
import type { CatalogUrlState } from "../../models/catalog-navigation.model";
import type { ProductCreateModel } from "../../models/product-create.model";
import type { ProductFormValues } from "../../form-parsing";

const styles = cssModule("ProductDetailPage", ["backLink", "breadcrumb", "breadcrumbLink", "contentCard", "stack", "resultList", "definitionList", "button", "secondaryButton"] as const);

/** Render product detail in read-only or edit mode. */
export function ProductDetailPage(props: {
  readonly product: ProductDetailDto;
  readonly edit: boolean;
  readonly references: ProductCreateModel | null;
  readonly values: ProductFormValues | null;
  readonly errors: Readonly<Record<string, string>>;
  readonly catalogState: CatalogUrlState;
}) {
  const categoryPath = props.product.categoryPath.map((category) => category.name).join(" > ");
  return (
    <AdminPage title={props.product.displayName} subtitle={<CategoryBreadcrumb items={props.product.categoryPath} />}>
      <a class={styles.backLink} href={catalogHref(props.catalogState)}>Terug naar productcatalogus</a>
      <div class={`${styles.contentCard} ${styles.stack}`}>
        {props.edit && props.references && props.values ? (
          <ProductForm action={withCatalogState(`/admin/product-catalogus/${props.product.id}`, props.catalogState)} mode="edit" references={props.references} values={props.values} errors={props.errors} submitLabel="Opslaan" />
        ) : (
          <ProductReadOnly product={props.product} categoryPath={categoryPath} catalogState={props.catalogState} />
        )}
        <section>
          <h2>Verpakkingen</h2>
          {props.product.packages.length > 0 ? (
            <ul class={styles.resultList}>{props.product.packages.map((productPackage) => <PackageRow productId={props.product.id} productPackage={productPackage} catalogState={props.catalogState} />)}</ul>
          ) : <p>Geen verpakkingen gevonden voor dit product.</p>}
          <a class={styles.button} href={withCatalogState(`/admin/product-catalogus/${props.product.id}/verpakkingen/nieuw`, props.catalogState)}>Verpakking toevoegen</a>
        </section>
      </div>
    </AdminPage>
  );
}

function CategoryBreadcrumb(props: { readonly items: ProductDetailDto["categoryPath"] }) {
  return (
    <nav class={styles.breadcrumb} aria-label="Categoriepad">
      <a class={styles.breadcrumbLink} href="/admin/product-catalogus">Alle categorieën</a>
      {props.items.map((item) => (
        <span>
          {" "}
          &gt;{" "}
          <a class={styles.breadcrumbLink} href={`/admin/product-catalogus?categoryId=${item.id}`}>{item.name}</a>
        </span>
      ))}
    </nav>
  );
}

function ProductReadOnly(props: { readonly product: ProductDetailDto; readonly categoryPath: string; readonly catalogState: CatalogUrlState }) {
  return (
    <section>
      <h2>Productgegevens</h2>
      <dl class={styles.definitionList}>
        <dt>Categorie</dt><dd>{props.categoryPath}</dd>
        <dt>Merk</dt><dd>{props.product.brand?.name ?? "-"}</dd>
        <dt>Productnaam</dt><dd>{props.product.name}</dd>
        <dt>Weergavenaam</dt><dd>{props.product.displayName}</dd>
      </dl>
      <a class={styles.secondaryButton} aria-label="Product bewerken" href={withCatalogState(`/admin/product-catalogus/${props.product.id}?edit=product`, props.catalogState)}>Product bewerken</a>
    </section>
  );
}
