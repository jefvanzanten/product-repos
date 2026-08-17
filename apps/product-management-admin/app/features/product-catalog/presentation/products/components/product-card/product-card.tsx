import type { CatalogProductRow } from "../../../types/product-catalog.types";
import { AdminLink as Link } from "../../../../../../core/presentation/routing/admin-source-context";
import styles from "./product-card.module.css";

type ProductCardContext = {
  readonly categoryId?: number;
  readonly brandId?: string;
};

/**
 * Render a compact product link for catalog browse and search results.
 *
 * @param props - Product card data and optional navigation context.
 * @returns A product card link.
 */
export function ProductCard({ context, product, showCategory = false }: { readonly context?: ProductCardContext; readonly product: CatalogProductRow; readonly showCategory?: boolean }): React.ReactNode {
  const params = new URLSearchParams();
  if (context?.categoryId) params.set("categoryId", String(context.categoryId));
  if (context?.brandId) params.set("brandId", context.brandId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return (
    <Link className={styles.productCard} to={`/product-catalogus/${product.id}${suffix}`}>
      {product.imageUrl ? <img className={styles.productImage} src={product.imageUrl} alt={product.displayName} /> : null}
      <span className={styles.productDetails}>
        <strong>{product.displayName}</strong>
        {product.brand ? <span>Merk: {product.brand.name}</span> : null}
        {showCategory ? <span>Categorie: {product.categoryPath}</span> : null}
        <span>{product.packageSummary}</span>
      </span>
    </Link>
  );
}
