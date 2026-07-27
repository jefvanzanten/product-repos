import type { Route } from "./+types/product-catalog";
import { useEffect, useRef } from "react";
import { Form, Link, useSubmit } from "react-router";
import {
  browseCatalog,
  searchCatalog,
} from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import type {
  CatalogBrowseResponse,
  CatalogProductRow,
  CatalogSearchResponse,
} from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import styles from "./product-catalog.module.css";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Productcatalogus" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (query.length >= 2) {
    const searchLimits = {
      productLimit:
        parsePositiveInt(url.searchParams.get("productLimit")) ?? 20,
      brandLimit: parsePositiveInt(url.searchParams.get("brandLimit")) ?? 10,
      categoryLimit:
        parsePositiveInt(url.searchParams.get("categoryLimit")) ?? 10,
    };
    return {
      mode: "search" as const,
      query,
      search: await searchCatalog(query, searchLimits),
      searchLimits,
    };
  }
  if (query.length === 0) {
    const limit = parsePositiveInt(url.searchParams.get("limit")) ?? 50;
    const brandId = url.searchParams.get("brandId")?.trim() ?? "";
    if (brandId)
      return {
        mode: "browse" as const,
        query: "",
        browse: await browseCatalog({ brandId, limit }),
      };
    const categoryIdParam = url.searchParams.get("categoryId");
    const categoryId = parsePositiveInt(categoryIdParam);
    if (categoryIdParam !== null && categoryId === null)
      return {
        mode: "browse" as const,
        query: "",
        browse: {
          state: "invalidContext" as const,
          contextType: "category" as const,
          contextId: categoryIdParam,
        },
      };
    if (categoryId !== null)
      return {
        mode: "browse" as const,
        query: "",
        browse: await browseCatalog({ categoryId, limit }),
      };
  }
  return { mode: "browse" as const, query, browse: await browseCatalog() };
}

export default function ProductCatalog({
  loaderData,
}: Route.ComponentProps): React.ReactNode {
  const createAction = getCreateAction(loaderData);
  const showSearchForm = shouldShowSearchForm(loaderData);
  return (
    <main className={styles.page}>
      {showSearchForm ? (
        <CatalogSearchForm defaultQuery={loaderData.query} />
      ) : null}

      {loaderData.mode === "search" ? (
        <SearchResults
          query={loaderData.query}
          search={loaderData.search}
          searchLimits={loaderData.searchLimits}
        />
      ) : (
        <BrowseResults browse={loaderData.browse} />
      )}

      <div className={styles.footer}>
        <Link className={styles.createLink} to={createAction.href}>
          {createAction.label}
        </Link>
      </div>
    </main>
  );
}

function CatalogSearchForm({
  defaultQuery,
}: {
  readonly defaultQuery: string;
}): React.ReactNode {
  const submit = useSubmit();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return (
    <Form
      action="/admin/product-catalogus/producten"
      className={styles.form}
      method="get"
      preventScrollReset
    >
      <input
        className={styles.searchInput}
        defaultValue={defaultQuery}
        id="product-catalog-search"
        name="q"
        onChange={(event) => {
          const form = event.currentTarget.form;
          const nextQuery = event.currentTarget.value.trim();
          if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
          if (!form || (nextQuery.length > 0 && nextQuery.length < 2)) return;
          timeoutRef.current = setTimeout(
            () => submit(form, { replace: true, preventScrollReset: true }),
            300,
          );
        }}
        placeholder="Zoek product, merk of categorie"
        type="search"
      />
    </Form>
  );
}

