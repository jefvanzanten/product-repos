import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { parseAdminSourceFromSearch, toAdminRedirectPath } from "../../admin-navigation";
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
export async function handleProductCatalogRouteAction({ request }: ActionFunctionArgs): Promise<ActionResult | Response> {
  const requestUrl = new URL(request.url);
  const source = parseAdminSourceFromSearch(requestUrl.searchParams);
  const result = await handleProductCatalogAction(request);
  if (!result.ok || result.deletedCategoryId === undefined) return result;

  const target = result.deletedCategoryParentId === null || result.deletedCategoryParentId === undefined
    ? "/product-catalogus"
    : `/product-catalogus?categoryId=${result.deletedCategoryParentId}`;
  return redirect(toAdminRedirectPath(target, source));
}
