import { Form } from "react-router";
import styles from "./search-form.module.css";

/**
 * Render the product catalog search form.
 *
 * @param props - The initial search query for the input.
 * @returns A GET search form for the catalog page.
 */
export function SearchForm({ defaultQuery }: { readonly defaultQuery: string }): React.ReactNode {
  return (
    <Form action="/admin/product-catalogus" className={styles.searchForm} method="get">
      <input
        className={styles.searchInput}
        defaultValue={defaultQuery}
        id="product-catalog-search"
        name="q"
        placeholder="Zoek product, merk of categorie"
        type="search"
      />
      <button className={styles.searchButton} type="submit">Zoeken</button>
    </Form>
  );
}
