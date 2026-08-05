import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { requireAdministrator } from "../../auth.server";
import { NewProductPage } from "../../features/product-catalog/pages/NewProductPage/NewProductPage";
import {
  handleNewProductRouteAction,
  loadNewProductRoute,
} from "./new-product-route.server";
import type {
  NewProductActionResult,
  NewProductLoaderData,
} from "../../features/product-catalog/types/new-product.types";

/** Return metadata for the new-product route. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Product aanmaken" }];
}

/**
 * Load protected reference data for product creation.
 *
 * @param args - React Router loader arguments.
 * @returns Product creation reference data.
 */
export async function loader(args: LoaderFunctionArgs): Promise<NewProductLoaderData> {
  await requireAdministrator(args.request);
  return loadNewProductRoute(args);
}

/**
 * Handle protected product and inline category mutations.
 *
 * @param args - React Router action arguments.
 * @returns Validation state or a successful redirect.
 */
export async function action(args: ActionFunctionArgs): Promise<NewProductActionResult | Response> {
  await requireAdministrator(args.request);
  return handleNewProductRouteAction(args);
}

/** Render the product creation route. */
export default function NewProductRoute(): React.ReactNode {
  return (
    <NewProductPage
      actionData={useActionData<NewProductActionResult>()}
      loaderData={useLoaderData<NewProductLoaderData>()}
    />
  );
}
