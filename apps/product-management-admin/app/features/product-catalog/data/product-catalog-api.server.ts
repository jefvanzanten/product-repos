import { z } from "zod/v4";
import {
  brandDtoSchema,
  concreteProductDetailSchema,
  concreteProductPageSchema,
  concreteProductSummarySchema,
  macroProfileSchema,
  categoryDtoSchema,
  packageTypeDtoSchema,
  productCompositionDetailSchema,
  productCompositionDtoSchema,
  unitTypeDtoSchema,
} from "@product-repos/contracts";
import { buildCategoryPath } from "../domain/category-tree";
import type { Brand, Category, ConcreteProductDetail, ConcreteProductPage, CreateConcreteProduct, CreateProductComposition, MacroProfile, PackageType, ProductComposition, UnitType, UpdateConcreteProduct, UpdateProductComposition } from "../domain/product-catalog";
import { sendBackendRequest, type BackendRequestContext } from "../../../core/data/backend-api.server";
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

type ApiError = {
  code?: string;
  message?: string;
  fields?: Record<string, string>;
};

/** Fetch catalog categories with the incoming session. */
async function getCategories(context: BackendRequestContext): Promise<Category[]> {
  return categoryListSchema.parse(await getJson("/categories", context)).map(mapCategory);
}

/** Fetch brand suggestions with the incoming session. */
async function getBrands(query: string, context: BackendRequestContext): Promise<Brand[]> {
  const params = new URLSearchParams({ query });
  return brandListSchema.parse(await getJson(`/brands?${params.toString()}`, context)).map(mapBrand);
}

/** Fetch one brand with the incoming session. */
async function getBrand(brandId: string, context: BackendRequestContext): Promise<Brand> {
  return mapBrand(brandDtoSchema.parse(await getJson(`/brands/${brandId}`, context)));
}

/** Fetch unit types with the incoming session. */
async function getUnitTypes(context: BackendRequestContext): Promise<UnitType[]> {
  return unitTypeListSchema.parse(await getJson("/unit-types", context)).map(mapUnitType);
}

/** Fetch package types with the incoming session. */
async function getPackageTypes(context: BackendRequestContext): Promise<PackageType[]> {
  return packageTypeListSchema.parse(await getJson("/package-types", context)).map(mapPackageType);
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
  return mapConcreteProductPage(concreteProductPageSchema.parse(await getJson(`/products${query ? `?${query}` : ""}`, context)));
}

