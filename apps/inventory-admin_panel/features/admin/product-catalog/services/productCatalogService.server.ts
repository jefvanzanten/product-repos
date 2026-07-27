import { brandDtoSchema, catalogBrowseResponseSchema, catalogSearchResponseSchema, categoryDtoSchema, createProductPackageRequestSchema, createProductRequestSchema, packageTypeDtoSchema, productCreatedDtoSchema, productDetailDtoSchema, productPackageDetailDtoSchema, unitTypeDtoSchema, updateProductPackageRequestSchema, updateProductRequestSchema } from "@product-repos/contracts";
import type { BrandDto, CatalogBrowseResponse, CatalogProductRow, CatalogSearchResponse, CategoryDto, CreateProductPackageRequest, CreateProductRequest, PackageTypeDto, ProductCreatedDto, ProductDetailDto, ProductPackageDetailDto, UnitTypeDto, UpdateProductPackageRequest, UpdateProductRequest } from "@product-repos/contracts";

const apiBaseUrl = process.env.API_URL ?? "http://localhost:3000";
const apiUrl = apiBaseUrl.replace(/\/$/, "");

type ResponseSchema<T> = {
  readonly parse: (input: unknown) => T;
};

type ApiError = {
  code?: string;
  message?: string;
  fields?: Record<string, string>;
  existingProductId?: string;
};

type FormErrors = Record<string, string>;
type ProductPackageDetailResult =
  | { readonly state: "found"; readonly productPackage: ProductPackageDetailDto }
  | { readonly state: "productNotFound" }
  | { readonly state: "packageNotFound" };

async function getCategories(): Promise<CategoryDto[]> {
  return getJson("/categories", categoryDtoSchema.array());
}

async function getBrands(query: string): Promise<BrandDto[]> {
  const params = new URLSearchParams({ query });
  return getJson(`/brands?${params.toString()}`, brandDtoSchema.array());
}

async function getBrandById(brandId: string): Promise<BrandDto | null> {
  return getJsonOrNull(`/brands/${encodeURIComponent(brandId)}`, brandDtoSchema, "BRAND_NOT_FOUND");
}

async function getUnitTypes(): Promise<UnitTypeDto[]> {
  return getJson("/unit-types", unitTypeDtoSchema.array());
}

async function getPackageTypes(): Promise<PackageTypeDto[]> {
  return getJson("/package-types", packageTypeDtoSchema.array());
}

async function createCategory(input: { name: string; parentId: number | null }): Promise<CategoryDto> {
  return postJson("/categories", input, categoryDtoSchema);
}

async function deleteCategory(id: number): Promise<void> {
  await deleteJson(`/categories/${id}`);
}

async function createBrand(input: { name: string }): Promise<BrandDto> {
  return postJson("/brands", input, brandDtoSchema);
}

async function createProduct(input: CreateProductRequest): Promise<ProductCreatedDto> {
  return postJson("/products", createProductRequestSchema.parse(input), productCreatedDtoSchema);
}

async function updateProduct(productId: string, input: UpdateProductRequest): Promise<ProductDetailDto> {
  return patchJson(`/products/${encodeURIComponent(productId)}`, updateProductRequestSchema.parse(input), productDetailDtoSchema);
}

async function getProductDetail(productId: string): Promise<ProductDetailDto | null> {
  return getJsonOrNull(`/products/${encodeURIComponent(productId)}`, productDetailDtoSchema, "PRODUCT_NOT_FOUND");
}

async function createProductPackage(productId: string, input: CreateProductPackageRequest): Promise<ProductPackageDetailDto> {
  return postJson(`/products/${encodeURIComponent(productId)}/packages`, createProductPackageRequestSchema.parse(input), productPackageDetailDtoSchema);
}

async function getProductPackageDetail(productId: string, packageId: string): Promise<ProductPackageDetailResult> {
  const response = await fetch(`${apiUrl}/products/${encodeURIComponent(productId)}/packages/${encodeURIComponent(packageId)}`);
  if (response.ok) return { state: "found", productPackage: productPackageDetailDtoSchema.parse(await response.json()) };
  const apiError = await readApiError(response);
  if (response.status === 404 && apiError.code === "PRODUCT_NOT_FOUND") return { state: "productNotFound" };
  if (response.status === 404 && apiError.code === "PRODUCT_PACKAGE_NOT_FOUND") return { state: "packageNotFound" };
  throw new BackendApiError(response.status, apiError);
}

async function updateProductPackage(productId: string, packageId: string, input: UpdateProductPackageRequest): Promise<ProductPackageDetailDto> {
  return patchJson(`/products/${encodeURIComponent(productId)}/packages/${encodeURIComponent(packageId)}`, updateProductPackageRequestSchema.parse(input), productPackageDetailDtoSchema);
}

async function searchCatalog(query: string, limits: { readonly productLimit?: number; readonly brandLimit?: number; readonly categoryLimit?: number } = {}): Promise<CatalogSearchResponse> {
  const params = new URLSearchParams({ query });
  if (limits.productLimit !== undefined) params.set("productLimit", String(limits.productLimit));
  if (limits.brandLimit !== undefined) params.set("brandLimit", String(limits.brandLimit));
  if (limits.categoryLimit !== undefined) params.set("categoryLimit", String(limits.categoryLimit));
  return getJson(`/products/search?${params.toString()}`, catalogSearchResponseSchema);
}

