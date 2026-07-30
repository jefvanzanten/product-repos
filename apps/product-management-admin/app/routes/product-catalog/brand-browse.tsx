import type { CatalogBrowseResponse } from "@product-repos/contracts";
import { AdminLink as Link } from "../../admin-source-context";
import actions from "./catalog-actions.module.css";
import { EmptyState } from "./empty-state";
import { ProductCard } from "./product-card";
import styles from "./brand-browse.module.css";

type BrandBrowseResponse = Extract<CatalogBrowseResponse, { readonly state: "brand" }>;

/**
 * Render catalog products grouped by category for a selected brand.
 *
 * @param props - The brand browse response.
 * @returns A brand browse view with product creation affordance.
 */
export function BrandBrowse({ browse }: { readonly browse: BrandBrowseResponse }): React.ReactNode {
  return (
    <>
      <h2 className={styles.cardTitle}>Producten van {browse.brand.name}</h2>
      {browse.productGroups.length === 0 ? <EmptyState title="Geen producten gevonden voor dit merk." /> : browse.productGroups.map((group) => (
        <section key={group.category.id} className={styles.productGroup}>
          <h3 className={styles.groupTitle}>{group.categoryPath}</h3>
          {group.products.map((product) => <ProductCard key={product.id} product={product} context={{ brandId: browse.brand.id }} showCategory={false} />)}
        </section>
      ))}
      <div className={actions.cardActions}>
        <Link className={actions.primaryLink} to={`/product-catalogus/nieuw?brandId=${browse.brand.id}`}>Product aanmaken voor {browse.brand.name}</Link>
      </div>
    </>
  );
}
