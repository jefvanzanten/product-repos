import {
  brandDtoSchema,
  categoryDtoSchema,
  concreteProductDetailSchema,
  concreteProductPageSchema,
  macroProfileSchema,
  packageTypeDtoSchema,
  productCompositionDtoSchema,
  unitTypeDtoSchema,
} from "@product-repos/contracts";
import { z, type ZodType } from "zod/v4";
import { sendBackendRequest, type BackendMethod, type BackendRequestContext } from "../../../core/data/backend-api.server";
import type { Brand, Category, ConcreteProductDetail, ConcreteProductPage, CreateConcreteProduct, CreateProductComposition, MacroProfile, PackageType, ProductComposition, UnitType, UpdateConcreteProduct, UpdateProductComposition } from "../domain/product-catalog";
import { mapBrand, mapCategory, mapConcreteProductDetail, mapConcreteProductPage, mapPackageType, mapProductComposition, mapUnitType } from "./product-catalog-mappers";

const brandListSchema = brandDtoSchema.array();
const categoryListSchema = categoryDtoSchema.array();
const packageTypeListSchema = packageTypeDtoSchema.array();
const productCompositionListSchema = productCompositionDtoSchema.array();
const unitTypeListSchema = unitTypeDtoSchema.array();
const apiErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  fields: z.record(z.string(), z.string()).optional(),
});
type ApiError = z.infer<typeof apiErrorSchema>;
type BackendRequestSender = typeof sendBackendRequest;
type CatalogRequestBody = CreateConcreteProduct | CreateProductComposition | UpdateConcreteProduct | MacroProfile | { readonly name: string; readonly parentId?: number | null };

/**
 * Create a product-catalog API backed by the provided request transport.
 *
 * @param sendRequest - Transport used for authenticated backend requests.
 * @returns Product-catalog operations bound to the provided transport.
 */
function createProductCatalogApi(sendRequest: BackendRequestSender) {
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

/** Search shared product compositions by composition or brand name. */
async function searchProductCompositions(query: string, context: BackendRequestContext): Promise<ProductComposition[]> {
  const params = new URLSearchParams({ query });
  return (await requestJson(`/product-compositions/search?${params}`, context, productCompositionListSchema)).map(mapProductComposition);
}

/** Fetch one complete concrete-product detail projection. */
async function getConcreteProduct(productId: string, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  return mapConcreteProductDetail(await requestJson(`/products/${productId}`, context, concreteProductDetailSchema));
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
  return mapProductComposition(await requestJson("/product-compositions", context, productCompositionDtoSchema, "POST", input));
}

/** Create one concrete product with the incoming session. */
async function createConcreteProduct(input: CreateConcreteProduct, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  return mapConcreteProductDetail(await requestJson("/products", context, concreteProductDetailSchema, "POST", input));
}

/** Update shared composition identity fields. */
async function updateProductComposition(compositionId: string, input: UpdateProductComposition, context: BackendRequestContext): Promise<ProductComposition> {
  return mapProductComposition(await requestJson(`/product-compositions/${compositionId}`, context, productCompositionDtoSchema, "PUT", input));
}

/** Update a shared composition macro profile. */
async function updateProductCompositionMacroProfile(compositionId: string, input: MacroProfile, context: BackendRequestContext): Promise<MacroProfile> {
  return requestJson(`/product-compositions/${compositionId}/macro-profile`, context, macroProfileSchema, "PUT", input);
}

/** Update fields owned by one concrete product. */
async function updateConcreteProduct(productId: string, input: UpdateConcreteProduct, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  return mapConcreteProductDetail(await requestJson(`/products/${productId}`, context, concreteProductDetailSchema, "PUT", input));
}

/** Archive one concrete product. */
async function archiveConcreteProduct(productId: string, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  return mapConcreteProductDetail(await requestJson(`/products/${productId}/archive`, context, concreteProductDetailSchema, "POST"));
}

/** Restore one concrete product. */
async function restoreConcreteProduct(productId: string, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  return mapConcreteProductDetail(await requestJson(`/products/${productId}/restore`, context, concreteProductDetailSchema, "POST"));
}

/** Determine whether an API failure is a not-found response. */
function isNotFound(error: Error): boolean {
  return error instanceof BackendApiError && error.status === 404;
}

/** Perform one authenticated backend request and parse its endpoint contract. */
async function requestJson<T>(path: string, context: BackendRequestContext, schema: ZodType<T>, method: BackendMethod = "GET", body?: CatalogRequestBody): Promise<T> {
  const response = await sendRequest(path, context, { method, body });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  return schema.parse(await response.json());
}

/** Perform one authenticated request without a response body. */
async function requestWithoutBody(path: string, context: BackendRequestContext, method: BackendMethod): Promise<void> {
  const response = await sendRequest(path, context, { method });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
}

/** Parse a backend error response into its safe protocol projection. */
async function readApiError(response: Response): Promise<ApiError> {
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data : { message: response.statusText };
}

  return { archiveConcreteProduct, createBrand, createCategory, createConcreteProduct, createProductComposition, deleteCategory, getBrand, getBrands, getCategories, getConcreteProduct, getConcreteProducts, getPackageTypes, getUnitTypes, isNotFound, restoreConcreteProduct, searchProductCompositions, updateCategory, updateConcreteProduct, updateProductComposition, updateProductCompositionMacroProfile };
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

const { archiveConcreteProduct, createBrand, createCategory, createConcreteProduct, createProductComposition, deleteCategory, getBrand, getBrands, getCategories, getConcreteProduct, getConcreteProducts, getPackageTypes, getUnitTypes, isNotFound, restoreConcreteProduct, searchProductCompositions, updateCategory, updateConcreteProduct, updateProductComposition, updateProductCompositionMacroProfile } = createProductCatalogApi(sendBackendRequest);

export type { BackendRequestSender, Brand, Category, ConcreteProductDetail, PackageType, ProductComposition, UnitType };
export { archiveConcreteProduct, createBrand, createCategory, createConcreteProduct, createProductCatalogApi, createProductComposition, deleteCategory, getBrand, getBrands, getCategories, getConcreteProduct, getConcreteProducts, getPackageTypes, getUnitTypes, isNotFound, restoreConcreteProduct, searchProductCompositions, updateCategory, updateConcreteProduct, updateProductComposition, updateProductCompositionMacroProfile };
