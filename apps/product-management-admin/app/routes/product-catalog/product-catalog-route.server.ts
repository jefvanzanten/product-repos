import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { handleProductCatalogAction, loadProductCatalog } from "./product-catalog.server";
import type { ActionResult, LoaderData } from "./product-catalog.types";

/**
 * Load catalog browse or search data for the product catalog route.
 *
 * @param args - React Router loader arguments.
 * @returns The product catalog route data.
 */
export async function loadProductCatalogRoute({ request }: LoaderFunctionArgs): Promise<LoaderData> {
  const url = new URL(request.url);
  const editCategoryId = url.searchParams.get("editCategoryId")
    ? Number(url.searchParams.get("editCategoryId"))
    : undefined;
  return loadProductCatalog(request, editCategoryId);
}

/**
 * Handle product catalog form submissions.
 *
 * @param args - React Router action arguments.
 * @returns The category mutation result.
 */
export async function handleProductCatalogRouteAction({ request }: ActionFunctionArgs): Promise<ActionResult> {
  return handleProductCatalogAction(request);
}
