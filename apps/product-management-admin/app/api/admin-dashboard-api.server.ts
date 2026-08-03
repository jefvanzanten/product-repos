import {
  catalogBrowseResponseSchema,
  catalogSearchResponseSchema,
  productCreatedDtoSchema,
  productDetailDtoSchema,
  productPackageDtoSchema,
} from "@product-repos/contracts";
import type { BrandDto, CatalogBrowseResponse, CatalogSearchResponse, CategoryDto, CreateProductRequest, PackageTypeDto, ProductCreatedDto, ProductDetailDto, ProductPackageDto, ProductPackageRequest, UnitTypeDto, UpdateProductRequest } from "@product-repos/contracts";

const apiBaseUrl = process.env.API_URL ?? "http://localhost:3000";
const apiUrl = apiBaseUrl.replace(/\/$/, "");

type ProductPackageWithProductId = ProductPackageDto & { readonly productId: string };

type ApiError = {
  code?: string;
  message?: string;
  fields?: Record<string, string>;
  existingProductId?: string;
};

type FormErrors = Record<string, string>;

/** Fetch catalog categories with the incoming session. */
async function getCategories(request: Request): Promise<CategoryDto[]> {
  return getJson<CategoryDto[]>("/categories", request);
}

/** Fetch brand suggestions with the incoming session. */
async function getBrands(query: string, request: Request): Promise<BrandDto[]> {
  const params = new URLSearchParams({ query });
  return getJson<BrandDto[]>(`/brands?${params.toString()}`, request);
}

/** Fetch one brand with the incoming session. */
async function getBrand(brandId: string, request: Request): Promise<BrandDto> {
  return getJson<BrandDto>(`/brands/${brandId}`, request);
}

/** Fetch unit types with the incoming session. */
async function getUnitTypes(request: Request): Promise<UnitTypeDto[]> {
  return getJson<UnitTypeDto[]>("/unit-types", request);
}

/** Fetch package types with the incoming session. */
async function getPackageTypes(request: Request): Promise<PackageTypeDto[]> {
  return getJson<PackageTypeDto[]>("/package-types", request);
}

/** Browse the catalog with the incoming session. */
async function browseCatalog(input: { readonly categoryId?: string | null; readonly brandId?: string | null; readonly limit?: number }, request: Request): Promise<CatalogBrowseResponse> {
  const params = new URLSearchParams();
  if (input.categoryId) params.set("categoryId", input.categoryId);
  if (input.brandId) params.set("brandId", input.brandId);
  if (input.limit) params.set("limit", String(input.limit));
  const query = params.toString();
  return catalogBrowseResponseSchema.parse(await getJson<unknown>(`/products${query ? `?${query}` : ""}`, request));
}

/** Search the catalog with the incoming session. */
async function searchCatalog(query: string, request: Request): Promise<CatalogSearchResponse> {
  const params = new URLSearchParams({ query });
  return catalogSearchResponseSchema.parse(await getJson<unknown>(`/products/search?${params.toString()}`, request));
}

/** Fetch product detail with the incoming session. */
async function getProduct(productId: string, request: Request): Promise<ProductDetailDto> {
  return productDetailDtoSchema.parse(await getJson<unknown>(`/products/${productId}`, request));
}

/** Fetch package detail with the incoming session. */
async function getProductPackage(productId: string, packageId: string, request: Request): Promise<ProductPackageWithProductId> {
  return parseProductPackageWithProductId(await getJson<unknown>(`/products/${productId}/packages/${packageId}`, request));
}

/** Create a category with the incoming session. */
async function createCategory(input: { name: string; parentId: number | null }, request: Request): Promise<CategoryDto> {
  return postJson<CategoryDto>("/categories", input, request);
}

/** Update a category with the incoming session. */
async function updateCategory(input: { id: number; name: string }, request: Request): Promise<CategoryDto> {
  return patchJson<CategoryDto>(`/categories/${input.id}`, { name: input.name }, request);
}

/** Delete a category with the incoming session. */
async function deleteCategory(id: number, request: Request): Promise<void> {
  await deleteJson(`/categories/${id}`, request);
}