function SearchResults({
  query,
  search,
  searchLimits,
}: {
  readonly query: string;
  readonly search: CatalogSearchResponse;
  readonly searchLimits: {
    readonly productLimit: number;
    readonly brandLimit: number;
    readonly categoryLimit: number;
  };
}): React.ReactNode {
  const hasResults =
    search.products.length > 0 ||
    search.brands.length > 0 ||
    search.categories.length > 0;
  if (!hasResults) {
    return (
      <section className={styles.emptyState}>
        <h2>Geen resultaten gevonden voor &quot;{query}&quot;.</h2>
        <p>Pas je zoekterm aan of maak een nieuw product aan.</p>
      </section>
    );
  }

  return (
    <div className={styles.results}>
      {search.products.length > 0 ? (
        <ProductSection
          products={search.products}
          title="Producten"
          moreLink={
            search.hasMore.products
              ? makeSearchMoreHref(query, searchLimits, "products")
              : undefined
          }
          moreLabel="Meer producten tonen"
        />
      ) : null}
      {search.brands.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Merken</h2>
          <ul className={styles.list}>
            {search.brands.map((brand) => (
              <li key={brand.id}>
                <Link
                  className={styles.cardLink}
                  to={`/admin/product-catalogus/producten?brandId=${encodeURIComponent(brand.id)}`}
                >
                  <span>{brand.name}</span>
                  <span className={styles.meta}>
                    {brand.productCount} producten
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {search.hasMore.brands ? (
            <Link
              className={styles.moreButton}
              to={makeSearchMoreHref(query, searchLimits, "brands")}
            >
              Meer merken tonen
            </Link>
          ) : null}
        </section>
      ) : null}
      {search.categories.length > 0 ? (
        <CategorySection
          categories={search.categories}
          title="Categorieën"
          moreLink={
            search.hasMore.categories
              ? makeSearchMoreHref(query, searchLimits, "categories")
              : undefined
          }
          moreLabel="Meer categorieën tonen"
        />
      ) : null}
    </div>
  );
}

function BrowseResults({
  browse,
}: {
  readonly browse: CatalogBrowseResponse;
}): React.ReactNode {
  if (browse.state === "root") {
    if (browse.isEmpty) {
      return (
        <section className={styles.emptyState}>
          <h2>Nog geen producten</h2>
          <p>Voeg je eerste product toe om de catalogus op te bouwen.</p>
        </section>
      );
    }
    return (
      <CategorySection categories={browse.categories} title="Categorieën" />
    );
  }

  if (browse.state === "category") {
    const categoryName = browse.category.name;
    return (
      <div className={styles.results}>
        <CategoryBreadcrumb categoryPath={browse.categoryPath} />
        {browse.subcategories.length > 0 ? (
          <CategorySection
            categories={browse.subcategories}
            showFullPath={false}
            title="Subcategorieën"
          />
        ) : null}
        {browse.products.items.length > 0 ? (
          <ProductSection
            products={browse.products.items}
            showCategoryMeta={false}
            title={`Producten in ${categoryName}`}
          />
        ) : null}
        {browse.subcategories.length === 0 &&
        browse.products.items.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>Nog geen producten in deze categorie.</h2>
          </section>
        ) : null}
        {browse.products.hasMore && browse.products.cursor ? (
          <Link
            className={styles.moreButton}
            to={`/admin/product-catalogus/producten?categoryId=${browse.category.id}&limit=${encodeURIComponent(browse.products.cursor)}`}
          >
            Meer laden
          </Link>
        ) : null}
      </div>
    );
  }

  if (browse.state === "brand") {
    return (
      <div className={styles.results}>
        {browse.productGroups.length === 0 ? (
          <section className={styles.emptyState}>
            <h2>Nog geen producten voor {browse.brand.name}.</h2>
          </section>
        ) : (
          browse.productGroups.map((group) => (
            <ProductSection
              key={group.categoryPath}
              products={group.products}
              title={group.categoryPath}
            />
          ))
        )}
        {browse.hasMore && browse.cursor ? (
          <Link
            className={styles.moreButton}
            to={`/admin/product-catalogus/producten?brandId=${encodeURIComponent(browse.brand.id)}&limit=${encodeURIComponent(browse.cursor)}`}
          >
            Meer laden
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <section className={styles.emptyState}>
      <h2>
        {browse.contextType === "brand"
          ? "Dit merk bestaat niet."
          : "Deze categorie bestaat niet."}
      </h2>
      <p>Controleer de link of ga terug naar de productcatalogus.</p>
      <Link className={styles.cardLink} to="/admin/product-catalogus/producten">
        Terug naar productcatalogus
      </Link>
    </section>
  );
}

function ProductSection({
  moreLabel,
  moreLink,
  products,
  showCategoryMeta = true,
  title,
}: {
  readonly moreLabel?: string;
  readonly moreLink?: string;
  readonly products: ReadonlyArray<CatalogProductRow>;
  readonly showCategoryMeta?: boolean;
  readonly title: string;
}): React.ReactNode {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.list}>
        {products.map((product) => (
          <li key={product.id}>
            <Link
              className={styles.cardLink}
              to={`/admin/product-catalogus/producten/${encodeURIComponent(product.id)}`}
            >
              <span>{product.displayName}</span>
              <span className={styles.meta}>
                {product.brand ? `Merk: ${product.brand.name}` : "Merkloos"}
              </span>
              {showCategoryMeta ? (
                <span className={styles.meta}>
                  Categorie: {product.categoryPath}
                </span>
              ) : null}
              <span className={styles.meta}>{product.packageSummary}</span>
            </Link>
          </li>
        ))}
      </ul>
      {moreLink ? (
        <Link className={styles.moreButton} to={moreLink}>
          {moreLabel ?? "Meer tonen"}
        </Link>
      ) : null}
    </section>
  );
}

function CategorySection({
  categories,
  moreLabel,
  moreLink,
  showFullPath = true,
  title,
}: {
  readonly categories: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly path: string;
    readonly productCount: number;
  }>;
  readonly moreLabel?: string;
  readonly moreLink?: string;
  readonly showFullPath?: boolean;
  readonly title: string;
}): React.ReactNode {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.list}>
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              className={styles.cardLink}
              to={`/admin/product-catalogus/producten?categoryId=${category.id}`}
            >
              <span>{showFullPath ? category.path : category.name}</span>
              <span className={styles.meta}>
                {category.productCount} producten
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {moreLink ? (
        <Link className={styles.moreButton} to={moreLink}>
          {moreLabel ?? "Meer tonen"}
        </Link>
      ) : null}
    </section>
  );
}

