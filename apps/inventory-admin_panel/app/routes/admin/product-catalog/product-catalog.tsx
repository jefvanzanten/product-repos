import type { Route } from "./+types/product-catalog";
import { browseCatalog, createCategory, getCategories, mapApiError, searchCatalog, updateCategory } from "../../../../features/admin/product-catalog/services/productCatalogService.server";
import { ProductCatalogPage } from "./product-catalog-page";
import type { ActionResult, LoaderData } from "./product-catalog.types";

export type { ActionResult, LoaderData } from "./product-catalog.types";
export { ProductCatalogPage } from "./product-catalog-page";

/**
 * Return route metadata for the product catalog page.
 *
 * @returns The route title metadata.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Productcatalogus" }];
}

/**
 * Load catalog browse/search data for the product catalog route.
 *
 * @param args - React Router loader arguments.
 * @returns The product catalog route data.
 */
export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
  const url = new URL(request.url);
  const editCategoryId = url.searchParams.get("editCategoryId") ? Number(url.searchParams.get("editCategoryId")) : undefined;
  return loadProductCatalog(request, editCategoryId);
}

/**
 * Load the product catalog page data from a request.
 *
 * @param request - The incoming page request.
 * @param editCategoryId - Optional category id to open in edit mode.
 * @returns The product catalog route data.
 */
export async function loadProductCatalog(request: Request, editCategoryId?: number): Promise<LoaderData> {
  const url = new URL(request.url);
  const categories = await getCategories();
  const editCategory = editCategoryId ? categories.find((category) => category.id === editCategoryId) ?? null : null;
  const query = url.searchParams.get("q")?.trim() ?? "";
  const browseCategoryId = url.searchParams.get("categoryId") ?? (editCategory?.parentId ? String(editCategory.parentId) : null);
  const brandId = url.searchParams.get("brandId");

  if (query.length >= 2) {
    return { query, mode: "search", search: await searchCatalog(query), browse: null, categories, editCategory };
  }

  return {
    query: "",
    mode: "browse",
    search: null,
    browse: await browseCatalog({ categoryId: browseCategoryId, brandId }),
    categories,
    editCategory,
  };
}

/**
 * Handle product catalog form submissions.
 *
 * @param args - React Router action arguments.
 * @returns The category mutation result.
 */
export async function action({ request }: Route.ActionArgs): Promise<ActionResult> {
  return handleProductCatalogAction(request);
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
      return { ok: true, createdCategory: await createCategory({ name, parentId }) };
    }
    if (intent === "updateCategory") {
      const name = String(form.get("categoryName") ?? "").trim();
      const categoryId = Number(form.get("categoryId"));
      if (!Number.isInteger(categoryId) || categoryId < 1) return { errors: { form: "Categorie is ongeldig." } };
      if (!name) return { errors: { categoryName: "Vul een categorienaam in." } };
      return { ok: true, updatedCategory: await updateCategory({ id: categoryId, name }) };
    }
    return { errors: { form: "Onbekende actie." } };
  } catch (error) {
    return { errors: mapApiError(error) };
  }
}

/**
 * Render the product catalog route component.
 *
 * @param props - React Router component props.
 * @returns The product catalog page.
 */
export default function ProductCatalog({ actionData, loaderData }: Route.ComponentProps): React.ReactNode {
  return <ProductCatalogPage actionData={actionData} loaderData={loaderData} />;
}
