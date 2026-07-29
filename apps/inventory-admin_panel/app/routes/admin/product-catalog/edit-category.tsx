import type { Route } from "./+types/edit-category";
import { handleProductCatalogAction, loadProductCatalog } from "./product-catalog.server";
import { ProductCatalogPage } from "./product-catalog-page";

export { meta } from "./product-catalog";

/**
 * Load catalog data with the requested category open in edit mode.
 *
 * @param args - React Router loader arguments.
 * @returns The product catalog route data.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  return loadProductCatalog(request, Number(params.categoryId));
}

/**
 * Handle product catalog edit form submissions.
 *
 * @param args - React Router action arguments.
 * @returns The category mutation result.
 */
export async function action({ request }: Route.ActionArgs) {
  return handleProductCatalogAction(request);
}

/**
 * Render the product catalog page with the category modal open.
 *
 * @param props - React Router component props.
 * @returns The product catalog edit page.
 */
export default function EditCategory({ actionData, loaderData }: Route.ComponentProps): React.ReactNode {
  return <ProductCatalogPage actionData={actionData} loaderData={loaderData} />;
}