/** Create or resolve a brand with the incoming session. */
async function createBrand(input: { name: string }, request: Request): Promise<BrandDto> {
  return postJson<BrandDto>("/brands", input, request);
}

/** Create a product with the incoming session. */
async function createProduct(input: CreateProductRequest, request: Request): Promise<ProductCreatedDto> {
  return productCreatedDtoSchema.parse(await postJson<unknown>("/products", input, request));
}

/** Update a product with the incoming session. */
async function updateProduct(productId: string, input: UpdateProductRequest, request: Request): Promise<ProductDetailDto> {
  return productDetailDtoSchema.parse(await patchJson<unknown>(`/products/${productId}`, input, request));
}

/** Add a product package with the incoming session. */
async function addProductPackage(productId: string, input: ProductPackageRequest, request: Request): Promise<ProductPackageWithProductId> {
  return parseProductPackageWithProductId(await postJson<unknown>(`/products/${productId}/packages`, input, request));
}

/**
 * Upload one validated image for a product package with the incoming session.
 *
 * @param productId - Owning product identifier.
 * @param packageId - Target package identifier.
 * @param image - Image selected by the administrator.
 * @param request - Incoming request carrying the administrator session.
 * @returns Immutable URL of the stored image.
 */
async function uploadProductPackageImage(productId: string, packageId: string, image: File, request: Request): Promise<string> {
  const form = new FormData();
  form.set("image", image);
  const result = await postFormData<{ readonly imageUrl: string }>(`/products/${productId}/packages/${packageId}/image`, form, request);
  return result.imageUrl;
}

/**
 * Remove an uploaded image that was not associated with its target package.
 *
 * @param productId - Owning product identifier.
 * @param packageId - Target package identifier.
 * @param imageUrl - URL returned by the preceding upload.
 * @param request - Incoming request carrying the administrator session.
 * @returns A promise that resolves after cleanup.
 */
async function cleanupProductPackageImage(productId: string, packageId: string, imageUrl: string, request: Request): Promise<void> {
  await deleteJson(`/products/${productId}/packages/${packageId}/image`, request, { imageUrl });
}

/** Update a product package with the incoming session. */
async function updateProductPackage(productId: string, packageId: string, input: ProductPackageRequest, request: Request): Promise<ProductPackageWithProductId> {
  return parseProductPackageWithProductId(await patchJson<unknown>(`/products/${productId}/packages/${packageId}`, input, request));
}

/** Parse a package response including its route-level product identifier. */
function parseProductPackageWithProductId(input: unknown): ProductPackageWithProductId {
  const productId = readUnknownField(input, "productId");
  if (typeof productId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    throw new Error("Product package response contains an invalid product identifier");
  }
  const value = productPackageDtoSchema.parse({
    id: readUnknownField(input, "id"),
    imageUrl: readUnknownField(input, "imageUrl"),
    packageType: readUnknownField(input, "packageType"),
    unitContent: readUnknownField(input, "unitContent"),
    portion: readUnknownField(input, "portion"),
    summary: readUnknownField(input, "summary"),
  });
  return { ...value, productId };
}

/** Read one field from an unknown protocol object without asserting its shape. */
function readUnknownField(input: unknown, field: string): unknown {
  return typeof input === "object" && input !== null ? Reflect.get(input, field) : undefined;
}

