import type {
  CatalogBrowseResponse,
  CatalogSearchResponse,
} from "@product-repos/contracts";
import { catalogHref } from "../../catalog-navigation";
import { cssModule } from "../../css-modules";
import type { CatalogIndexModel } from "../../models/catalog-index.model";
import type { CatalogUrlState } from "../../models/catalog-navigation.model";
import { CategoryLinkList, RootCategoryAccordion } from "../CategoryTree/CategoryTree";
import { ProductRow } from "../ProductRow/ProductRow";

const styles = cssModule("CatalogSearch", [
  "searchForm",
  "contentCard",
  "stack",
  "emptyState",
  "categoryResults",
  "browseBody",
  "resultList",
  "linkList",
  "muted",
  "button",
  "secondaryButton",
  "actionRow",
] as const);

/** Render the progressively enhanced catalog search form. */
export function CatalogSearchForm(props: { readonly query: string }) {
  return (
    <form
      class={styles.searchForm}
      method="get"
      action="/admin/product-catalogus"
      hx-get="/admin/product-catalogus"
      hx-trigger="keyup changed delay:300ms, submit"
      hx-target="#catalog-frame"
      hx-push-url="true"
    >
      <input
        id="q"
        name="q"
        value={props.query}
        placeholder="Zoek product, merk of categorie"
        autocomplete="off"
      />
      <button type="submit">Zoeken</button>
    </form>
  );
}

/** Render the HTMX-replaceable catalog frame contents. */
export function CatalogFrameContents(props: {
  readonly model: CatalogIndexModel;
}) {
  return <CatalogContent model={props.model} />;
}

/** Render the replaceable catalog content fragment. */
export function CatalogContent(props: {
  readonly model: CatalogIndexModel;
}) {
  return (
    <section id="catalog-content" class={styles.contentCard}>
      {props.model.search ? (
        <SearchResults
          query={props.model.state.q.trim()}
          results={props.model.search}
          state={props.model.state}
        />
      ) : null}
      {props.model.browse ? (
        <BrowseResults
          browse={props.model.browse}
          rootCategories={props.model.rootCategories}
          categoryTree={props.model.categoryTree}
          state={props.model.state}
        />
      ) : null}
    </section>
  );
}

function SearchResults(props: {
  readonly query: string;
  readonly results: CatalogSearchResponse;
  readonly state: CatalogUrlState;
}) {
  const hasResults =
    props.results.products.length > 0 ||
    props.results.brands.length > 0 ||
    props.results.categories.length > 0;
  if (!hasResults) {
    return (
      <div class={styles.emptyState}>
        <p>Geen resultaten gevonden voor &quot;{props.query}&quot;.</p>
        <p>Pas je zoekterm aan of kies een categorie om een product aan te maken.</p>
      </div>
    );
  }

  return (
    <div class={styles.stack}>
      {props.results.products.length > 0 ? (
        <section>
          <h2>Producten</h2>
          <ul class={styles.resultList}>
            {props.results.products.map((product) => (
              <ProductRow product={product} catalogState={props.state} />
            ))}
          </ul>
          {props.results.hasMore.products ? (
            <p class={styles.muted}>Meer producten beschikbaar.</p>
          ) : null}
        </section>
      ) : null}
      {props.results.brands.length > 0 ? (
        <section>
          <h2>Merken</h2>
          <ul class={styles.linkList}>
            {props.results.brands.map((brand) => (
              <li>
                <a
                  href={`/admin/product-catalogus?brandId=${brand.id}`}
                  hx-get={`/admin/product-catalogus?brandId=${brand.id}`}
                  hx-target="#catalog-frame"
                  hx-push-url="true"
                >
                  {brand.name}
                </a>{" "}
                <span class={styles.muted}>{brand.productCount} producten</span>
              </li>
            ))}
          </ul>
          {props.results.hasMore.brands ? (
            <p class={styles.muted}>Meer merken beschikbaar.</p>
          ) : null}
        </section>
      ) : null}
      {props.results.categories.length > 0 ? (
        <section class={styles.categoryResults}>
          <h2>Categorieën</h2>
          <CategoryLinkList categories={props.results.categories} />
          {props.results.hasMore.categories ? (
            <p class={styles.muted}>Meer categorieën beschikbaar.</p>
          ) : null}
        </section>
      ) : null}

    </div>
  );
}

function BrowseResults(props: {
  readonly browse: CatalogBrowseResponse;
  readonly rootCategories: CatalogIndexModel["rootCategories"];
  readonly categoryTree: CatalogIndexModel["categoryTree"];
  readonly state: CatalogUrlState;
}) {
  switch (props.browse.state) {
    case "root":
      return (
        <div class={styles.stack}>
          <div class={styles.browseBody}>
            <section>
              <h2>Alle categorieën</h2>
              {props.rootCategories.length === 0 ? (
                <div class={styles.emptyState}>
                  <p>Er zijn geen categorieën gevonden.</p>
                  <p>Maak je eerste categorie aan om de catalogus op te bouwen.</p>
                </div>
              ) : (
                <RootCategoryAccordion model={{ categoryTree: props.categoryTree, openPathIds: [], openCategory: null, limit: props.state.limit }} />
              )}
            </section>
          </div>
          <a
            class={styles.button}
            href="/admin/product-catalogus/categorieen/nieuw"
            hx-get="/admin/product-catalogus/categorieen/nieuw"
            hx-target="#modal-root"
            hx-swap="innerHTML"
          >
            Categorie aanmaken
          </a>
        </div>
      );
    case "category":
      return (
        <div class={styles.stack}>
          <h2>{props.browse.category.name}</h2>
          <div class={styles.browseBody}>
            <RootCategoryAccordion model={{ categoryTree: props.categoryTree, openPathIds: props.browse.categoryPath.map((category) => category.id), openCategory: props.browse, limit: props.state.limit }} />
            {props.browse.products.hasMore &&
            props.browse.products.cursor !== null ? (
              <a
                class={styles.secondaryButton}
                href={catalogHref({ q: "", brandId: undefined, categoryId: props.browse.category.id, limit: Number(props.browse.products.cursor) })}
              >
                Meer laden
              </a>
            ) : null}
          </div>

        </div>
      );
    case "brand": {
      const brandState = { q: "", brandId: props.browse.brand.id, categoryId: undefined, limit: props.state.limit };
      return (
        <div class={styles.stack}>
          <h2>Producten van {props.browse.brand.name}</h2>
          {props.browse.productGroups.map((group) => (
            <section>
              <h3>{group.categoryPath}</h3>
              <ul class={styles.resultList}>
                {group.products.map((product) => (
                  <ProductRow product={product} catalogState={brandState} />
                ))}
              </ul>
            </section>
          ))}
          {props.browse.hasMore && props.browse.cursor !== null ? (
            <a
              class={styles.secondaryButton}
              href={catalogHref({ q: "", brandId: props.browse.brand.id, categoryId: undefined, limit: Number(props.browse.cursor) })}
            >
              Meer laden
            </a>
          ) : null}
          <a
            class={styles.button}
            href={`/admin/product-catalogus/nieuw?brandId=${props.browse.brand.id}`}
          >
            Product aanmaken voor {props.browse.brand.name}
          </a>
        </div>
      );
    }
    case "invalidContext":
      return <p>Context niet gevonden.</p>;
  }
}

