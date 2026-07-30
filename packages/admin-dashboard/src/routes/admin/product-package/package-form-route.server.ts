import { redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  addProductPackage,
  getPackageTypes,
  getProduct,
  getUnitTypes,
  isNotFound,
  mapApiError,
} from "../../../api/admin-dashboard-api.server";
import type {
  PackageFormActionResult,
  PackageFormLoaderData,
} from "./product-package-route.types";

/**
 * Load product and reference data for the add-package page.
 *
 * @param args - React Router loader arguments.
 * @returns Add-package page data or a not-found state.
 */
export async function loadPackageFormRoute({ params, request }: LoaderFunctionArgs): Promise<PackageFormLoaderData> {
  const context = contextSearch(new URL(request.url));
  try {
    return {
      found: true,
      product: await getProduct(String(params.productId), request),
      packageTypes: await getPackageTypes(request),
      unitTypes: await getUnitTypes(request),
      context,
    };
  } catch (error) {
    if (isNotFound(error)) return { found: false, context };
    throw error;
  }
}

/**
 * Add a package and redirect to its detail page.
 *
 * @param args - React Router action arguments.
 * @returns Form errors or a package-detail redirect.
 */
export async function handlePackageFormRouteAction({ params, request }: ActionFunctionArgs): Promise<PackageFormActionResult | Response> {
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  try {
    const created = await addProductPackage(String(params.productId), readPackageForm(form), request);
    return redirect(
      `/admin/product-catalogus/${params.productId}/verpakkingen/${created.id}${contextSearch(new URL(request.url))}`,
    );
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
