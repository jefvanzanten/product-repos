import type { BrandDto, CatalogBrowseResponse, CatalogSearchResponse, CategoryDto, PackageTypeDto, ProductCreatedDto, ProductDetailDto, ProductPackageDto, ProductPackageRequest, UnitTypeDto, UpdateProductRequest } from "@product-repos/contracts";

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

async function getCategories(): Promise<CategoryDto[]> {
  return getJson<CategoryDto[]>("/categories");
}

async function getBrands(query: string): Promise<BrandDto[]> {
  const params = new URLSearchParams({ query });
  return getJson<BrandDto[]>(`/brands?${params.toString()}`);
}

async function getBrand(brandId: string): Promise<BrandDto> {
  return getJson<BrandDto>(`/brands/${brandId}`);
}

async function getUnitTypes(): Promise<UnitTypeDto[]> {
  return getJson<UnitTypeDto[]>("/unit-types");
}

async function getPackageTypes(): Promise<PackageTypeDto[]> {
  return getJson<PackageTypeDto[]>("/package-types");
}

async function browseCatalog(input: { readonly categoryId?: string | null; readonly brandId?: string | null; readonly limit?: number }): Promise<CatalogBrowseResponse> {
  const params = new URLSearchParams();
  if (input.categoryId) params.set("categoryId", input.categoryId);
  if (input.brandId) params.set("brandId", input.brandId);
  if (input.limit) params.set("limit", String(input.limit));
  const query = params.toString();
  return getJson<CatalogBrowseResponse>(`/products${query ? `?${query}` : ""}`);
}

async function searchCatalog(query: string): Promise<CatalogSearchResponse> {
  const params = new URLSearchParams({ query });
  return getJson<CatalogSearchResponse>(`/products/search?${params.toString()}`);
}

async function getProduct(productId: string): Promise<ProductDetailDto> {
  return getJson<ProductDetailDto>(`/products/${productId}`);
}

async function getProductPackage(productId: string, packageId: string): Promise<ProductPackageWithProductId> {
  return getJson<ProductPackageWithProductId>(`/products/${productId}/packages/${packageId}`);
}

async function createCategory(input: { name: string; parentId: number | null }): Promise<CategoryDto> {
  return postJson<CategoryDto>("/categories", input);
}

async function updateCategory(input: { id: number; name: string }): Promise<CategoryDto> {
  return patchJson<CategoryDto>(`/categories/${input.id}`, { name: input.name });
}

async function deleteCategory(id: number): Promise<void> {
  await deleteJson(`/categories/${id}`);
}

async function createBrand(input: { name: string }): Promise<BrandDto> {
  return postJson<BrandDto>("/brands", input);
}

async function createProduct(input: {
  name: string;
  categoryId: number;
  brandId?: string | null;
  package: ProductPackageRequest;
}): Promise<ProductCreatedDto> {
  return postJson<ProductCreatedDto>("/products", input);
}

async function updateProduct(productId: string, input: UpdateProductRequest): Promise<ProductDetailDto> {
  return patchJson<ProductDetailDto>(`/products/${productId}`, input);
}

async function addProductPackage(productId: string, input: ProductPackageRequest): Promise<ProductPackageWithProductId> {
  return postJson<ProductPackageWithProductId>(`/products/${productId}/packages`, input);
}

async function updateProductPackage(productId: string, packageId: string, input: ProductPackageRequest): Promise<ProductPackageWithProductId> {
  return patchJson<ProductPackageWithProductId>(`/products/${productId}/packages/${packageId}`, input);
}

function mapApiError(error: unknown): FormErrors {
  if (!(error instanceof BackendApiError)) return { form: "Opslaan mislukt. Probeer opnieuw." };
  const body = error.body;
  if (body.fields) return body.fields;
  if (body.code === "CATEGORY_ALREADY_EXISTS") return { categoryName: "Deze categorie bestaat al op dit niveau." };
  if (body.code === "CATEGORY_HAS_CHILDREN") return { form: "Verwijder eerst de subcategorieën onder deze categorie." };
  if (body.code === "CATEGORY_HAS_PRODUCTS") return { form: "Deze categorie is nog gekoppeld aan producten." };
  if (body.code === "PRODUCT_ALREADY_EXISTS") return { productName: "Dit product bestaat al." };
  if (body.code === "PRODUCT_PACKAGE_ALREADY_EXISTS") return { form: "Deze verpakking bestaat al voor dit product." };
  if (body.code === "PRODUCT_NOT_FOUND") return { form: "Product niet gevonden." };
  if (body.code === "PRODUCT_PACKAGE_NOT_FOUND") return { form: "Verpakking niet gevonden." };
  if (body.code === "REFERENCE_NOT_FOUND") return { form: "Een gekozen categorie, merk of verpakking bestaat niet meer. Kies opnieuw." };
  if (body.code === "VALIDATION_ERROR") return { form: body.message ?? "Controleer de ingevulde velden." };
  return { form: body.message ?? `Aanvraag mislukt met status ${error.status}.` };
}

function isNotFound(error: unknown): boolean {
  return error instanceof BackendApiError && error.status === 404;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`);
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  return response.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  return response.json() as Promise<T>;
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new BackendApiError(response.status, await readApiError(response));
  return response.json() as Promise<T>;
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

export type { BrandDto, CategoryDto, FormErrors, PackageTypeDto, ProductCreatedDto, ProductDetailDto, ProductPackageDto, ProductPackageRequest, ProductPackageWithProductId, UnitTypeDto };
export { addProductPackage, browseCatalog, createBrand, createCategory, createProduct, deleteCategory, getBrand, getBrands, getCategories, getPackageTypes, getProduct, getProductPackage, getUnitTypes, isNotFound, mapApiError, searchCatalog, updateCategory, updateProduct, updateProductPackage };
