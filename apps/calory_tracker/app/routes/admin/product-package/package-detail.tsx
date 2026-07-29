import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  handlePackageDetailRouteAction,
  loadPackageDetailRoute,
} from "@product-repos/admin-dashboard/react-router/package-detail.server";

export { default, meta } from "@product-repos/admin-dashboard/react-router/package-detail";

/** Delegate package-detail loading to the shared server handler. */
export async function loader(args: LoaderFunctionArgs) {
  return loadPackageDetailRoute(args);
}

/** Delegate package edits to the shared server handler. */
export async function action(args: ActionFunctionArgs) {
  return handlePackageDetailRouteAction(args);
}
