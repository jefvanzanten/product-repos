import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { parseAdminSourceFromSearch } from "../../admin-navigation";
import {
  cleanupProductPackageImage,
  getPackageTypes,
  getProduct,
  getProductPackage,
  getUnitTypes,
  isNotFound,
  mapApiError,
  updateProductPackage,
  uploadProductPackageImage,
} from "../../api/admin-dashboard-api.server";
import type {
  PackageEditActionResult,
  PackageEditLoaderData,
} from "../../features/product-catalog/types/product-package.types";

/**
 * Load a product package and edit reference data.
 *
 * @param args - React Router loader arguments.
 * @returns Package edit data or a not-found state.
 */
export async function loadPackageEditRoute({ params, request }: LoaderFunctionArgs): Promise<PackageEditLoaderData> {
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
export async function handlePackageEditRouteAction({ params, request }: ActionFunctionArgs): Promise<PackageEditActionResult | Response> {
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []));
  const productId = String(params.productId);
  const packageId = String(params.packageId);
  let uploadedImageUrl: string | null = null;
  try {
    const existingPackage = await getProductPackage(productId, packageId, request);
    const resolvedImage = await resolvePackageImage(form, existingPackage.imageUrl, productId, packageId, request);
    uploadedImageUrl = resolvedImage.uploadedImageUrl;
    await updateProductPackage(productId, packageId, readPackageForm(form, resolvedImage.imageUrl), request);
    return redirect(`/product-catalogus/${productId}${contextSearch(new URL(request.url))}`);
  } catch (error) {
    if (uploadedImageUrl !== null) {
      try {
        await cleanupProductPackageImage(productId, packageId, uploadedImageUrl, request);
      } catch (cleanupError) {
        console.error("Failed to clean up an unassociated package image", { cleanupError, packageId, productId });
      }
    }
    return { errors: mapApiError(error), values };
  }
}

/**
 * Parse total package content and a separately enabled optional portion.
 *
 * @param form - Submitted package form.
 * @param imageUrl - Resolved retained, removed, or uploaded image URL.
 * @returns Product-package mutation input.
 */
function readPackageForm(form: FormData, imageUrl: string | null) {
  const portionsPerPackage = String(form.get("portionsPerPackage") ?? "").trim();
  return {
    packageTypeId: Number(form.get("packageTypeId")),
    imageUrl,
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

/**
 * Resolve the retained, removed, or newly uploaded package image.
 *
 * @param form - Submitted package form.
 * @param currentImageUrl - Currently persisted image URL.
 * @param productId - Owning product identifier.
 * @param packageId - Target package identifier.
 * @param request - Incoming request carrying the administrator session.
 * @returns Resolved mutation URL and a separately tracked upload for rollback.
 */
async function resolvePackageImage(form: FormData, currentImageUrl: string | null, productId: string, packageId: string, request: Request): Promise<{ readonly imageUrl: string | null; readonly uploadedImageUrl: string | null }> {
  if (String(form.get("removeImage") ?? "") === "on") return { imageUrl: null, uploadedImageUrl: null };
  const image = form.get("packageImage");
  if (!(image instanceof File) || image.size === 0) return { imageUrl: currentImageUrl, uploadedImageUrl: null };
  const uploadedImageUrl = await uploadProductPackageImage(productId, packageId, image, request);
  return { imageUrl: uploadedImageUrl, uploadedImageUrl };
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
