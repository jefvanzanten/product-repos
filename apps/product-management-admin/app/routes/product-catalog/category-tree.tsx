import { useMemo } from "react";
import { AdminLink as Link } from "../../admin-source-context";
import type { CatalogBrowseResponse, CategoryDto } from "@product-repos/contracts";
import actions from "./catalog-actions.module.css";
import { EmptyState } from "./empty-state";
import { ProductCard } from "./product-card";
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
  readonly categories: ReadonlyArray<CategoryDto>;
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
        <div className={actions.cardActions}>
          <button className={actions.primaryButton} type="button" onClick={() => onCreateCategory({ kind: "root", parentId: null })}>+ Categorie</button>
        </div>
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
      <CategoryRow category={node.category} depth={node.depth} hasChildren={node.children.length > 0} open={isOpen} />
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
  const emptyCategory = browse.subcategories.length === 0 && browse.products.items.length === 0;
  return (
    <div className={styles.categoryContent} style={{ marginLeft: `${depth}rem` }}>
      {browse.products.items.length > 0 ? (
        <section className={styles.productsSection}>
          <h3 className={styles.productsTitle}>Producten</h3>
          {browse.products.items.map((product) => <ProductCard key={product.id} product={product} context={{ categoryId: browse.category.id }} showCategory={false} />)}
        </section>
      ) : null}
      {emptyCategory ? (
        <EmptyState title="Deze categorie is nu nog leeg." text="Maak een nieuwe subcategorie of een product aan om hem te vullen.">
          <div className={actions.inlineActions}>
            <button className={actions.secondaryButton} type="button" onClick={() => onCreateCategory({ kind: "child", parentId: browse.category.id, parentName: browse.category.name })}>+ Subcategorie</button>
            <Link className={actions.primaryLink} to={`/product-catalogus/nieuw?categoryId=${browse.category.id}`}>+ Product</Link>
          </div>
        </EmptyState>
      ) : (
        <div className={actions.inlineActions}>
          <button className={actions.secondaryButton} type="button" onClick={() => onCreateCategory({ kind: "child", parentId: browse.category.id, parentName: browse.category.name })}>+ Subcategorie</button>
          <Link className={actions.primaryLink} to={`/product-catalogus/nieuw?categoryId=${browse.category.id}`}>+ Product</Link>
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category, depth, hasChildren, open }: { readonly category: CategoryDto; readonly depth: number; readonly hasChildren: boolean; readonly open: boolean }): React.ReactNode {
  const target = open
    ? category.parentId
      ? `/product-catalogus?categoryId=${category.parentId}`
      : "/product-catalogus"
    : `/product-catalogus?categoryId=${category.id}`;

  return (
    <div className={styles.categoryRow} style={{ marginLeft: `${depth}rem` }}>
      <Link className={styles.categoryLink} to={target}>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden="true">▸</span>
        <span>{category.name}</span>
        {hasChildren ? <span className={styles.visuallyHidden}>heeft subcategorieën</span> : null}
      </Link>
      <Link className={styles.editButton} aria-label={`Categorie ${category.name} bewerken`} to={`/product-catalogus/categorieen/${category.id}/bewerken`}><PencilIcon /></Link>
    </div>
  );
}

/** Render the exact 18 by 18 Figma edit asset. */
function PencilIcon(): React.ReactNode {
  return <img alt="" className={styles.pencilIcon} height="18" src="/product-management-admin/assets/product-forms/edit.svg" width="18" />;
}

type CategoryTreeNodeData = {
  readonly category: CategoryDto;
  readonly children: ReadonlyArray<CategoryTreeNodeData>;
  readonly depth: number;
};

function buildCategoryTree(categories: ReadonlyArray<CategoryDto>): ReadonlyArray<CategoryTreeNodeData> {
  const childrenByParentId = new Map<number | null, CategoryDto[]>();
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

function compareCategories(parentId: number | null, left: CategoryDto, right: CategoryDto): number {
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