/** Map backend protocol errors to admin form errors. */
function mapApiError(error: unknown): FormErrors {
  if (!(error instanceof BackendApiError)) return { form: "Opslaan mislukt. Probeer opnieuw." };
  const body = error.body;
  if (body.fields) return body.fields;
  if (body.code === "CATEGORY_ALREADY_EXISTS") return { categoryName: "Deze categorie bestaat al op dit niveau." };
  if (body.code === "CATEGORY_HAS_CHILDREN") return { form: "Verwijder eerst de subcategorieën onder deze categorie." };
  if (body.code === "CATEGORY_HAS_PRODUCTS") return { form: "Deze categorie is nog gekoppeld aan producten." };
  if (body.code === "PRODUCT_ALREADY_EXISTS") return { productName: "Dit product bestaat al." };
  if (body.code === "PRODUCT_PACKAGE_ALREADY_EXISTS") return { form: "Deze verpakking bestaat al voor dit product." };
  if (body.code === "PRODUCT_MACRO_PROFILE_INVALID") return { macroProfile: body.message ?? "Controleer de voedingswaarden." };
  if (body.code === "UNIT_DIMENSION_INCOMPATIBLE") return { referenceBasis: "De referentiebasis past niet bij de verpakkingseenheid." };
  if (body.code === "PRODUCT_NOT_FOUND") return { form: "Product niet gevonden." };
  if (body.code === "PRODUCT_PACKAGE_NOT_FOUND") return { form: "Verpakking niet gevonden." };
  if (body.code === "REFERENCE_NOT_FOUND") return { form: "Een gekozen categorie, merk of verpakking bestaat niet meer. Kies opnieuw." };
  if (body.code === "VALIDATION_ERROR") return { form: body.message ?? "Controleer de ingevulde velden." };
  return { form: body.message ?? `Aanvraag mislukt met status ${error.status}.` };
}

/** Determine whether an API failure is a not-found response. */
function isNotFound(error: unknown): boolean {
  return error instanceof BackendApiError && error.status === 404;
}

/** Create backend request headers while preserving the incoming authenticated session. */
function createBackendHeaders(request: Request, includeJsonContentType = false): Headers {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  if (includeJsonContentType) headers.set("Content-Type", "application/json");
  return headers;
}

/** Perform an authenticated backend GET request. */
async function getJson<T>(path: string, request: Request): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: createBackendHeaders(request),
    signal: request.signal,
  });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  return response.json() as Promise<T>;
}

/** Perform an authenticated backend POST request. */
async function postJson<T>(path: string, body: unknown, request: Request): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: createBackendHeaders(request, true),
    body: JSON.stringify(body),
    signal: request.signal,
  });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  return response.json() as Promise<T>;
}

/**
 * Perform an authenticated multipart POST request.
 *
 * @param path - Backend API path.
 * @param body - Multipart request body.
 * @param request - Incoming request carrying session headers.
 * @returns Parsed backend response.
 */
async function postFormData<T>(path: string, body: FormData, request: Request): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: createBackendHeaders(request),
    body,
    signal: request.signal,
  });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  return response.json() as Promise<T>;
}

/** Perform an authenticated backend PATCH request. */
async function patchJson<T>(path: string, body: unknown, request: Request): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "PATCH",
    headers: createBackendHeaders(request, true),
    body: JSON.stringify(body),
    signal: request.signal,
  });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  return response.json() as Promise<T>;
}

/**
 * Perform an authenticated backend DELETE request.
 *
 * @param path - Backend API path.
 * @param request - Incoming request carrying session headers.
 * @param body - Optional JSON request body.
 * @returns A promise that resolves after a successful response.
 */
async function deleteJson(path: string, request: Request, body?: unknown): Promise<void> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "DELETE",
    headers: createBackendHeaders(request, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: request.signal,
  });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
}

/** Parse a backend error response into its safe protocol projection. */
async function readApiError(response: Response): Promise<ApiError> {
  return response.json().then((value) => value as ApiError).catch(() => ({ message: response.statusText }));
}

class BackendApiError extends Error {
  constructor(readonly status: number, readonly body: ApiError) {
    super(body.message ?? `Backend request failed with status ${status}`);
  }
}

export type { BrandDto, CategoryDto, FormErrors, PackageTypeDto, ProductCreatedDto, ProductDetailDto, ProductPackageDto, ProductPackageRequest, ProductPackageWithProductId, UnitTypeDto };
export { addProductPackage, browseCatalog, cleanupProductPackageImage, createBrand, createCategory, createProduct, deleteCategory, getBrand, getBrands, getCategories, getPackageTypes, getProduct, getProductPackage, getUnitTypes, isNotFound, mapApiError, searchCatalog, updateCategory, updateProduct, updateProductPackage, uploadProductPackageImage };
