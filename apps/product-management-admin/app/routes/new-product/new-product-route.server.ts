import { readFormText } from "../../core/data/form-data";
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import type { BackendRequestContext } from "../../core/data/backend-api.server";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";
import { parseAdminSourceFromSearch, toAdminRedirectPath } from "../../core/presentation/routing/admin-navigation";
import { parseConcreteProduct } from "../../features/product-catalog/data/concrete-product-command-parser";
import { preserveProductFormValues, projectProductFormData } from "../../features/product-catalog/data/product-form-command-parser";
import { createBrand, createConcreteProduct, createProductComposition, getBrands, getCategories, getConcreteProduct, getPackageTypes, getUnitTypes } from "../../features/product-catalog/data/product-catalog-api.server";
import type { NewProductActionResult, NewProductLoaderData } from "../../features/product-catalog/presentation/types/new-product.types";
import { mapProductApiError } from "../../features/product-catalog/presentation/product-error-messages";

/** Load references and an optional composition copied from an existing product. */
export async function loadNewProductRoute({ request }: LoaderFunctionArgs): Promise<NewProductLoaderData> {
  const sameAs = new URL(request.url).searchParams.get("sameAs");
  const context = createBackendRequestContext(request);
  const [categories, brands, packageTypes, unitTypes, copiedProduct] = await Promise.all([
    getCategories(context),
    getBrands("", context),
    getPackageTypes(context),
    getUnitTypes(context),
    sameAs ? getConcreteProduct(sameAs, context).catch(() => null) : Promise.resolve(null),
  ]);
  return { categories, brands, packageTypes, unitTypes, selectedComposition: copiedProduct?.composition ?? null };
}

/** Create or reuse a composition and then create one concrete product. */
export async function handleNewProductRouteAction({ request }: ActionFunctionArgs): Promise<NewProductActionResult | Response> {
  const form = await request.formData();
  const context = createBackendRequestContext(request);
  const values = preserveProductFormValues(form);
  try {
    const composition = await resolveComposition(form, context);
    if ("errors" in composition) return { errors: composition.errors, values };
    const concreteInput = parseConcreteProduct(form, composition.value);
    if ("errors" in concreteInput) return { errors: concreteInput.errors, values };
    const product = await createConcreteProduct(concreteInput.value, context);
    const source = parseAdminSourceFromSearch(new URL(request.url).searchParams);
    return redirect(toAdminRedirectPath(`/product-catalogus/${product.productId}`, source));
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { errors: mapProductApiError(error), values };
  }
}

/** Resolve the explicitly selected composition or create a new shared composition. */
async function resolveComposition(form: FormData, context: BackendRequestContext): Promise<{ readonly value: string } | { readonly errors: Record<string, string> }> {
  const compositionId = readFormText(form, "productCompositionId").trim();
  if (compositionId) return { value: compositionId };

  const projection = projectProductFormData(form);
  if (!projection.ok) return projection;
  const brandId = await resolveBrandId(form, context);
  if ("errors" in brandId) return brandId;
  const composition = await createProductComposition({
    name: projection.value.name,
    categoryId: projection.value.categoryId,
    brandId: brandId.value,
    consumptionType: projection.value.consumptionType,
    macroProfile: projection.value.macroProfile,
  }, context);
  return { value: composition.id };
}

/** Resolve a selected brand or create the explicitly entered new brand. */
async function resolveBrandId(form: FormData, context: BackendRequestContext): Promise<{ readonly value: string | null } | { readonly errors: Record<string, string> }> {
  const selectedId = readFormText(form, "brandId").trim();
  const name = readFormText(form, "brandName").trim();
  if (name) return { value: (await createBrand({ name }, context)).id };
  return { value: selectedId || null };
}
