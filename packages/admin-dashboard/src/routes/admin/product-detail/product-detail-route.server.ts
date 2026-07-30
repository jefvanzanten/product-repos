import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  createBrand,
  getCategories,
  getProduct,
  isNotFound,
  mapApiError,
  updateProduct,
} from "../../../api/admin-dashboard-api.server";
import type {
  ProductDetailActionResult,
  ProductDetailLoaderData,
} from "./product-detail.types";

/**
 * Load a product and its edit reference data.
 *
 * @param args - React Router loader arguments.
 * @returns Product detail data or a not-found state.
 */
export async function loadProductDetailRoute({ params, request }: LoaderFunctionArgs): Promise<ProductDetailLoaderData> {
  const backUrl = buildBackUrl(new URL(request.url));
  try {
    return {
      found: true,
      product: await getProduct(String(params.productId), request),
      categories: await getCategories(request),
      backUrl,
    };
  } catch (error) {
    if (isNotFound(error)) return { found: false, backUrl };
    throw error;
  }
}

/**
 * Handle product detail edits.
 *
 * @param args - React Router action arguments.
 * @returns The updated product or form errors.
 */
export async function handleProductDetailRouteAction({ params, request }: ActionFunctionArgs): Promise<ProductDetailActionResult> {
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  try {
    const productName = String(form.get("productName") ?? "").trim();
    const categoryId = Number(form.get("categoryId"));
    const brandName = String(form.get("brandName") ?? "").trim();
    const brand = brandName ? await createBrand({ name: brandName }, request) : null;
    const product = await updateProduct(String(params.productId), {
      name: productName,
      categoryId,
      brandId: brand?.id ?? null,
    }, request);
    return { ok: true, product };
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}

/**
 * Build the product-catalog return URL from route context.
 *
 * @param url - Current product detail URL.
 * @returns The matching catalog context URL.
 */
function buildBackUrl(url: URL): string {
  const categoryId = url.searchParams.get("categoryId");
  if (categoryId) return `/admin/product-catalogus?categoryId=${categoryId}`;
  const brandId = url.searchParams.get("brandId");
  if (brandId) return `/admin/product-catalogus?brandId=${brandId}`;
  return "/admin/product-catalogus";
}
