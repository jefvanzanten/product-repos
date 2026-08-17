import { readFormText } from "../../core/data/form-data";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import type { BackendRequestContext } from "../../core/data/backend-api.server";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";
import { parseAdminSourceFromSearch, withAdminSource } from "../../core/presentation/routing/admin-navigation";
import { parseConcreteProduct } from "../../features/product-catalog/data/concrete-product-command-parser";
import { preserveProductFormValues, projectProductFormData } from "../../features/product-catalog/data/product-form-command-parser";
import { archiveConcreteProduct, createBrand, getBrands, getCategories, getConcreteProduct, getPackageTypes, getUnitTypes, isNotFound, restoreConcreteProduct, updateConcreteProduct, updateProductComposition, updateProductCompositionMacroProfile } from "../../features/product-catalog/data/product-catalog-api.server";
import type { ProductDetailActionResult, ProductDetailEditIntent, ProductDetailLoaderData } from "../../features/product-catalog/presentation/types/product-detail.types";
import { mapProductApiError } from "../../features/product-catalog/presentation/product-error-messages";

/** Load concrete product detail and all edit references. */
export async function loadProductDetailRoute({ params, request }: LoaderFunctionArgs): Promise<ProductDetailLoaderData> {
  const backUrl = buildBackUrl(new URL(request.url));
  const context = createBackendRequestContext(request);
  try {
    const [product, categories, brands, packageTypes, unitTypes] = await Promise.all([
      getConcreteProduct(String(params.productId), context), getCategories(context), getBrands("", context), getPackageTypes(context), getUnitTypes(context),
    ]);
    return { found: true, product, categories, brands, packageTypes, unitTypes, backUrl };
  } catch (error) {
    if (isNotFound(error)) return { found: false, backUrl };
    throw error;
  }
}

/** Mutate exactly one shared, local, nutrition, or archive compartment. */
export async function handleProductDetailRouteAction({ params, request }: ActionFunctionArgs): Promise<ProductDetailActionResult> {
  const form = await request.formData();
  const context = createBackendRequestContext(request);
  const intent = parseIntent(form.get("intent"));
  const values = preserveProductFormValues(form);
  const productId = String(params.productId);
  try {
    const current = await getConcreteProduct(productId, context);
    if (intent === "archive") return { intent, ok: true, product: await archiveConcreteProduct(productId, context) };
    if (intent === "restore") return { intent, ok: true, product: await restoreConcreteProduct(productId, context) };
    if (intent === "product") {
      const parsed = parseConcreteProduct(form, current.productCompositionId);
      if ("errors" in parsed) return { intent, errors: parsed.errors, values };
      const { productCompositionId: _compositionId, ...input } = parsed.value;
      return { intent, ok: true, product: await updateConcreteProduct(productId, input, context) };
    }

    const projection = projectProductFormData(form);
    if (!projection.ok) return { intent, errors: projection.errors, values };
    if (form.get("confirmSharedImpact") !== "on") return { intent, errors: { form: "Bevestig dat deze wijziging alle gekoppelde producten raakt." }, values };
    if (intent === "nutrition") {
      if (projection.value.macroProfile === null) return { intent, errors: { macroProfile: "Vul een macroprofiel in." }, values };
      await updateProductCompositionMacroProfile(current.productCompositionId, projection.value.macroProfile, context);
    } else {
      const brandId = await resolveBrandId(form, context);
      await updateProductComposition(current.productCompositionId, {
        name: projection.value.name, categoryId: projection.value.categoryId, brandId, consumptionType: projection.value.consumptionType, macroProfile: current.composition.macroProfile,
      }, context);
    }
    return { intent, ok: true, product: await getConcreteProduct(productId, context) };
  } catch (error) {
    return { intent, errors: mapProductApiError(error), values };
  }
}

/** Parse a supported detail mutation intent. */
function parseIntent(value: FormDataEntryValue | null): ProductDetailEditIntent {
  if (value === "composition" || value === "nutrition" || value === "archive" || value === "restore") return value;
  return "product";
}

/** Resolve an existing or newly entered brand for a shared composition edit. */
async function resolveBrandId(form: FormData, context: BackendRequestContext): Promise<string | null> {
  const newName = readFormText(form, "brandName").trim();
  if (newName) return (await createBrand({ name: newName }, context)).id;
  return readFormText(form, "brandId").trim() || null;
}

/** Build the product-catalog return URL from route context. */
function buildBackUrl(url: URL): string {
  const source = parseAdminSourceFromSearch(url.searchParams);
  const params = new URLSearchParams();
  for (const key of ["q", "categoryId", "brandId", "archived"] as const) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const path = params.size > 0 ? `/product-catalogus?${params.toString()}` : "/product-catalogus";
  return withAdminSource(path, source);
}
