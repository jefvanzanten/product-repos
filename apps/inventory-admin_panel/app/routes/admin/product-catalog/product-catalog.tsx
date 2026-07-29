import type { Route } from "./+types/product-catalog";
import { handleProductCatalogAction, loadProductCatalog } from "./product-catalog.server";
import { ProductCatalogPage } from "./product-catalog-page";
import type { ActionResult, LoaderData } from "./product-catalog.types";

export type { ActionResult, LoaderData } from "./product-catalog.types";
export { ProductCatalogPage } from "./product-catalog-page";

/**
 * Return route metadata for the product catalog page.
 *
 * @returns The route title metadata.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Productcatalogus" }];
}

/**
 * Load catalog browse/search data for the product catalog route.
 *
 * @param args - React Router loader arguments.
 * @returns The product catalog route data.
 */
export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
  const url = new URL(request.url);
  const editCategoryId = url.searchParams.get("editCategoryId") ? Number(url.searchParams.get("editCategoryId")) : undefined;
  return loadProductCatalog(request, editCategoryId);
}


/**
 * Handle product catalog form submissions.
 *
 * @param args - React Router action arguments.
 * @returns The category mutation result.
 */
export async function action({ request }: Route.ActionArgs): Promise<ActionResult> {
  return handleProductCatalogAction(request);
}


/**
 * Render the product catalog route component.
 *
 * @param props - React Router component props.
 * @returns The product catalog page.
 */
export default function ProductCatalog({ actionData, loaderData }: Route.ComponentProps): React.ReactNode {
  return <ProductCatalogPage actionData={actionData} loaderData={loaderData} />;
}
