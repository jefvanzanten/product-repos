import { useActionData, useLoaderData } from "react-router";
import { ProductCatalogPage } from "./product-catalog-page";
import type { ActionResult, LoaderData } from "./product-catalog.types";

export type { ActionResult, LoaderData } from "./product-catalog.types";
export { ProductCatalogPage } from "./product-catalog-page";

/**
 * Return route metadata for the product catalog page.
 *
 * @returns The route title metadata.
 */
export function meta() {
  return [{ title: "Productcatalogus" }];
}

/**
 * Render the product catalog route component.
 *
 * @param props - React Router component props.
 * @returns The product catalog page.
 */
export default function ProductCatalog(): React.ReactNode {
  const actionData = useActionData<ActionResult>();
  const loaderData = useLoaderData<LoaderData>();
  return <ProductCatalogPage actionData={actionData} loaderData={loaderData} />;
}
