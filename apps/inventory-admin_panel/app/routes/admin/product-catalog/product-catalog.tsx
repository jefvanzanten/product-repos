import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  handleProductCatalogRouteAction,
  loadProductCatalogRoute,
} from "@product-repos/admin-dashboard/react-router/product-catalog.server";

export { default, meta } from "@product-repos/admin-dashboard/react-router/product-catalog";

/** Delegate product catalog loading to the shared server handler. */
export async function loader(args: LoaderFunctionArgs) {
  return loadProductCatalogRoute(args);
}

/** Delegate product catalog mutations to the shared server handler. */
export async function action(args: ActionFunctionArgs) {
  return handleProductCatalogRouteAction(args);
}
