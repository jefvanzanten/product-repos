import type { CatalogProductRow, ProductPackageDto } from "@product-repos/contracts";
import { withCatalogState } from "../../catalog-navigation";
import { cssModule } from "../../css-modules";
import type { CatalogUrlState } from "../../models/catalog-navigation.model";

const styles = cssModule("ProductRow", ["row"] as const);

/** Render one catalog product row linking to product detail. */
export function ProductRow(props: { readonly product: CatalogProductRow; readonly catalogState?: CatalogUrlState }) {
  const href = props.catalogState === undefined
    ? `/admin/product-catalogus/${props.product.id}`
    : withCatalogState(`/admin/product-catalogus/${props.product.id}`, props.catalogState);
  return (
    <li class={styles.row}>
      <a href={href}>
        <strong>{props.product.displayName}</strong>
        <span>{props.product.brand ? `Merk: ${props.product.brand.name}` : "Merk: -"}</span>
        <span>{props.product.packageSummary}</span>
      </a>
    </li>
  );
}

/** Render a package row linking to package detail. */
export function PackageRow(props: { readonly productId: string; readonly productPackage: ProductPackageDto; readonly catalogState?: CatalogUrlState }) {
  const href = props.catalogState === undefined
    ? `/admin/product-catalogus/${props.productId}/verpakkingen/${props.productPackage.id}`
    : withCatalogState(`/admin/product-catalogus/${props.productId}/verpakkingen/${props.productPackage.id}`, props.catalogState);
  return (
    <li class={styles.row}>
      <a href={href}>
        <strong>{props.productPackage.summary}</strong>
        <span>Aantal per verpakking: {props.productPackage.unitsPerPackage}</span>
      </a>
    </li>
  );
}
