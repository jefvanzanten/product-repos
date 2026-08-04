import { browseCatalog, createCategory, deleteCategory, getCategories, mapApiError, searchCatalog, updateCategory } from "../../api/admin-dashboard-api.server";
import type { ActionResult, LoaderData } from "./product-catalog.types";

/**
 * Load the product catalog page data from a request.
 *
 * @param request - The incoming page request.
 * @param editCategoryId - Optional category id to open in edit mode.
 * @returns The product catalog route data.
 */
export async function loadProductCatalog(request: Request, editCategoryId?: number): Promise<LoaderData> {
  const url = new URL(request.url);
  const categories = await getCategories(request);
  const editCategory = editCategoryId ? categories.find((category) => category.id === editCategoryId) ?? null : null;
  const query = url.searchParams.get("q")?.trim() ?? "";
  const browseCategoryId = url.searchParams.get("categoryId") ?? (editCategory?.parentId ? String(editCategory.parentId) : null);
  const brandId = url.searchParams.get("brandId");

  if (query.length >= 2) {
    return { query, mode: "search", search: await searchCatalog(query, request), browse: null, categories, editCategory };
  }

  return {
    query: "",
    mode: "browse",
    search: null,
    browse: await browseCatalog({ categoryId: browseCategoryId, brandId }, request),
    categories,
    editCategory,
  };
}

/**
 * Handle create/update category form data for the product catalog.
 *
 * @param request - The form submission request.
 * @returns The category mutation result.
 */
export async function handleProductCatalogAction(request: Request): Promise<ActionResult> {
  const form = await request.formData();
  const intent = String(form.get("_action") ?? "");
  try {
    if (intent === "createCategory") {
      const name = String(form.get("categoryName") ?? "").trim();
      if (!name) return { errors: { categoryName: "Vul een categorienaam in." } };
      const parentIdRaw = String(form.get("parentId") ?? "");
      const parentId = parentIdRaw ? Number(parentIdRaw) : null;
      return { ok: true, createdCategory: await createCategory({ name, parentId }, request) };
    }
    if (intent === "updateCategory") {
      const name = String(form.get("categoryName") ?? "").trim();
      const categoryId = Number(form.get("categoryId"));
      if (!Number.isInteger(categoryId) || categoryId < 1) return { errors: { form: "Categorie is ongeldig." } };
      if (!name) return { errors: { categoryName: "Vul een categorienaam in." } };
      return { ok: true, updatedCategory: await updateCategory({ id: categoryId, name }, request) };
    }
    if (intent === "deleteCategory") {
      const categoryId = Number(form.get("categoryId"));
      const parentIdRaw = String(form.get("parentId") ?? "");
      const parentId = parentIdRaw ? Number(parentIdRaw) : null;
      if (!Number.isInteger(categoryId) || categoryId < 1 || (parentId !== null && (!Number.isInteger(parentId) || parentId < 1))) {
        return { errors: { form: "Categorie is ongeldig." } };
      }
      await deleteCategory(categoryId, request);
      return { ok: true, deletedCategoryId: categoryId, deletedCategoryParentId: parentId };
    }
    return { errors: { form: "Onbekende actie." } };
  } catch (error) {
    return { errors: mapApiError(error) };
  }
}
