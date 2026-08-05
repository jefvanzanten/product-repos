import type { CatalogSearchResponse } from "@product-repos/contracts";
import { AdminLink as Link } from "../../../../../admin-source-context";
import { ProductCard } from "../../../products/components/product-card/product-card";
import { EmptyState } from "../empty-state/empty-state";
import styles from "./search-results.module.css";

/**
 * Render product, brand, and category search results for the catalog.
 *
 * @param props - The catalog search response.
 * @returns Search results grouped by result type.
 */
export function SearchResults({ search }: { readonly search: CatalogSearchResponse }): React.ReactNode {
  const empty = search.products.length === 0 && search.brands.length === 0 && search.categories.length === 0;
  if (empty) return <EmptyState title="Geen resultaten gevonden." text="Pas je zoekterm aan of kies een categorie om een product aan te maken." />;
  return (
    <div className={styles.searchResults}>
      {search.products.length > 0 ? <ResultGroup title="Producten">{search.products.map((product) => <ProductCard key={product.id} product={product} showCategory />)}</ResultGroup> : null}
      {search.brands.length > 0 ? <ResultGroup title="Merken">{search.brands.map((brand) => <Link key={brand.id} className={styles.resultRow} to={`/product-catalogus?brandId=${brand.id}`}><strong>{brand.name}</strong><span>{brand.productCount} producten</span></Link>)}</ResultGroup> : null}
      {search.categories.length > 0 ? <ResultGroup title="Categorieën">{search.categories.map((category) => <Link key={category.id} className={styles.resultRow} to={`/product-catalogus?categoryId=${category.id}`}><strong>{category.path}</strong><span>{category.productCount} producten</span></Link>)}</ResultGroup> : null}
    </div>
  );
}

function ResultGroup({ children, title }: { readonly children: React.ReactNode; readonly title: string }): React.ReactNode {
  return <section className={styles.resultGroup}><h2 className={styles.cardTitle}>{title}</h2>{children}</section>;
}
