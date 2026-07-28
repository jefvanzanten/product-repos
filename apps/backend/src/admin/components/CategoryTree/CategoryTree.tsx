import type { CatalogCategoryBrowseResponse } from "@product-repos/contracts";
import { catalogHref, withCatalogState } from "../../catalog-navigation";
import { cssModule } from "../../css-modules";
import type { CatalogUrlState } from "../../models/catalog-navigation.model";
import type { CategoryWithPath } from "../../models/category.model";
import type { CategoryAccordionNode, RootCategoryAccordionModel } from "../../models/category-tree.model";
import { ProductRow } from "../ProductRow/ProductRow";

const styles = cssModule("CategoryTree", [
  "linkList",
  "item",
  "link",
  "editLink",
  "editIcon",
  "muted",
  "accordionList",
  "childrenList",
  "accordionItem",
  "accordionHeader",
  "depth1",
  "depth2",
  "depth3",
  "toggleButton",
  "toggleIcon",
  "toggleLabel",
  "panel",
  "panelSection",
  "panelTitle",
  "panelActions",
  "button",
  "secondaryButton",
  "resultList",
  "emptyState",
] as const);

/** Render a category select that exposes the full category path for each option. */
export function CategorySelect(props: { readonly categories: ReadonlyArray<CategoryWithPath>; readonly selectedCategoryId: string; readonly required?: boolean }) {
  return (
    <select id="categoryId" name="categoryId" required={props.required ?? true}>
      <option value="">Kies categorie</option>
      {props.categories.map((category) => (
        <option value={String(category.id)} selected={props.selectedCategoryId === String(category.id)}>{category.path}</option>
      ))}
    </select>
  );
}

/** Render every category as a recursive accordion tree. */
export function RootCategoryAccordion(props: { readonly model: RootCategoryAccordionModel }) {
  return (
    <ul id="category-accordion" class={styles.accordionList}>
      <CategoryNodeList nodes={props.model.categoryTree} model={props.model} depth={0} />
    </ul>
  );
}

/** Render browse category links. */
export function CategoryLinkList(props: { readonly categories: ReadonlyArray<{ readonly id: number; readonly name: string; readonly path?: string; readonly productCount?: number }>; readonly showFullPath?: boolean }) {
  if (props.categories.length === 0) return <p class={styles.muted}>Geen subcategorieën gevonden.</p>;
  return (
    <ul class={styles.linkList}>
      {props.categories.map((category) => (
        <li class={styles.item}>
          <a class={styles.link} href={`/admin/product-catalogus?categoryId=${category.id}`} hx-get={`/admin/product-catalogus?categoryId=${category.id}`} hx-target="#catalog-frame" hx-push-url="true">
            {props.showFullPath === false ? category.name : (category.path ?? category.name)}
          </a>
          <CategoryEditLink category={category} />
        </li>
      ))}
    </ul>
  );
}

function CategoryNodeList(props: { readonly nodes: ReadonlyArray<CategoryAccordionNode>; readonly model: RootCategoryAccordionModel; readonly depth: number }) {
  return (
    <>
      {props.nodes.map((node) => (
        <CategoryAccordionItem node={node} model={props.model} depth={props.depth} />
      ))}
    </>
  );
}

function CategoryAccordionItem(props: { readonly node: CategoryAccordionNode; readonly model: RootCategoryAccordionModel; readonly depth: number }) {
  const isSelected = props.model.openCategory?.category.id === props.node.category.id;
  const isOnOpenPath = props.model.openPathIds.includes(props.node.category.id);
  const isExpanded = isSelected || isOnOpenPath;
  const catalogState = categoryCatalogState(props.node.category.id, props.model.limit);
  const parentCategoryId = props.node.category.parentId;
  const requestState = { q: "", brandId: undefined, categoryId: undefined, limit: props.model.limit };
  const targetHref = isSelected
    ? closeCategoryTargetHref(props.node.category.id, parentCategoryId, requestState)
    : withCatalogState(`/admin/product-catalogus/categorieen/${props.node.category.id}/uitklappen`, requestState);
  const pushedHref = isSelected
    ? catalogHref(parentCategoryId === null ? requestState : categoryCatalogState(parentCategoryId, props.model.limit))
    : catalogHref(catalogState);
  return (
    <li class={styles.accordionItem}>
      <div class={`${styles.accordionHeader} ${depthClass(props.depth)}`}>
        <button
          type="button"
          class={styles.toggleButton}
          hx-get={targetHref}
          hx-target="#category-accordion"
          hx-swap="outerHTML"
          hx-push-url={pushedHref}
          aria-expanded={isExpanded ? "true" : "false"}
          aria-controls={`category-panel-${props.node.category.id}`}
        >
          <span class={styles.toggleIcon} aria-hidden="true" />
          <span class={styles.toggleLabel}>{props.node.category.name}</span>
        </button>
        <CategoryEditLink category={props.node.category} />
      </div>
      {isSelected && props.model.openCategory ? (
        <CategoryAccordionPanel browse={props.model.openCategory} childNodes={props.node.children} model={props.model} depth={props.depth + 1} />
      ) : null}
      {!isSelected && isOnOpenPath && props.node.children.length > 0 ? (
        <ul class={styles.childrenList}>
          <CategoryNodeList nodes={props.node.children} model={props.model} depth={props.depth + 1} />
        </ul>
      ) : null}
    </li>
  );
}

