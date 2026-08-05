import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { requireAdministrator } from "../../auth.server";
import { PackageEditPage } from "../../features/product-catalog/pages/PackageEditPage";
import {
  handlePackageEditRouteAction,
  loadPackageEditRoute,
} from "./package-edit-route.server";
import type {
  PackageEditActionResult,
  PackageEditLoaderData,
} from "../../features/product-catalog/types/product-package.types";

/**
 * Return metadata for the package-edit route.
 *
 * @returns Route metadata.
 */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Verpakking bewerken" }];
}

/**
 * Load the protected package-edit form and its reference data.
 *
 * @param args - React Router loader arguments.
 * @returns Package edit data or a not-found state.
 */
export async function loader(args: LoaderFunctionArgs): Promise<PackageEditLoaderData> {
  await requireAdministrator(args.request);
  return loadPackageEditRoute(args);
}

/**
 * Handle a protected package edit.
 *
 * @param args - React Router action arguments.
 * @returns Validation state or a successful redirect.
 */
export async function action(args: ActionFunctionArgs): Promise<PackageEditActionResult | Response> {
  await requireAdministrator(args.request);
  return handlePackageEditRouteAction(args);
}

/** Render the package-edit route. */
export default function PackageEditRoute(): React.ReactNode {
  return (
    <PackageEditPage
      actionData={useActionData<PackageEditActionResult>()}
      loaderData={useLoaderData<PackageEditLoaderData>()}
    />
  );
}
