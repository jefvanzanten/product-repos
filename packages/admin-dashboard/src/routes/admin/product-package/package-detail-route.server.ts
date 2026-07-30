import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  getPackageTypes,
  getProduct,
  getProductPackage,
  getUnitTypes,
  isNotFound,
  mapApiError,
  updateProductPackage,
} from "../../../api/admin-dashboard-api.server";
import type {
  PackageDetailActionResult,
  PackageDetailLoaderData,
} from "./product-package-route.types";

/**
 * Load a product package and edit reference data.
 *
 * @param args - React Router loader arguments.
 * @returns Package detail data or a not-found state.
 */
export async function loadPackageDetailRoute({ params, request }: LoaderFunctionArgs): Promise<PackageDetailLoaderData> {
  const productId = String(params.productId);
  const packageId = String(params.packageId);
  const context = contextSearch(new URL(request.url));
  try {
    const product = await getProduct(productId, request);
    return {
      found: true,
      product,
      packageDetail: await getProductPackage(productId, packageId, request),
      packageTypes: await getPackageTypes(request),
      unitTypes: await getUnitTypes(request),
      context,
    };
  } catch (error) {
    if (isNotFound(error)) {
      return { found: false, productFound: false, productId, context };
    }
    throw error;
  }
}

/**
 * Update a product package.
 *
 * @param args - React Router action arguments.
 * @returns The updated package or form errors.
 */
export async function handlePackageDetailRouteAction({ params, request }: ActionFunctionArgs): Promise<PackageDetailActionResult> {
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  try {
    const packageDetail = await updateProductPackage(
      String(params.productId),
      String(params.packageId),
      readPackageForm(form),
      request,
    );
    return { ok: true, packageDetail };
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}

/** Parse package form fields into an API request. */
function readPackageForm(form: FormData) {
  return {
    packageTypeId: Number(form.get("packageTypeId")),
    amount: String(form.get("amount") ?? "").trim().replace(",", "."),
    unitTypeId: Number(form.get("unitTypeId")),
    unitsPerPackage: Number(form.get("unitsPerPackage")),
  };
}

/** Preserve supported catalog context parameters. */
function contextSearch(url: URL): string {
  const params = new URLSearchParams();
  const categoryId = url.searchParams.get("categoryId");
  const brandId = url.searchParams.get("brandId");
  if (categoryId) params.set("categoryId", categoryId);
  if (brandId) params.set("brandId", brandId);
  const query = params.toString();
  return query ? `?${query}` : "";
}
