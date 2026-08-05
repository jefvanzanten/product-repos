import { useState } from "react";
import { useNavigate } from "react-router";
import { useAdminPath } from "../../../../admin-source-context";
import { BrandBrowse } from "../../brands/components/brand-browse/brand-browse";
import { CategoryBreadcrumb } from "../../categories/components/category-breadcrumb/category-breadcrumb";
import { CategoryModal } from "../../categories/components/category-modal/category-modal";
import { CategoryTree, type CategoryCreateModalState } from "../../categories/components/category-tree/category-tree";
import type { ActionResult, LoaderData } from "../../types/product-catalog.types";
import { SearchForm } from "../../catalog/components/search-form/search-form";
import { SearchResults } from "../../catalog/components/search-results/search-results";
import styles from "./ProductCatalogPage.module.css";

/**
 * Render the product catalog page shell.
 *
 * @param props - Loaded catalog data and optional action result.
 * @returns The product catalog page shell.
 */
export function ProductCatalogPage({ actionData, loaderData }: { readonly actionData?: ActionResult; readonly loaderData: LoaderData }): React.ReactNode {
  const [createModal, setCreateModal] = useState<CategoryCreateModalState | null>(null);
  const navigate = useNavigate();
  const editCategory = loaderData.editCategory;
  const closeEditPath = useAdminPath(
    editCategory?.parentId
      ? `/product-catalogus?categoryId=${editCategory.parentId}`
      : "/product-catalogus",
  );
  const browse = loaderData.browse;
  const categoryBreadcrumb = loaderData.mode === "browse" && browse && browse.state !== "brand"
    ? <CategoryBreadcrumb path={browse.state === "category" ? browse.categoryPath : []} />
    : null;

  const closeEditModal = (): void => {
    void navigate(closeEditPath);
  };

  return (
    <main className={styles.page}>
      <div className={styles.searchArea}>
        <SearchForm defaultQuery={loaderData.query} />
        {categoryBreadcrumb}
      </div>

      <section className={styles.catalogCard}>
        {actionData?.errors?.form ? <p className={styles.formError}>{actionData.errors.form}</p> : null}
        {loaderData.mode === "search" && loaderData.search ? <SearchResults search={loaderData.search} /> : null}
        {loaderData.mode === "browse" && browse?.state === "brand" ? <BrandBrowse browse={browse} /> : null}
        {loaderData.mode === "browse" && browse?.state !== "brand" && browse ? <CategoryTree browse={browse} categories={loaderData.categories} onCreateCategory={setCreateModal} /> : null}
      </section>

      {createModal ? (
        <CategoryModal
          action="createCategory"
          errors={actionData?.errors}
          parentId={createModal.parentId}
          title={createModal.kind === "root" ? "Nieuwe categorie maken" : `Nieuwe subcategorie maken in ${createModal.parentName ?? "categorie"}`}
          onClose={() => setCreateModal(null)}
        />
      ) : null}
      {editCategory ? (
        <CategoryModal
          action="updateCategory"
          categoryId={editCategory.id}
          defaultName={editCategory.name}
          errors={actionData?.errors}
          parentId={editCategory.parentId}
          title="Categorie bewerken"
          onClose={closeEditModal}
        />
      ) : null}
    </main>
  );
}
