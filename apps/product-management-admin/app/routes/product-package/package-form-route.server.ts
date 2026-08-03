import { redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { parseAdminSourceFromSearch } from "../../admin-navigation";
import {
  addProductPackage,
  getPackageTypes,
  getProduct,
  getUnitTypes,
  isNotFound,
  mapApiError,
} from "../../api/admin-dashboard-api.server";
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
 * @returns Form errors or a package-edit redirect.
 */
export async function handlePackageFormRouteAction({ params, request }: ActionFunctionArgs): Promise<PackageFormActionResult | Response> {
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  try {
    const created = await addProductPackage(String(params.productId), readPackageForm(form), request);
    return redirect(
      `/product-catalogus/${params.productId}/verpakkingen/${created.id}${contextSearch(new URL(request.url))}`,
    );
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}

/** Parse total package content and a separately enabled optional portion. */
function readPackageForm(form: FormData) {
  const portionsPerPackage = String(form.get("portionsPerPackage") ?? "").trim();
  const imageUrl = String(form.get("imageUrl") ?? "").trim();
  return {
    packageTypeId: Number(form.get("packageTypeId")),
    imageUrl: imageUrl.length === 0 ? null : imageUrl,
    amount: String(form.get("amount") ?? "").trim().replace(",", "."),
    unitTypeId: Number(form.get("unitTypeId")),
    portion: String(form.get("portionEnabled") ?? "") !== "on" ? null : {
      name: String(form.get("portionName") ?? "").trim(),
      amount: String(form.get("portionAmount") ?? "").trim().replace(",", "."),
      unitTypeId: Number(form.get("portionUnitTypeId")),
      portionsPerPackage: portionsPerPackage.length === 0 ? null : Number(portionsPerPackage),
    },
  };
}

/** Preserve supported catalog context parameters. */
function contextSearch(url: URL): string {
  const params = new URLSearchParams();
  const categoryId = url.searchParams.get("categoryId");
  const brandId = url.searchParams.get("brandId");
  if (categoryId) params.set("categoryId", categoryId);
  if (brandId) params.set("brandId", brandId);
  const source = parseAdminSourceFromSearch(url.searchParams);
  if (source !== null) params.set("source", source);
  const query = params.toString();
  return query ? `?${query}` : "";
}
