import { redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
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
} from "../../../api/admin-dashboard-api.server";
import type {
  NewProductActionResult,
  NewProductLoaderData,
} from "./new-product.types";

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
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));

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

    const categoryId = Number(form.get("categoryId"));
    const brandQuery = String(form.get("brandQuery") ?? "").trim();
    let brandId = String(form.get("brandId") ?? "").trim() || null;
    const brandName = String(form.get("brandName") ?? "").trim();
    if (brandQuery && !brandId && !brandName) {
      return {
        errors: { brandName: "Kies een suggestie of maak het merk aan met de plus-optie." },
        values,
      };
    }
    if (brandName) {
      const brand = await createBrand({ name: brandName }, request);
      brandId = brand.id;
    }

    const productName = String(form.get("productName") ?? "").trim();
    const amount = String(form.get("amount") ?? "").trim().replace(",", ".");
    const packageTypeId = Number(form.get("packageTypeId"));
    const unitTypeId = Number(form.get("unitTypeId"));
    const unitsPerPackage = Number(form.get("unitsPerPackage"));
    const created = await createProduct({
      name: productName,
      categoryId,
      brandId,
      package: { amount, packageTypeId, unitTypeId, unitsPerPackage },
    }, request);
    return redirect(`/admin/product-catalogus/${created.id}`);
  } catch (error) {
    return { errors: mapApiError(error), values };
  }
}
