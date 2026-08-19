import { useEffect, useMemo, useRef, useState } from "react";
import { useEscapeKey } from "@product-repos/shared/use-escape-key";
import { useOutsideInteraction } from "@product-repos/shared/use-outside-interaction";
import { AdminForm as Form, AdminLink as Link } from "../../../../../../core/presentation/routing/admin-source-context";
import type { Category } from "../../../../domain/product-catalog";
import type { CatalogBrowseResponse } from "../../../types/product-catalog.types";
import {
  CatalogActionGroup,
  CatalogPrimaryButton,
  CatalogPrimaryLink,
  CatalogSecondaryButton,
} from "../../../catalog/components/catalog-actions/catalog-actions";
import { EmptyState } from "../../../catalog/components/empty-state/empty-state";
import { ProductCard } from "../../../products/components/product-card/product-card";
import styles from "./category-tree.module.css";

/** Modal state requested from the category tree. */
export type CategoryCreateModalState = {
  readonly kind: "root" | "child";
  readonly parentId: number | null;
  readonly parentName?: string;
};

type CategoryTreeBrowse = Extract<CatalogBrowseResponse, { readonly state: "root" | "category" }>;

type CategoryTreeProps = {
  readonly browse: CategoryTreeBrowse;
  readonly categories: ReadonlyArray<Category>;
  readonly onCreateCategory: (modal: CategoryCreateModalState) => void;
};

/**
 * Render the expandable category tree and active category contents.
 *
 * @param props - Browse response, full category list, and create-category callback.
 * @returns The category tree for the catalog browse page.
 */
export function CategoryTree({ browse, categories, onCreateCategory }: CategoryTreeProps): React.ReactNode {
  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const activeCategory = browse.state === "category" ? browse.category : null;
  const activePathIds = browse.state === "category" ? browse.categoryPath.map((category) => category.id) : [];

  return (
    <>
      <div className={styles.categoryList}>
        {browse.state === "root" && browse.isEmpty ? <EmptyState title="Er zijn geen categorieën gevonden." text="Maak je eerste categorie aan om de catalogus op te bouwen." /> : null}
        {tree.map((node) => (
          <CategoryTreeNode
            key={node.category.id}
            activeCategoryId={activeCategory?.id ?? null}
            activePathIds={activePathIds}
            browse={browse}
            node={node}
            onCreateCategory={onCreateCategory}
          />
        ))}
      </div>
      {browse.state === "root" ? (
        <CatalogActionGroup variant="card">
          <CatalogPrimaryButton type="button" onClick={() => onCreateCategory({ kind: "root", parentId: null })}>+ Categorie</CatalogPrimaryButton>
        </CatalogActionGroup>
      ) : null}
    </>
  );
}

function CategoryTreeNode({ activeCategoryId, activePathIds, browse, node, onCreateCategory }: {
  readonly activeCategoryId: number | null;
  readonly activePathIds: ReadonlyArray<number>;
  readonly browse: CategoryTreeBrowse;
  readonly node: CategoryTreeNodeData;
  readonly onCreateCategory: (modal: CategoryCreateModalState) => void;
}): React.ReactNode {
  const isActive = node.category.id === activeCategoryId;
  const isOpen = activePathIds.includes(node.category.id);
  const shouldShowChildren = isOpen;
  const categoryBrowse = browse.state === "category" ? browse : null;

  return (
    <div className={styles.treeNode}>
      <CategoryRow activeCategoryId={activeCategoryId} category={node.category} depth={node.depth} hasChildren={node.children.length > 0} open={isOpen} />
      {shouldShowChildren ? node.children.map((child) => (
        <CategoryTreeNode
          key={child.category.id}
          activeCategoryId={activeCategoryId}
          activePathIds={activePathIds}
          browse={browse}
          node={child}
          onCreateCategory={onCreateCategory}
        />
      )) : null}
      {isActive && categoryBrowse ? <ActiveCategoryContent browse={categoryBrowse} depth={node.depth + 1} onCreateCategory={onCreateCategory} /> : null}
    </div>
  );
}

function ActiveCategoryContent({ browse, depth, onCreateCategory }: { readonly browse: Extract<CatalogBrowseResponse, { state: "category" }>; readonly depth: number; readonly onCreateCategory: (modal: CategoryCreateModalState) => void }): React.ReactNode {
  const productsRef = useRef<HTMLElement>(null);
  const emptyCategory = browse.subcategories.length === 0 && browse.products.items.length === 0;

  useEffect(() => {
    productsRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "nearest",
    });
  }, [browse.category.id]);

  return (
    <div className={styles.categoryContent} style={{ marginLeft: `${depth}rem` }}>
      {browse.products.items.length > 0 ? (
        <section className={styles.productsSection} ref={productsRef}>
          <h3 className={styles.productsTitle}>Producten</h3>
          {browse.products.items.map((product) => <ProductCard key={product.id} product={product} context={{ categoryId: browse.category.id }} showCategory={false} />)}
        </section>
      ) : null}
      {emptyCategory ? (
        <EmptyState title="Deze categorie is nu nog leeg." text="Maak een nieuwe subcategorie of een product aan om hem te vullen.">
          <CatalogActionGroup variant="inline">
            <CatalogSecondaryButton type="button" onClick={() => onCreateCategory({ kind: "child", parentId: browse.category.id, parentName: browse.category.name })}>+ Subcategorie</CatalogSecondaryButton>
            <CatalogPrimaryLink to={`/product-catalogus/nieuw?categoryId=${browse.category.id}`}>+ Product</CatalogPrimaryLink>
          </CatalogActionGroup>
        </EmptyState>
      ) : (
        <CatalogActionGroup variant="inline">
          <CatalogSecondaryButton type="button" onClick={() => onCreateCategory({ kind: "child", parentId: browse.category.id, parentName: browse.category.name })}>+ Subcategorie</CatalogSecondaryButton>
          <CatalogPrimaryLink to={`/product-catalogus/nieuw?categoryId=${browse.category.id}`}>+ Product</CatalogPrimaryLink>
        </CatalogActionGroup>
      )}
    </div>
  );
}

