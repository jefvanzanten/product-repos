import {
  brandDtoSchema,
  categoryDtoSchema,
  concreteProductDetailSchema,
  concreteProductPageSchema,
  concreteProductSummarySchema,
  macroProfileSchema,
  packageTypeDtoSchema,
  productCompositionDetailSchema,
  productCompositionDtoSchema,
  unitTypeDtoSchema,
} from "@product-repos/contracts";
import { z, type ZodType } from "zod/v4";
import { sendBackendRequest, type BackendMethod, type BackendRequestContext } from "../../../core/data/backend-api.server";
import { buildCategoryPath } from "../domain/category-tree";
import type { Brand, Category, ConcreteProductDetail, ConcreteProductPage, CreateConcreteProduct, CreateProductComposition, MacroProfile, PackageType, ProductComposition, UnitType, UpdateConcreteProduct, UpdateProductComposition } from "../domain/product-catalog";
import { mapBrand, mapCategory, mapConcreteProductDetail, mapConcreteProductPage, mapPackageType, mapProductComposition, mapUnitType } from "./product-catalog-mappers";

const brandListSchema = brandDtoSchema.array();
const categoryListSchema = categoryDtoSchema.array();
const packageTypeListSchema = packageTypeDtoSchema.array();
const backendCompositionListSchema = productCompositionDetailSchema.array();
const backendConcreteProductDetailSchema = concreteProductSummarySchema.extend({
  packageTypeId: z.number().int().positive().nullable(),
  content: z.object({ amount: z.string(), unitTypeId: z.number().int().positive(), symbol: z.string(), dimension: z.enum(["MASS", "VOLUME", "COUNT"]) }).strict().nullable(),
  portion: z.object({ singularName: z.string(), pluralName: z.string(), amount: z.string(), unitTypeId: z.number().int().positive(), portionsPerProduct: z.number().int().positive().nullable() }).strict().nullable(),
}).strict();
const unitTypeListSchema = unitTypeDtoSchema.array();
const apiErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  fields: z.record(z.string(), z.string()).optional(),
});
type ApiError = z.infer<typeof apiErrorSchema>;
type CatalogRequestBody = CreateConcreteProduct | CreateProductComposition | UpdateConcreteProduct | MacroProfile | { readonly name: string; readonly parentId?: number | null };

/** Fetch catalog categories with the incoming session. */
async function getCategories(context: BackendRequestContext): Promise<Category[]> {
  return (await requestJson("/categories", context, categoryListSchema)).map(mapCategory);
}

/** Fetch brand suggestions with the incoming session. */
async function getBrands(query: string, context: BackendRequestContext): Promise<Brand[]> {
  return (await requestJson(`/brands?${new URLSearchParams({ query })}`, context, brandListSchema)).map(mapBrand);
}

/** Fetch one brand with the incoming session. */
async function getBrand(brandId: string, context: BackendRequestContext): Promise<Brand> {
  return mapBrand(await requestJson(`/brands/${brandId}`, context, brandDtoSchema));
}

/** Fetch unit types with the incoming session. */
async function getUnitTypes(context: BackendRequestContext): Promise<UnitType[]> {
  return (await requestJson("/unit-types", context, unitTypeListSchema)).map(mapUnitType);
}

/** Fetch package types with the incoming session. */
async function getPackageTypes(context: BackendRequestContext): Promise<PackageType[]> {
  return (await requestJson("/package-types", context, packageTypeListSchema)).map(mapPackageType);
}

/** Fetch a filtered page of concrete products with the incoming session. */
async function getConcreteProducts(input: { readonly query?: string; readonly categoryId?: string | null; readonly brandId?: string | null; readonly archived?: boolean; readonly cursor?: string | null; readonly limit?: number }, context: BackendRequestContext): Promise<ConcreteProductPage> {
  const params = new URLSearchParams();
  if (input.query) params.set("query", input.query);
  if (input.categoryId) params.set("categoryId", input.categoryId);
  if (input.brandId) params.set("brandId", input.brandId);
  if (input.archived !== undefined) params.set("archived", String(input.archived));
  if (input.cursor) params.set("cursor", input.cursor);
  if (input.limit) params.set("limit", String(input.limit));
  const query = params.toString();
  return mapConcreteProductPage(await requestJson(`/products${query ? `?${query}` : ""}`, context, concreteProductPageSchema));
}

/** Search compositions by shared name and brand and enrich them for the admin UI. */
async function searchProductCompositions(query: string, context: BackendRequestContext): Promise<ProductComposition[]> {
  const params = new URLSearchParams({ query });
  const [compositions, categories, products] = await Promise.all([
    requestJson(`/product-compositions/search?${params}`, context, backendCompositionListSchema),
    getCategories(context),
    getConcreteProducts({ query, limit: 200 }, context),
  ]);
  return compositions.map((composition) => {
    const category = categories.find((item) => item.id === composition.categoryId);
    if (!category) throw new Error("Product composition response refers to an unknown category");
    const categoryPath = buildCategoryPath(category.id, categories);
    const productCount = products.items.filter((product) => product.productCompositionId === composition.id).length;
    return mapProductComposition(productCompositionDtoSchema.parse({ id: composition.id, name: composition.name, brand: composition.brand, category, categoryPath, consumptionType: composition.consumptionType, macroProfile: composition.macroProfile, productCount, activeProductCount: productCount }));
  });
}

