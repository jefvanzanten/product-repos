import type { Category } from "../../../../domain/product-catalog";
import { AdminLink as Link } from "../../../../../../core/presentation/routing/admin-source-context";
import styles from "./category-breadcrumb.module.css";

/**
 * Render the breadcrumb for the currently browsed category path.
 *
 * @param props - The active category path.
 * @returns A breadcrumb navigation element.
 */
export function CategoryBreadcrumb({ path }: { readonly path: ReadonlyArray<Category> }): React.ReactNode {
  return (
    <nav className={styles.breadcrumb} aria-label="Categoriepad">
      <Link to="/product-catalogus">Alle categorieën</Link>
      {path.map((category) => <span key={category.id}>› <Link to={`/product-catalogus?categoryId=${category.id}`}>{category.name}</Link></span>)}
    </nav>
  );
}
