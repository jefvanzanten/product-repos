import type { Route } from "./+types/product-catalog";
import { Link } from "react-router";
import styles from "./product-catalog.module.css";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Productcatalogus" }];
}

export function loader({ request }: Route.LoaderArgs) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  return { query };
}

export default function ProductCatalog({
  loaderData,
}: Route.ComponentProps): React.ReactNode {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Producten</h1>
      </header>

      <form action="/admin/product-catalogus/producten" className={styles.form}>
        <input
          className={styles.searchInput}
          defaultValue={loaderData.query}
          id="product-catalog-search"
          name="q"
          placeholder="Zoek product, merk, categorie of verpakking"
          type="search"
        />
      </form>

      <div className={styles.footer}>
        <Link
          className={styles.createLink}
          to="/admin/product-catalogus/producten/nieuw"
        >
          Product aanmaken
        </Link>
      </div>
    </main>
  );
}