/** Fetch concrete product detail and join its shared composition projection. */
async function getConcreteProduct(productId: string, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  const raw = await requestJson(`/products/${productId}`, context, backendConcreteProductDetailSchema);
  const compositions = await searchProductCompositions(raw.compositionName, context);
  const composition = compositions.find((item) => item.id === raw.productCompositionId);
  if (!composition) throw new Error("Concrete product response contains no matching composition");
  return mapConcreteProductDetail(concreteProductDetailSchema.parse({ ...raw, composition }));
}

/** Create a category with the incoming session. */
async function createCategory(input: { name: string; parentId: number | null }, context: BackendRequestContext): Promise<Category> {
  return mapCategory(await requestJson("/categories", context, categoryDtoSchema, "POST", input));
}

/** Update a category with the incoming session. */
async function updateCategory(input: { id: number; name: string }, context: BackendRequestContext): Promise<Category> {
  return mapCategory(await requestJson(`/categories/${input.id}`, context, categoryDtoSchema, "PATCH", { name: input.name }));
}

/** Delete a category with the incoming session. */
async function deleteCategory(id: number, context: BackendRequestContext): Promise<void> {
  await requestWithoutBody(`/categories/${id}`, context, "DELETE");
}

/** Create or resolve a brand with the incoming session. */
async function createBrand(input: { name: string }, context: BackendRequestContext): Promise<Brand> {
  return mapBrand(await requestJson("/brands", context, brandDtoSchema, "POST", input));
}

/** Create a product composition with the incoming session. */
async function createProductComposition(input: CreateProductComposition, context: BackendRequestContext): Promise<ProductComposition> {
  const created = await requestJson("/product-compositions", context, productCompositionDetailSchema, "POST", input);
  const matches = await searchProductCompositions(created.name, context);
  const composition = matches.find((item) => item.id === created.id);
  if (!composition) throw new Error("Created product composition could not be read back");
  return composition;
}

/** Create one concrete product with the incoming session. */
async function createConcreteProduct(input: CreateConcreteProduct, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  const created = await requestJson("/products", context, backendConcreteProductDetailSchema, "POST", input);
  return getConcreteProduct(created.productId, context);
}

/** Update shared composition identity fields. */
async function updateProductComposition(compositionId: string, input: UpdateProductComposition, context: BackendRequestContext): Promise<ProductComposition> {
  const updated = await requestJson(`/product-compositions/${compositionId}`, context, productCompositionDetailSchema, "PUT", input);
  const matches = await searchProductCompositions(updated.name, context);
  const composition = matches.find((item) => item.id === updated.id);
  if (!composition) throw new Error("Updated product composition could not be read back");
  return composition;
}

/** Update a shared composition macro profile. */
async function updateProductCompositionMacroProfile(compositionId: string, input: MacroProfile, context: BackendRequestContext): Promise<MacroProfile> {
  return requestJson(`/product-compositions/${compositionId}/macro-profile`, context, macroProfileSchema, "PUT", input);
}

/** Update fields owned by one concrete product. */
async function updateConcreteProduct(productId: string, input: UpdateConcreteProduct, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  await requestJson(`/products/${productId}`, context, backendConcreteProductDetailSchema, "PUT", { ...input, productCompositionId: await getCompositionId(productId, context) });
  return getConcreteProduct(productId, context);
}

/** Archive one concrete product. */
async function archiveConcreteProduct(productId: string, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  await requestJson(`/products/${productId}/archive`, context, backendConcreteProductDetailSchema, "POST");
  return getConcreteProduct(productId, context);
}

/** Restore one concrete product. */
async function restoreConcreteProduct(productId: string, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  await requestJson(`/products/${productId}/restore`, context, backendConcreteProductDetailSchema, "POST");
  return getConcreteProduct(productId, context);
}

/** Resolve the composition identifier required by the backend's full product PUT contract. */
async function getCompositionId(productId: string, context: BackendRequestContext): Promise<string> {
  return (await requestJson(`/products/${productId}`, context, backendConcreteProductDetailSchema)).productCompositionId;
}

/** Determine whether an API failure is a not-found response. */
function isNotFound(error: Error): boolean {
  return error instanceof BackendApiError && error.status === 404;
}

/** Perform one authenticated backend request and parse its endpoint contract. */
async function requestJson<T>(path: string, context: BackendRequestContext, schema: ZodType<T>, method: BackendMethod = "GET", body?: CatalogRequestBody): Promise<T> {
  const response = await sendBackendRequest(path, context, { method, body });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  return schema.parse(await response.json());
}

/** Perform one authenticated request without a response body. */
async function requestWithoutBody(path: string, context: BackendRequestContext, method: BackendMethod): Promise<void> {
  const response = await sendBackendRequest(path, context, { method });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
}

/** Parse a backend error response into its safe protocol projection. */
async function readApiError(response: Response): Promise<ApiError> {
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data : { message: response.statusText };
}

/** Classified product-catalog backend error. */
export class BackendApiError extends Error {
  readonly kind = "ProductApiFailure";
  readonly code: string | undefined;
  readonly fields: Readonly<Record<string, string>> | undefined;

  /** Create one parsed backend error. */
  constructor(readonly status: number, readonly body: ApiError) {
    super(body.message ?? `Backend request failed with status ${status}`);
    this.code = body.code;
    this.fields = body.fields;
  }
}

export type { Brand, Category, ConcreteProductDetail, PackageType, ProductComposition, UnitType };
export { archiveConcreteProduct, createBrand, createCategory, createConcreteProduct, createProductComposition, deleteCategory, getBrand, getBrands, getCategories, getConcreteProduct, getConcreteProducts, getPackageTypes, getUnitTypes, isNotFound, restoreConcreteProduct, searchProductCompositions, updateCategory, updateConcreteProduct, updateProductComposition, updateProductCompositionMacroProfile };