function CategoryBreadcrumb({
  categoryPath,
}: {
  readonly categoryPath: Extract<
    CatalogBrowseResponse,
    { readonly state: "category" }
  >["categoryPath"];
}): React.ReactNode {
  return (
    <nav aria-label="Categoriepad" className={styles.breadcrumb}>
      <ol className={styles.breadcrumbList}>
        <li className={styles.breadcrumbItem}>
          <Link className={styles.breadcrumbLink} to="/admin/product-catalogus/producten">
            Alle categorieën
          </Link>
        </li>
        {categoryPath.map((category, index) => {
          const isCurrent = index === categoryPath.length - 1;
          return (
            <li className={styles.breadcrumbItem} key={category.id}>
              {isCurrent ? (
                <span aria-current="page">{category.name}</span>
              ) : (
                <Link
                  className={styles.breadcrumbLink}
                  to={`/admin/product-catalogus/producten?categoryId=${category.id}`}
                >
                  {category.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function shouldShowSearchForm(
  loaderData: Awaited<ReturnType<typeof loader>>,
): boolean {
  return !(
    loaderData.mode === "browse" && loaderData.browse.state === "category"
  );
}

function getCreateAction(loaderData: Awaited<ReturnType<typeof loader>>): {
  readonly href: string;
  readonly label: string;
} {
  const baseHref = "/admin/product-catalogus/producten/nieuw";
  if (loaderData.mode === "search")
    return { href: baseHref, label: "Product aanmaken" };
  if (loaderData.browse.state === "category")
    return {
      href: `${baseHref}?categoryId=${loaderData.browse.category.id}`,
      label: "Product aanmaken",
    };
  if (loaderData.browse.state === "brand")
    return {
      href: `${baseHref}?brandId=${encodeURIComponent(loaderData.browse.brand.id)}`,
      label: `Product aanmaken voor ${loaderData.browse.brand.name}`,
    };
  if (loaderData.browse.state === "root" && loaderData.browse.isEmpty)
    return { href: baseHref, label: "Eerste product aanmaken" };
  return { href: baseHref, label: "Product aanmaken" };
}

function makeSearchMoreHref(
  query: string,
  searchLimits: {
    readonly productLimit: number;
    readonly brandLimit: number;
    readonly categoryLimit: number;
  },
  group: "brands" | "categories" | "products",
): string {
  const params = new URLSearchParams({ q: query });
  params.set(
    "productLimit",
    String(
      group === "products"
        ? searchLimits.productLimit + 20
        : searchLimits.productLimit,
    ),
  );
  params.set(
    "brandLimit",
    String(
      group === "brands"
        ? searchLimits.brandLimit + 10
        : searchLimits.brandLimit,
    ),
  );
  params.set(
    "categoryLimit",
    String(
      group === "categories"
        ? searchLimits.categoryLimit + 10
        : searchLimits.categoryLimit,
    ),
  );
  return `/admin/product-catalogus/producten?${params.toString()}`;
}

function parsePositiveInt(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
