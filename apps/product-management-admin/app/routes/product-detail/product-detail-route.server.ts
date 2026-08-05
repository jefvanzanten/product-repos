import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { parseAdminSourceFromSearch, withAdminSource } from "../../admin-navigation";
import { preserveProductFormValues } from "../../features/product-catalog/server/product-form-data";
import { submitUpdateProductForm } from "../../features/product-catalog/server/product-mutations.server";
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
  ProductDetailDto,
  ProductDetailEditIntent,
  ProductDetailLoaderData,
} from "../../features/product-catalog/types/product-detail.types";

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
  const intent = form.get("intent") === "nutrition" ? "nutrition" : "product";
  const values = preserveProductFormValues(form);
  try {
    const productId = String(params.productId);
    enforceCompartmentBoundary(form, intent, await getProduct(productId, request));
    const submission = await submitUpdateProductForm(productId, form, {
      createBrand: (input) => createBrand(input, request),
      updateProduct: (productId, input) => updateProduct(productId, input, request),
    });
    if (!submission.ok) return { intent, errors: submission.errors, values };
    return { intent, ok: true, product: submission.product };
  } catch (error) {
    return { intent, errors: mapApiError(error), values };
  }
}

/**
 * Prevent one edit compartment from changing fields owned by another compartment.
 *
 * @param form - Submitted compartment form, mutated with canonical retained values.
 * @param intent - Compartment that owns the submitted mutation.
 * @param product - Current persisted product used to protect other fields.
 * @returns Nothing.
 */
function enforceCompartmentBoundary(form: FormData, intent: ProductDetailEditIntent, product: ProductDetailDto): void {
  if (intent === "nutrition") {
    form.set("categoryId", String(product.category.id));
    form.set("productName", product.name);
    form.set("brandId", product.brand?.id ?? "");
    form.delete("brandName");
    form.set("consumptionType", product.consumptionType);
    return;
  }

  const profile = product.macroProfile;
  if (profile === null) {
    form.delete("macroEnabled");
    return;
  }
  form.set("macroEnabled", "on");
  form.set("referenceBasis", profile.referenceBasis);
  form.set("caloriesKcal", profile.caloriesKcal ?? "");
  form.set("proteinG", profile.proteinG ?? "");
  form.set("carbohydratesG", profile.carbohydratesG ?? "");
  form.set("fatG", profile.fatG ?? "");
  form.set("caloriesSource", profile.caloriesSource ?? "");
  form.set("caloriesChanged", "false");
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
