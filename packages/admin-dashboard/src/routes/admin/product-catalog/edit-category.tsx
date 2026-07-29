import { useActionData, useLoaderData } from "react-router";
import { ProductCatalogPage } from "./product-catalog-page";
import type { ActionResult, LoaderData } from "./product-catalog.types";

export { meta } from "./product-catalog";

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
