import type { CategoryDto } from "@product-repos/contracts";
import { AdminLink as Link } from "../../../../../admin-source-context";
import styles from "./category-breadcrumb.module.css";

/**
 * Render the breadcrumb for the currently browsed category path.
 *
 * @param props - The active category path.
 * @returns A breadcrumb navigation element.
 */
export function CategoryBreadcrumb({ path }: { readonly path: ReadonlyArray<CategoryDto> }): React.ReactNode {
  return (
    <nav className={styles.breadcrumb} aria-label="Categoriepad">
      <Link to="/product-catalogus">Alle categorieën</Link>
      {path.map((category) => <span key={category.id}>› <Link to={`/product-catalogus?categoryId=${category.id}`}>{category.name}</Link></span>)}
    </nav>
  );
}
