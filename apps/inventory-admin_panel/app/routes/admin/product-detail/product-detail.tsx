import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  handleProductDetailRouteAction,
  loadProductDetailRoute,
} from "@product-repos/admin-dashboard/react-router/product-detail.server";

export { default, meta } from "@product-repos/admin-dashboard/react-router/product-detail";

/** Delegate product-detail loading to the shared server handler. */
export async function loader(args: LoaderFunctionArgs) {
  return loadProductDetailRoute(args);
}

/** Delegate product edits to the shared server handler. */
export async function action(args: ActionFunctionArgs) {
  return handleProductDetailRouteAction(args);
}
