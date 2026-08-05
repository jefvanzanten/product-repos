import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { requireAdministrator } from "../../auth.server";
import {
  handleProductCatalogRouteAction,
  loadProductCatalogRoute,
} from "./product-catalog-route.server";
import { ProductCatalogPage } from "../../features/product-catalog/pages/ProductCatalogPage/ProductCatalogPage";
import type { ActionResult, LoaderData } from "../../features/product-catalog/types/product-catalog.types";

export type { ActionResult, LoaderData } from "../../features/product-catalog/types/product-catalog.types";

/** Load protected product-catalog browse and search data. */
export async function loader(args: LoaderFunctionArgs): Promise<LoaderData> {
  await requireAdministrator(args.request);
  return loadProductCatalogRoute(args);
}

/** Handle protected product-catalog category mutations. */
export async function action(args: ActionFunctionArgs): Promise<ActionResult | Response> {
  await requireAdministrator(args.request);
  return handleProductCatalogRouteAction(args);
}

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
