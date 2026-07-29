import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  handleNewProductRouteAction,
  loadNewProductRoute,
} from "@product-repos/admin-dashboard/react-router/new-product.server";

export { default, meta } from "@product-repos/admin-dashboard/react-router/new-product";

/** Delegate new-product reference loading to the shared server handler. */
export async function loader(args: LoaderFunctionArgs) {
  return loadNewProductRoute(args);
}

/** Delegate product creation to the shared server handler. */
export async function action(args: ActionFunctionArgs) {
  return handleNewProductRouteAction(args);
}
