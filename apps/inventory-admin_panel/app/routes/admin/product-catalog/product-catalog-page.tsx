import { useState } from "react";
import { BrandBrowse } from "./brand-browse";
import { CategoryBreadcrumb } from "./category-breadcrumb";
import { CategoryModal } from "./category-modal";
import { CategoryTree, type CategoryCreateModalState } from "./category-tree";
import type { ActionResult, LoaderData } from "./product-catalog.types";
import { SearchForm } from "./search-form";
import { SearchResults } from "./search-results";
import styles from "./product-catalog-page.module.css";

/**
 * Render the product catalog page shell.
 *
 * @param props - Loaded catalog data and optional action result.
 * @returns The product catalog page shell.
 */
export function ProductCatalogPage({ actionData, loaderData }: { readonly actionData?: ActionResult; readonly loaderData: LoaderData }): React.ReactNode {
  const [createModal, setCreateModal] = useState<CategoryCreateModalState | null>(null);
  const editCategory = loaderData.editCategory;
  const browse = loaderData.browse;
  const categoryBreadcrumb = browse?.state === "category" ? <CategoryBreadcrumb path={browse.categoryPath} /> : null;

  const closeEditModal = (): void => {
    window.location.href = editCategory?.parentId ? `/admin/product-catalogus?categoryId=${editCategory.parentId}` : "/admin/product-catalogus";
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
