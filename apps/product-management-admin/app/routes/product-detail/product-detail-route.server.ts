import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { parseAdminSourceFromSearch, withAdminSource } from "../../admin-navigation";
import { preserveProductFormValues } from "../../features/admin/product-forms/product-form-data";
import { submitUpdateProductForm } from "../../features/admin/product-forms/product-mutations.server";
import {
  createBrand,
  getCategories,
  getProduct,
  isNotFound,
  mapApiError,
  updateProduct,
} from "../../api/admin-dashboard-api.server";
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
  const values = preserveProductFormValues(form);
  try {
    const submission = await submitUpdateProductForm(String(params.productId), form, {
      createBrand: (input) => createBrand(input, request),
      updateProduct: (productId, input) => updateProduct(productId, input, request),
    });
    if (!submission.ok) return { errors: submission.errors, values };
    return { ok: true, product: submission.product };
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
  const source = parseAdminSourceFromSearch(url.searchParams);
  const categoryId = url.searchParams.get("categoryId");
  if (categoryId) return withAdminSource(`/product-catalogus?categoryId=${categoryId}`, source);
  const brandId = url.searchParams.get("brandId");
  if (brandId) return withAdminSource(`/product-catalogus?brandId=${brandId}`, source);
  return withAdminSource("/product-catalogus", source);
}