/** Search compositions by shared name and brand and enrich them for the admin UI. */
async function searchProductCompositions(query: string, context: BackendRequestContext): Promise<ProductComposition[]> {
  const params = new URLSearchParams({ query });
  const [compositions, categories, products] = await Promise.all([
    getJson(`/product-compositions/search?${params.toString()}`, context).then((value) => backendCompositionListSchema.parse(value)),
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
  const raw = backendConcreteProductDetailSchema.parse(await getJson(`/products/${productId}`, context));
  const compositions = await searchProductCompositions(raw.compositionName, context);
  const composition = compositions.find((item) => item.id === raw.productCompositionId);
  if (!composition) throw new Error("Concrete product response contains no matching composition");
  return mapConcreteProductDetail(concreteProductDetailSchema.parse({ ...raw, composition }));
}

/** Create a category with the incoming session. */
async function createCategory(input: { name: string; parentId: number | null }, context: BackendRequestContext): Promise<Category> {
  return mapCategory(categoryDtoSchema.parse(await postJson("/categories", input, context)));
}

/** Update a category with the incoming session. */
async function updateCategory(input: { id: number; name: string }, context: BackendRequestContext): Promise<Category> {
  return mapCategory(categoryDtoSchema.parse(await patchJson(`/categories/${input.id}`, { name: input.name }, context)));
}

/** Delete a category with the incoming session. */
async function deleteCategory(id: number, context: BackendRequestContext): Promise<void> {
  await deleteJson(`/categories/${id}`, context);
}

/** Create or resolve a brand with the incoming session. */
async function createBrand(input: { name: string }, context: BackendRequestContext): Promise<Brand> {
  return mapBrand(brandDtoSchema.parse(await postJson("/brands", input, context)));
}

/** Create a product composition with the incoming session. */
async function createProductComposition(input: CreateProductComposition, context: BackendRequestContext): Promise<ProductComposition> {
  const created = productCompositionDetailSchema.parse(await postJson("/product-compositions", input, context));
  const matches = await searchProductCompositions(created.name, context);
  const composition = matches.find((item) => item.id === created.id);
  if (!composition) throw new Error("Created product composition could not be read back");
  return composition;
}

/** Create one concrete product with the incoming session. */
async function createConcreteProduct(input: CreateConcreteProduct, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  const created = backendConcreteProductDetailSchema.parse(await postJson("/products", input, context));
  return getConcreteProduct(created.productId, context);
}

/** Update shared composition identity fields. */
async function updateProductComposition(compositionId: string, input: UpdateProductComposition, context: BackendRequestContext): Promise<ProductComposition> {
  const updated = productCompositionDetailSchema.parse(await putJson(`/product-compositions/${compositionId}`, input, context));
  const matches = await searchProductCompositions(updated.name, context);
  const composition = matches.find((item) => item.id === updated.id);
  if (!composition) throw new Error("Updated product composition could not be read back");
  return composition;
}

/** Update a shared composition macro profile. */
async function updateProductCompositionMacroProfile(compositionId: string, input: MacroProfile, context: BackendRequestContext): Promise<MacroProfile> {
  return macroProfileSchema.parse(await putJson(`/product-compositions/${compositionId}/macro-profile`, input, context));
}

/** Update fields owned by one concrete product. */
async function updateConcreteProduct(productId: string, input: UpdateConcreteProduct, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  await putJson(`/products/${productId}`, { ...input, productCompositionId: await getCompositionId(productId, context) }, context);
  return getConcreteProduct(productId, context);
}

/** Archive one concrete product. */
async function archiveConcreteProduct(productId: string, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  await postJson(`/products/${productId}/archive`, {}, context);
  return getConcreteProduct(productId, context);
}

/** Restore one concrete product. */
async function restoreConcreteProduct(productId: string, context: BackendRequestContext): Promise<ConcreteProductDetail> {
  await postJson(`/products/${productId}/restore`, {}, context);
  return getConcreteProduct(productId, context);
}

/** Resolve the composition identifier required by the backend's full product PUT contract. */
async function getCompositionId(productId: string, context: BackendRequestContext): Promise<string> {
  const raw = backendConcreteProductDetailSchema.parse(await getJson(`/products/${productId}`, context));
  return raw.productCompositionId;
}

/** Determine whether an API failure is a not-found response. */
function isNotFound(error: unknown): boolean {
  return error instanceof BackendApiError && error.status === 404;
}

/** Perform an authenticated backend GET context. */
async function getJson(path: string, context: BackendRequestContext): Promise<unknown> {
  return readJsonResponse(await sendBackendRequest(path, context));
}

/** Perform an authenticated backend POST context. */
async function postJson(path: string, body: unknown, context: BackendRequestContext): Promise<unknown> {
  return readJsonResponse(await sendBackendRequest(path, context, { method: "POST", body }));
}

/** Perform an authenticated backend PATCH context. */
async function patchJson(path: string, body: unknown, context: BackendRequestContext): Promise<unknown> {
  return readJsonResponse(await sendBackendRequest(path, context, { method: "PATCH", body }));
}

/** Perform an authenticated backend PUT context. */
async function putJson(path: string, body: unknown, context: BackendRequestContext): Promise<unknown> {
  return readJsonResponse(await sendBackendRequest(path, context, { method: "PUT", body }));
}

/**
 * Perform an authenticated backend DELETE context.
 *
 * @param path - Backend API path.
 * @param context - Incoming context carrying session headers.
 * @param body - Optional JSON context body.
 * @returns A promise that resolves after a successful response.
 */
async function deleteJson(path: string, context: BackendRequestContext, body?: unknown): Promise<void> {
  const response = await sendBackendRequest(path, context, { method: "DELETE", body });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
}

/**
 * Check a backend response and return its untrusted JSON body.
 *
 * @param response - Raw backend response.
 * @returns Untrusted JSON data for endpoint-specific contract parsing.
 */
async function readJsonResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  const value: unknown = await response.json();
  return value;
}

/**
 * Parse a backend error response into its safe protocol projection.
 *
 * @param response - Failed backend response.
 * @returns Sanitized error fields safe for application error mapping.
 */
async function readApiError(response: Response): Promise<ApiError> {
  const value: unknown = await response.json().catch(() => null);
  if (typeof value !== "object" || value === null) return { message: response.statusText };

  const code = readOptionalString(value, "code");
  const message = readOptionalString(value, "message");
  const fields = readStringRecord(Reflect.get(value, "fields"));
  return {
    ...(code === undefined ? {} : { code }),
    ...(message === undefined ? {} : { message }),
    ...(fields === undefined ? {} : { fields }),
  };
}

/**
 * Read an optional string field from an untrusted protocol object.
 *
 * @param input - Untrusted protocol object.
 * @param field - Field to inspect.
 * @returns String value or undefined.
 */
function readOptionalString(input: object, field: string): string | undefined {
  const value: unknown = Reflect.get(input, field);
  return typeof value === "string" ? value : undefined;
}

/**
 * Parse an untrusted string record.
 *
 * @param input - Potential record value.
 * @returns String-only record or undefined when malformed.
 */
function readStringRecord(input: unknown): Record<string, string> | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined;
  const entries = Object.entries(input);
  if (!entries.every((entry) => typeof entry[1] === "string")) return undefined;
  return Object.fromEntries(entries) as Record<string, string>;
}

export class BackendApiError extends Error {
  readonly kind = "ProductApiFailure";
  readonly code: string | undefined;
  readonly fields: Record<string, string> | undefined;

  constructor(readonly status: number, readonly body: ApiError) {
    super(body.message ?? `Backend request failed with status ${status}`);
    this.code = body.code;
    this.fields = body.fields;
  }
}

export type { Brand, Category, ConcreteProductDetail, PackageType, ProductComposition, UnitType };
export { archiveConcreteProduct, createBrand, createCategory, createConcreteProduct, createProductComposition, deleteCategory, getBrand, getBrands, getCategories, getConcreteProduct, getConcreteProducts, getPackageTypes, getUnitTypes, isNotFound, restoreConcreteProduct, searchProductCompositions, updateCategory, updateConcreteProduct, updateProductComposition, updateProductCompositionMacroProfile };
