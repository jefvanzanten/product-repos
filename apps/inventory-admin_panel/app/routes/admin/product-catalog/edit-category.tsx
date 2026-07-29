import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  handleEditCategoryRouteAction,
  loadEditCategoryRoute,
} from "@product-repos/admin-dashboard/react-router/edit-category.server";

export { default, meta } from "@product-repos/admin-dashboard/react-router/edit-category";

/** Delegate edit-category loading to the shared server handler. */
export async function loader(args: LoaderFunctionArgs) {
  return loadEditCategoryRoute(args);
}

/** Delegate category edits to the shared server handler. */
export async function action(args: ActionFunctionArgs) {
  return handleEditCategoryRouteAction(args);
}
