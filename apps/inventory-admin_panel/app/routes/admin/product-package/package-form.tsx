import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  handlePackageFormRouteAction,
  loadPackageFormRoute,
} from "@product-repos/admin-dashboard/react-router/package-form.server";

export { default, meta } from "@product-repos/admin-dashboard/react-router/package-form";

/** Delegate add-package loading to the shared server handler. */
export async function loader(args: LoaderFunctionArgs) {
  return loadPackageFormRoute(args);
}

/** Delegate package creation to the shared server handler. */
export async function action(args: ActionFunctionArgs) {
  return handlePackageFormRouteAction(args);
}
