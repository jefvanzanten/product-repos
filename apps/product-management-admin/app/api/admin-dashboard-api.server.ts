import {
  brandDtoSchema,
  catalogBrowseResponseSchema,
  catalogSearchResponseSchema,
  categoryDtoSchema,
  packageTypeDtoSchema,
  productCreatedDtoSchema,
  productDetailDtoSchema,
  productPackageDtoSchema,
  unitTypeDtoSchema,
} from "@product-repos/contracts";
import type { BrandDto, CatalogBrowseResponse, CatalogSearchResponse, CategoryDto, CreateProductRequest, PackageTypeDto, ProductCreatedDto, ProductDetailDto, ProductPackageDto, ProductPackageRequest, UnitTypeDto, UpdateProductRequest } from "@product-repos/contracts";
import { sendBackendRequest } from "./backend-api.server";

const brandListSchema = brandDtoSchema.array();
const categoryListSchema = categoryDtoSchema.array();
const packageTypeListSchema = packageTypeDtoSchema.array();
const productPackageImageResponseSchema = productPackageDtoSchema.pick({ imageUrl: true });
const unitTypeListSchema = unitTypeDtoSchema.array();

type ProductPackageWithProductId = ProductPackageDto & { readonly productId: string };

type ApiError = {
  code?: string;
  message?: string;
  fields?: Record<string, string>;
};

type FormErrors = Record<string, string>;

/** Fetch catalog categories with the incoming session. */
async function getCategories(request: Request): Promise<CategoryDto[]> {
  return categoryListSchema.parse(await getJson("/categories", request));
}

/** Fetch brand suggestions with the incoming session. */
async function getBrands(query: string, request: Request): Promise<BrandDto[]> {
  const params = new URLSearchParams({ query });
  return brandListSchema.parse(await getJson(`/brands?${params.toString()}`, request));
}

/** Fetch one brand with the incoming session. */
async function getBrand(brandId: string, request: Request): Promise<BrandDto> {
  return brandDtoSchema.parse(await getJson(`/brands/${brandId}`, request));
}

/** Fetch unit types with the incoming session. */
async function getUnitTypes(request: Request): Promise<UnitTypeDto[]> {
  return unitTypeListSchema.parse(await getJson("/unit-types", request));
}

/** Fetch package types with the incoming session. */
async function getPackageTypes(request: Request): Promise<PackageTypeDto[]> {
  return packageTypeListSchema.parse(await getJson("/package-types", request));
}

/** Browse the catalog with the incoming session. */
async function browseCatalog(input: { readonly categoryId?: string | null; readonly brandId?: string | null; readonly limit?: number }, request: Request): Promise<CatalogBrowseResponse> {
  const params = new URLSearchParams();
  if (input.categoryId) params.set("categoryId", input.categoryId);
  if (input.brandId) params.set("brandId", input.brandId);
  if (input.limit) params.set("limit", String(input.limit));
  const query = params.toString();
  return catalogBrowseResponseSchema.parse(await getJson(`/products${query ? `?${query}` : ""}`, request));
}

/** Search the catalog with the incoming session. */
async function searchCatalog(query: string, request: Request): Promise<CatalogSearchResponse> {
  const params = new URLSearchParams({ query });
  return catalogSearchResponseSchema.parse(await getJson(`/products/search?${params.toString()}`, request));
}

/** Fetch product detail with the incoming session. */
async function getProduct(productId: string, request: Request): Promise<ProductDetailDto> {
  return productDetailDtoSchema.parse(await getJson(`/products/${productId}`, request));
}

/** Fetch package detail with the incoming session. */
async function getProductPackage(productId: string, packageId: string, request: Request): Promise<ProductPackageWithProductId> {
  return parseProductPackageWithProductId(await getJson(`/products/${productId}/packages/${packageId}`, request));
}

/** Create a category with the incoming session. */
async function createCategory(input: { name: string; parentId: number | null }, request: Request): Promise<CategoryDto> {
  return categoryDtoSchema.parse(await postJson("/categories", input, request));
}

/** Update a category with the incoming session. */
async function updateCategory(input: { id: number; name: string }, request: Request): Promise<CategoryDto> {
  return categoryDtoSchema.parse(await patchJson(`/categories/${input.id}`, { name: input.name }, request));
}

/** Delete a category with the incoming session. */
async function deleteCategory(id: number, request: Request): Promise<void> {
  await deleteJson(`/categories/${id}`, request);
}

/** Create or resolve a brand with the incoming session. */
async function createBrand(input: { name: string }, request: Request): Promise<BrandDto> {
  return brandDtoSchema.parse(await postJson("/brands", input, request));
}

/** Create a product with the incoming session. */
async function createProduct(input: CreateProductRequest, request: Request): Promise<ProductCreatedDto> {
  return productCreatedDtoSchema.parse(await postJson("/products", input, request));
}

/** Update a product with the incoming session. */
async function updateProduct(productId: string, input: UpdateProductRequest, request: Request): Promise<ProductDetailDto> {
  return productDetailDtoSchema.parse(await patchJson(`/products/${productId}`, input, request));
}

/** Add a product package with the incoming session. */
async function addProductPackage(productId: string, input: ProductPackageRequest, request: Request): Promise<ProductPackageWithProductId> {
  return parseProductPackageWithProductId(await postJson(`/products/${productId}/packages`, input, request));
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
  const result = productPackageImageResponseSchema.parse(
    await postFormData(`/products/${productId}/packages/${packageId}/image`, form, request),
  );
  if (result.imageUrl === null) throw new Error("Product package image response contains no image URL");
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
  return parseProductPackageWithProductId(await patchJson(`/products/${productId}/packages/${packageId}`, input, request));
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

/** Perform an authenticated backend GET request. */
async function getJson(path: string, request: Request): Promise<unknown> {
  return readJsonResponse(await sendBackendRequest(path, request));
}

/** Perform an authenticated backend POST request. */
async function postJson(path: string, body: unknown, request: Request): Promise<unknown> {
  return readJsonResponse(await sendBackendRequest(path, request, { method: "POST", body }));
}

/**
 * Perform an authenticated multipart POST request.
 *
 * @param path - Backend API path.
 * @param body - Multipart request body.
 * @param request - Incoming request carrying session headers.
 * @returns Untrusted backend response data for contract parsing.
 */
async function postFormData(path: string, body: FormData, request: Request): Promise<unknown> {
  return readJsonResponse(await sendBackendRequest(path, request, { method: "POST", body }));
}

/** Perform an authenticated backend PATCH request. */
async function patchJson(path: string, body: unknown, request: Request): Promise<unknown> {
  return readJsonResponse(await sendBackendRequest(path, request, { method: "PATCH", body }));
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
  const response = await sendBackendRequest(path, request, { method: "DELETE", body });
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

class BackendApiError extends Error {
  constructor(readonly status: number, readonly body: ApiError) {
    super(body.message ?? `Backend request failed with status ${status}`);
  }
}

export type { BrandDto, CategoryDto, FormErrors, PackageTypeDto, ProductCreatedDto, ProductDetailDto, ProductPackageDto, ProductPackageRequest, ProductPackageWithProductId, UnitTypeDto };
export { addProductPackage, browseCatalog, cleanupProductPackageImage, createBrand, createCategory, createProduct, deleteCategory, getBrand, getBrands, getCategories, getPackageTypes, getProduct, getProductPackage, getUnitTypes, isNotFound, mapApiError, searchCatalog, updateCategory, updateProduct, updateProductPackage, uploadProductPackageImage };
