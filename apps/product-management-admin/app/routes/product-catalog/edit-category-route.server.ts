import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { handleProductCatalogAction, loadProductCatalog } from "./product-catalog.server";
import type { ActionResult, LoaderData } from "./product-catalog.types";

/**
 * Load catalog data with the requested category open in edit mode.
 *
 * @param args - React Router loader arguments.
 * @returns Product catalog data with the edit category selected.
 */
export async function loadEditCategoryRoute({ params, request }: LoaderFunctionArgs): Promise<LoaderData> {
  return loadProductCatalog(request, Number(params.categoryId));
}

/**
 * Handle category edit form submissions.
 *
 * @param args - React Router action arguments.
 * @returns The category mutation result.
 */
export async function handleEditCategoryRouteAction({ request }: ActionFunctionArgs): Promise<ActionResult> {
  return handleProductCatalogAction(request);
}
