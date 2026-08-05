import { redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { parseAdminSourceFromSearch, toAdminRedirectPath } from "../../admin-navigation";
import { preserveProductFormValues } from "../../features/product-catalog/server/product-form-data";
import { submitCreateProductForm } from "../../features/product-catalog/server/product-mutations.server";
import {
  createBrand,
  createCategory,
  createProduct,
  deleteCategory,
  getBrand,
  getBrands,
  getCategories,
  getPackageTypes,
  getUnitTypes,
  mapApiError,
} from "../../api/admin-dashboard-api.server";
import type {
  NewProductActionResult,
  NewProductLoaderData,
} from "../../features/product-catalog/types/new-product.types";

/**
 * Load reference data for the new-product page.
 *
 * @param args - React Router loader arguments.
 * @returns Data needed to render the product form.
 */
export async function loadNewProductRoute({ request }: LoaderFunctionArgs): Promise<NewProductLoaderData> {
  const url = new URL(request.url);
  const brandId = url.searchParams.get("brandId")?.trim() || undefined;
  const categoryId = url.searchParams.get("categoryId")?.trim() || undefined;
  const brandQuery = "";
  const [brands, selectedBrand] = await Promise.all([
    getBrands(brandQuery, request),
    brandId ? getBrand(brandId, request).catch(() => null) : Promise.resolve(null),
  ]);

  return {
    brandId,
    categoryId,
    brandQuery,
    brands: selectedBrand && !brands.some((brand) => brand.id === selectedBrand.id)
      ? [selectedBrand, ...brands]
      : brands,
    selectedBrand,
    categories: await getCategories(request),
    packageTypes: await getPackageTypes(request),
    unitTypes: await getUnitTypes(request),
  };
}

/**
 * Handle product and inline category mutations from the new-product page.
 *
 * @param args - React Router action arguments.
 * @returns Form errors, inline mutation data, or a product-detail redirect.
 */
export async function handleNewProductRouteAction({ request }: ActionFunctionArgs): Promise<NewProductActionResult | Response> {
  const form = await request.formData();
  const values = preserveProductFormValues(form);

  try {
    const intent = String(form.get("_action") ?? "createProduct");
    if (intent === "createCategory") {
      const categoryName = String(form.get("categoryName") ?? "").trim();
      if (!categoryName) return { errors: { categoryName: "Vul een categorienaam in." }, values };
      const parentRaw = String(form.get("categoryParentId") ?? "");
      const createdCategory = await createCategory({
        name: categoryName,
        parentId: parentRaw ? Number(parentRaw) : null,
      }, request);
      return {
        createdCategory,
        values: {
          ...values,
          categoryId: String(createdCategory.id),
          categoryParentId: parentRaw,
        },
      };
    }

    if (intent === "deleteCategory") {
      const categoryId = Number(form.get("categoryId"));
      if (!Number.isInteger(categoryId) || categoryId < 1) {
        return { errors: { form: "Categorie is ongeldig." }, values };
      }
      await deleteCategory(categoryId, request);
      return { deletedCategoryId: categoryId, values };
    }

    const submission = await submitCreateProductForm(form, {
      createBrand: (input) => createBrand(input, request),
      createProduct: (input) => createProduct(input, request),
    });
    if (!submission.ok) return { errors: submission.errors, values };

    const source = parseAdminSourceFromSearch(new URL(request.url).searchParams);
    return redirect(toAdminRedirectPath(`/product-catalogus/${submission.product.id}`, source));
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}