async function browseCatalog(input: { readonly categoryId?: number; readonly brandId?: string; readonly limit?: number } = {}): Promise<CatalogBrowseResponse> {
  const params = new URLSearchParams();
  if (input.categoryId !== undefined) params.set("categoryId", String(input.categoryId));
  if (input.brandId !== undefined) params.set("brandId", input.brandId);
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  const query = params.toString();
  try {
    return await getJson(query ? `/products?${query}` : "/products", catalogBrowseResponseSchema);
  } catch (error) {
    if (error instanceof BackendApiError && error.body.code === "REFERENCE_NOT_FOUND") {
      if (input.brandId !== undefined) return { state: "invalidContext", contextType: "brand", contextId: input.brandId };
      if (input.categoryId !== undefined) return { state: "invalidContext", contextType: "category", contextId: String(input.categoryId) };
    }
    throw error;
  }
}

function mapApiError(error: unknown): FormErrors {
  if (!(error instanceof BackendApiError)) return { form: "Opslaan mislukt. Probeer opnieuw." };
  const body = error.body;
  if (body.fields) return mapApiFieldErrors(body.fields);
  if (body.code === "CATEGORY_ALREADY_EXISTS") return { categoryName: "Deze categorie bestaat al op dit niveau." };
  if (body.code === "CATEGORY_HAS_CHILDREN") return { form: "Verwijder eerst de subcategorieën onder deze categorie." };
  if (body.code === "CATEGORY_HAS_PRODUCTS") return { form: "Deze categorie is nog gekoppeld aan producten." };
  if (body.code === "PRODUCT_ALREADY_EXISTS") return { productName: "Dit product bestaat al." };
  if (body.code === "PRODUCT_PACKAGE_ALREADY_EXISTS") return { form: "Deze verpakking bestaat al voor dit product." };
  if (body.code === "PRODUCT_NOT_FOUND") return { form: "Dit product bestaat niet meer." };
  if (body.code === "PRODUCT_PACKAGE_NOT_FOUND") return { form: "Deze verpakking bestaat niet meer." };
  if (body.code === "REFERENCE_NOT_FOUND") return { form: "Een gekozen categorie, merk of verpakking bestaat niet meer. Kies opnieuw." };
  if (body.code === "VALIDATION_ERROR") return { form: "Controleer de ingevulde velden." };
  return { form: body.message ?? `Aanvraag mislukt met status ${error.status}.` };
}

function mapApiFieldErrors(fields: Record<string, string>): FormErrors {
  const formErrors: FormErrors = {};
  for (const [field, message] of Object.entries(fields)) {
    const targetField = field === "name" ? "productName" : field;
    formErrors[targetField] = mapApiFieldError(field, message);
  }
  return formErrors;
}

function mapApiFieldError(field: string, message: string): string {
  if (field === "name") return "Vul een productnaam in.";
  if (field === "categoryId") return "Kies een categorie.";
  if (field === "brandId") return "Kies een bestaand merk of maak het veld leeg.";
  if (field === "packageTypeId") return "Kies een verpakkingstype.";
  if (field === "amount") return "Vul een positieve inhoud in.";
  if (field === "unitTypeId") return "Kies een eenheid.";
  if (field === "unitsPerPackage") return "Vul een positief geheel aantal in.";
  if (field === "categoryName") return "Vul een categorienaam in.";
  return message || "Controleer dit veld.";
}

async function getJson<T>(path: string, schema: ResponseSchema<T>): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`);
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  return schema.parse(await response.json());
}

async function getJsonOrNull<T>(path: string, schema: ResponseSchema<T>, notFoundCode: string): Promise<T | null> {
  const response = await fetch(`${apiUrl}${path}`);
  if (response.ok) return schema.parse(await response.json());
  const apiError = await readApiError(response);
  if (response.status === 404 && apiError.code === notFoundCode) return null;
  throw new BackendApiError(response.status, apiError);
}

async function postJson<T>(path: string, body: unknown, schema: ResponseSchema<T>): Promise<T> {
  return writeJson("POST", path, body, schema);
}

async function patchJson<T>(path: string, body: unknown, schema: ResponseSchema<T>): Promise<T> {
  return writeJson("PATCH", path, body, schema);
}

async function writeJson<T>(method: "PATCH" | "POST", path: string, body: unknown, schema: ResponseSchema<T>): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  return schema.parse(await response.json());
}

async function deleteJson(path: string): Promise<void> {
  const response = await fetch(`${apiUrl}${path}`, { method: "DELETE" });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
}

async function readApiError(response: Response): Promise<ApiError> {
  return response.json().then((value) => value as ApiError).catch(() => ({ message: response.statusText }));
}

class BackendApiError extends Error {
  constructor(readonly status: number, readonly body: ApiError) {
    super(body.message ?? `Backend request failed with status ${status}`);
  }
}

export type { BrandDto, CatalogBrowseResponse, CatalogProductRow, CatalogSearchResponse, CategoryDto, FormErrors, PackageTypeDto, ProductCreatedDto, ProductDetailDto, ProductPackageDetailDto, ProductPackageDetailResult, UnitTypeDto };
export { browseCatalog, createBrand, createCategory, createProduct, createProductPackage, deleteCategory, getBrandById, getBrands, getCategories, getPackageTypes, getProductDetail, getProductPackageDetail, getUnitTypes, mapApiError, searchCatalog, updateProduct, updateProductPackage };
