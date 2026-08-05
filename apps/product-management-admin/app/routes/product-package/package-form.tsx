import {
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { requireAdministrator } from "../../auth.server";
import { PackageFormPage } from "../../features/product-catalog/pages/PackageFormPage";
import {
  handlePackageFormRouteAction,
  loadPackageFormRoute,
} from "./package-form-route.server";
import type {
  PackageFormActionResult,
  PackageFormLoaderData,
} from "../../features/product-catalog/types/product-package.types";

/** Return metadata for the add-package route. */
export function meta(): ReadonlyArray<{ readonly title: string }> {
  return [{ title: "Verpakking toevoegen" }];
}

/**
 * Load protected product and package reference data.
 *
 * @param args - React Router loader arguments.
 * @returns Product and package reference data.
 */
export async function loader(args: LoaderFunctionArgs): Promise<PackageFormLoaderData> {
  await requireAdministrator(args.request);
  return loadPackageFormRoute(args);
}

/**
 * Handle protected package creation.
 *
 * @param args - React Router action arguments.
 * @returns Validation state or a successful redirect.
 */
export async function action(args: ActionFunctionArgs): Promise<PackageFormActionResult | Response> {
  await requireAdministrator(args.request);
  return handlePackageFormRouteAction(args);
}

/** Render the package creation route. */
export default function PackageFormRoute(): React.ReactNode {
  return (
    <PackageFormPage
      actionData={useActionData<PackageFormActionResult>()}
      loaderData={useLoaderData<PackageFormLoaderData>()}
    />
  );
}
