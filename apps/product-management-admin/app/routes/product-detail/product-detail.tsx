import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { requireAdministrator } from "../../auth.server";
import { ProductDetailPage } from "../../features/product-catalog/pages/ProductDetailPage/ProductDetailPage";
import {
  handleProductDetailRouteAction,
  loadProductDetailRoute,
} from "./product-detail-route.server";
import type {
  ProductDetailActionResult,
  ProductDetailLoaderData,
} from "../../features/product-catalog/types/product-detail.types";

/** Return metadata for the product-detail route. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Productdetail" }];
}

/**
 * Load protected product details and edit reference data.
 *
 * @param args - React Router loader arguments.
 * @returns Product detail data or a not-found state.
 */
export async function loader(args: LoaderFunctionArgs): Promise<ProductDetailLoaderData> {
  await requireAdministrator(args.request);
  return loadProductDetailRoute(args);
}

/**
 * Handle a protected product edit.
 *
 * @param args - React Router action arguments.
 * @returns Product edit validation or success state.
 */
export async function action(args: ActionFunctionArgs): Promise<ProductDetailActionResult> {
  await requireAdministrator(args.request);
  return handleProductDetailRouteAction(args);
}

/** Render the product detail route. */
export default function ProductDetailRoute(): React.ReactNode {
  return (
    <ProductDetailPage
      actionData={useActionData<ProductDetailActionResult>()}
      loaderData={useLoaderData<ProductDetailLoaderData>()}
    />
  );
}