function CategoryAccordionPanel(props: { readonly browse: CatalogCategoryBrowseResponse; readonly childNodes: ReadonlyArray<CategoryAccordionNode>; readonly model: RootCategoryAccordionModel; readonly depth: number }) {
  const hasSubcategories = props.childNodes.length > 0;
  const hasProducts = props.browse.products.items.length > 0;
  return (
    <div id={`category-panel-${props.browse.category.id}`} class={`${styles.panel} ${depthClass(props.depth - 1)}`}>
      {!hasSubcategories && !hasProducts ? (
        <div class={styles.emptyState}>
          <p>Deze categorie is nu nog leeg.</p>
          <p>Maak een nieuwe subcategorie of een product aan om hem te vullen.</p>
        </div>
      ) : null}
      {hasSubcategories ? (
        <section class={styles.panelSection}>
          <ul class={styles.childrenList}>
            <CategoryNodeList nodes={props.childNodes} model={props.model} depth={props.depth} />
          </ul>
        </section>
      ) : null}
      {hasProducts ? (
        <section class={styles.panelSection}>
          <h3 class={styles.panelTitle}>Producten</h3>
          <ul class={styles.resultList}>
            {props.browse.products.items.map((product) => (
              <ProductRow product={product} catalogState={categoryCatalogState(props.browse.category.id, props.model.limit)} />
            ))}
          </ul>
        </section>
      ) : null}
      <div class={styles.panelActions}>
        <a
          class={styles.secondaryButton}
          href={`/admin/product-catalogus/categorieen/${props.browse.category.id}/subcategorie/nieuw`}
          hx-get={`/admin/product-catalogus/categorieen/${props.browse.category.id}/subcategorie/nieuw`}
          hx-target="#modal-root"
          hx-swap="innerHTML"
        >
          Subcategorie aanmaken
        </a>
        <a class={styles.button} href={`/admin/product-catalogus/nieuw?categoryId=${props.browse.category.id}`}>
          Product aanmaken
        </a>
      </div>
    </div>
  );
}

function categoryCatalogState(categoryId: number, limit: number): CatalogUrlState {
  return { q: "", brandId: undefined, categoryId, limit };
}

function closeCategoryTargetHref(categoryId: number, parentCategoryId: number | null, requestState: CatalogUrlState): string {
  if (parentCategoryId === null) return withCatalogState(`/admin/product-catalogus/categorieen/${categoryId}/uitklappen?open=0`, requestState);
  return withCatalogState(`/admin/product-catalogus/categorieen/${parentCategoryId}/uitklappen`, requestState);
}

function CategoryEditLink(props: { readonly category: { readonly id: number; readonly name: string } }) {
  return (
    <a
      class={styles.editLink}
      href={`/admin/product-catalogus/categorieen/${props.category.id}/bewerken`}
      hx-get={`/admin/product-catalogus/categorieen/${props.category.id}/bewerken`}
      hx-target="#modal-root"
      hx-swap="innerHTML"
      hx-push-url="true"
      aria-label={`Categorie ${props.category.name} bewerken`}
      title={`Categorie ${props.category.name} bewerken`}
    >
      <svg class={styles.editIcon} aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
        <path d="m15 5 4 4" />
      </svg>
    </a>
  );
}

function depthClass(depth: number): string {
  if (depth <= 0) return "";
  if (depth === 1) return styles.depth1;
  if (depth === 2) return styles.depth2;
  return styles.depth3;
}
