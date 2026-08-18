import { readFormText } from "../../core/data/form-data";
import type { BackendRequestContext } from "../../core/data/backend-api.server";
import { createBackendRequestContext } from "../../core/presentation/backend-request-context.server";
import { buildCategoryPath } from "../../features/product-catalog/domain/category-tree";
import type { Brand, Category } from "../../features/product-catalog/domain/product-catalog";
import { createCategory, deleteCategory, getBrands, getCategories, getConcreteProducts, updateCategory } from "../../features/product-catalog/data/product-catalog-api.server";
import type { ActionResult, CatalogBrowseResponse, LoaderData } from "../../features/product-catalog/presentation/types/product-catalog.types";
import { buildRootBrowse, buildSearchResponse, groupProductsByCategory, toCatalogProduct, toCategoryRow } from "../../features/product-catalog/presentation/catalog/catalog-projections";
import { mapProductApiError } from "../../features/product-catalog/presentation/product-error-messages";

/**
 * Load the established product catalog UI with concrete-product projections.
 *
 * @param request - The incoming page request.
 * @param editCategoryId - Optional category id to open in edit mode.
 * @returns The product catalog route data.
 */
export async function loadProductCatalog(request: Request, editCategoryId?: number): Promise<LoaderData> {
  const url = new URL(request.url);
  const context = createBackendRequestContext(request);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const requestedCategoryId = url.searchParams.get("categoryId");
  const brandId = url.searchParams.get("brandId");
  const archived = url.searchParams.get("archived") === "true";
  const cursor = url.searchParams.get("cursor");
  const [categories, brands] = await Promise.all([getCategories(context), getBrands("", context)]);
  const editCategory = editCategoryId ? categories.find((category) => category.id === editCategoryId) ?? null : null;
  const categoryId = requestedCategoryId ?? (editCategory?.parentId ? String(editCategory.parentId) : null);

  if (query.length >= 2) {
    const products = await getConcreteProducts({ query, archived, limit: 200 }, context);
    return {
      query,
      mode: "search",
      browse: null,
      search: buildSearchResponse(query, products.items, products.hasMore, categories, brands),
      categories,
      editCategory,
    };
  }

  return {
    query: "",
    mode: "browse",
    browse: await buildBrowseResponse({ archived, brandId, categoryId, cursor }, context, categories, brands),
    search: null,
    categories,
    editCategory,
  };
}

/** Build the restored browse states while retaining concrete product identifiers. */
async function buildBrowseResponse(
  input: { readonly archived: boolean; readonly brandId: string | null; readonly categoryId: string | null; readonly cursor: string | null },
  context: BackendRequestContext,
  categories: ReadonlyArray<Category>,
  brands: ReadonlyArray<Brand>,
): Promise<CatalogBrowseResponse> {
  if (input.brandId) {
    const products = await getConcreteProducts({ archived: input.archived, brandId: input.brandId, cursor: input.cursor, limit: 50 }, context);
    const brand = brands.find((candidate) => candidate.id === input.brandId);
    if (!brand) return buildRootBrowse(categories);
    return {
      state: "brand",
      brand,
      productGroups: groupProductsByCategory(products.items, categories, brands),
      hasMore: products.hasMore,
      cursor: products.cursor,
    };
  }

  if (input.categoryId) {
    const products = await getConcreteProducts({ archived: input.archived, categoryId: input.categoryId, cursor: input.cursor, limit: 50 }, context);
    const selectedId = Number(input.categoryId);
    const category = categories.find((candidate) => candidate.id === selectedId);
    if (!category) return buildRootBrowse(categories);
    const categoryPath = buildCategoryPath(category.id, categories);
    return {
      state: "category",
      category: toCategoryRow(category, categoryPath, products.items.length),
      categoryPath,
      subcategories: categories
        .filter((candidate) => candidate.parentId === category.id)
        .map((candidate) => toCategoryRow(candidate, buildCategoryPath(candidate.id, categories), 0)),
      products: {
        items: products.items.map((product) => toCatalogProduct(product, brands)),
        hasMore: products.hasMore,
        cursor: products.cursor,
      },
    };
  }

  if (input.archived) await getConcreteProducts({ archived: true, cursor: input.cursor, limit: 50 }, context);
  return buildRootBrowse(categories);
}

/**
 * Handle create/update category form data for the product catalog.
 *
 * @param request - The form submission request.
 * @returns The category mutation result.
 */
export async function handleProductCatalogAction(request: Request): Promise<ActionResult> {
  const form = await request.formData();
  const context = createBackendRequestContext(request);
  const intent = readFormText(form, "_action");
  try {
    if (intent === "createCategory") {
      const name = readFormText(form, "categoryName").trim();
      if (!name) return { errors: { categoryName: "Vul een categorienaam in." } };
      const parentIdRaw = readFormText(form, "parentId");
      const parentId = parentIdRaw ? Number(parentIdRaw) : null;
      return { ok: true, createdCategory: await createCategory({ name, parentId }, context) };
    }
    if (intent === "updateCategory") {
      const name = readFormText(form, "categoryName").trim();
      const categoryId = Number(form.get("categoryId"));
      if (!Number.isInteger(categoryId) || categoryId < 1) return { errors: { form: "Categorie is ongeldig." } };
      if (!name) return { errors: { categoryName: "Vul een categorienaam in." } };
      return { ok: true, updatedCategory: await updateCategory({ id: categoryId, name }, context) };
    }
    if (intent === "deleteCategory") {
      const categoryId = Number(form.get("categoryId"));
      const parentIdRaw = readFormText(form, "parentId");
      const parentId = parentIdRaw ? Number(parentIdRaw) : null;
      if (!Number.isInteger(categoryId) || categoryId < 1 || (parentId !== null && (!Number.isInteger(parentId) || parentId < 1))) {
        return { errors: { form: "Categorie is ongeldig." } };
      }
      await deleteCategory(categoryId, context);
      return { ok: true, deletedCategoryId: categoryId, deletedCategoryParentId: parentId };
    }
    return { errors: { form: "Onbekende actie." } };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { errors: mapProductApiError(error) };
  }
}
