import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { requireAdministrator } from "../../core/presentation/auth/auth.server";
import {
  handleEditCategoryRouteAction,
  loadEditCategoryRoute,
} from "./edit-category-route.server";
import { ProductCatalogPage } from "../../features/product-catalog/presentation/pages/ProductCatalogPage/ProductCatalogPage";
import type { ActionResult, LoaderData } from "../../features/product-catalog/presentation/types/product-catalog.types";

export { meta } from "./product-catalog";

/** Load protected catalog data with the selected category open for editing. */
export async function loader(args: LoaderFunctionArgs): Promise<LoaderData> {
  await requireAdministrator(args.request);
  return loadEditCategoryRoute(args);
}

/** Handle a protected category edit. */
export async function action(args: ActionFunctionArgs): Promise<ActionResult | Response> {
  await requireAdministrator(args.request);
  return handleEditCategoryRouteAction(args);
}

/**
 * Render the product catalog page with the category modal open.
 *
 * @param props - React Router component props.
 * @returns The product catalog edit page.
 */
export default function EditCategory(): React.ReactNode {
  const actionData = useActionData<ActionResult>();
  const loaderData = useLoaderData<LoaderData>();
  return <ProductCatalogPage actionData={actionData} loaderData={loaderData} />;
}