/** Render a category row with a menu for rename and delete actions. */
function CategoryRow({ activeCategoryId, category, depth, hasChildren, open }: { readonly activeCategoryId: number | null; readonly category: Category; readonly depth: number; readonly hasChildren: boolean; readonly open: boolean }): React.ReactNode {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const formAction = activeCategoryId === null ? "/product-catalogus" : `/product-catalogus?categoryId=${activeCategoryId}`;
  const target = open
    ? category.parentId
      ? `/product-catalogus?categoryId=${category.parentId}`
      : "/product-catalogus"
    : `/product-catalogus?categoryId=${category.id}`;

  useOutsideInteraction(menuOpen, menuRef, () => setMenuOpen(false));
  useEscapeKey(menuOpen, () => setMenuOpen(false));

  return (
    <div className={`${styles.categoryRow} ${menuOpen ? styles.categoryRowMenuOpen : ""}`} style={{ marginLeft: `${depth}rem` }}>
      <Link className={styles.categoryLink} to={target}>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden="true">▸</span>
        <span>{category.name}</span>
        {hasChildren ? <span className={styles.visuallyHidden}>heeft subcategorieën</span> : null}
      </Link>
      <div className={styles.categoryMenuContainer} ref={menuRef}>
        <button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`Categorie ${category.name} beheren`}
          className={styles.editButton}
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <PencilIcon />
        </button>
        {menuOpen ? (
          <div className={styles.categoryMenu} role="menu">
            <Link className={styles.categoryMenuItem} role="menuitem" to={`/product-catalogus/categorieen/${category.id}/bewerken`}>Naam wijzigen</Link>
            <Form action={formAction} method="post">
              <input name="_action" type="hidden" value="deleteCategory" />
              <input name="categoryId" type="hidden" value={category.id} />
              <input name="parentId" type="hidden" value={category.parentId ?? ""} />
              <button className={`${styles.categoryMenuItem} ${styles.deleteMenuItem}`} role="menuitem" type="submit">Verwijderen</button>
            </Form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Render the exact 18 by 18 Figma edit asset. */
function PencilIcon(): React.ReactNode {
  return <img alt="" className={styles.pencilIcon} height="18" src="/product-management-admin/assets/product-forms/edit.svg" width="18" />;
}

type CategoryTreeNodeData = {
  readonly category: Category;
  readonly children: ReadonlyArray<CategoryTreeNodeData>;
  readonly depth: number;
};

function buildCategoryTree(categories: ReadonlyArray<Category>): ReadonlyArray<CategoryTreeNodeData> {
  const childrenByParentId = new Map<number | null, Category[]>();
  for (const category of categories) {
    const siblings = childrenByParentId.get(category.parentId) ?? [];
    siblings.push(category);
    childrenByParentId.set(category.parentId, siblings);
  }
  for (const [parentId, siblings] of childrenByParentId.entries()) siblings.sort((left, right) => compareCategories(parentId, left, right));

  const buildNodes = (parentId: number | null, depth: number): ReadonlyArray<CategoryTreeNodeData> => (childrenByParentId.get(parentId) ?? []).map((category) => ({
    category,
    children: buildNodes(category.id, depth + 1),
    depth,
  }));

  return buildNodes(null, 0);
}

const rootCategoryOrder = ["Dranken", "Drinken", "Drogisterij", "Supplementen", "Voeding"] as const;

function compareCategories(parentId: number | null, left: Category, right: Category): number {
  if (parentId === null) {
    const leftRootIndex = rootCategoryOrder.findIndex((name) => normalizeCategoryName(name) === normalizeCategoryName(left.name));
    const rightRootIndex = rootCategoryOrder.findIndex((name) => normalizeCategoryName(name) === normalizeCategoryName(right.name));
    if (leftRootIndex !== -1 || rightRootIndex !== -1) {
      if (leftRootIndex === -1) return 1;
      if (rightRootIndex === -1) return -1;
      return leftRootIndex - rightRootIndex || left.id - right.id;
    }
  }
  return left.name.localeCompare(right.name, "nl", { sensitivity: "base" }) || left.id - right.id;
}

function normalizeCategoryName(value: string): string {
  return value.trim().toLowerCase();
}
