const apiBaseUrl = process.env.API_URL ?? "http://localhost:3000";
const apiUrl = apiBaseUrl.replace(/\/$/, "");

type CategoryDto = { id: number; name: string; parentId: number | null };
type BrandDto = { id: string; name: string };
type UnitTypeDto = { id: number; name: string };
type PackageTypeDto = { id: number; name: string };
type ProductCreatedDto = {
  id: string;
  name: string;
  category: CategoryDto;
  brand: BrandDto | null;
  package: {
    id: number;
    packageType: PackageTypeDto;
    unitContent: { id: number; amount: string; unitType: UnitTypeDto };
    unitsPerPackage: number;
  };
};

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

async function getUnitTypes(): Promise<UnitTypeDto[]> {
  return getJson<UnitTypeDto[]>("/unit-types");
}

async function getPackageTypes(): Promise<PackageTypeDto[]> {
  return getJson<PackageTypeDto[]>("/package-types");
}

async function createCategory(input: { name: string; parentId: number | null }): Promise<CategoryDto> {
  return postJson<CategoryDto>("/categories", input);
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
  package: { packageTypeId: number; amount: string; unitTypeId: number; unitsPerPackage: number };
}): Promise<ProductCreatedDto> {
  return postJson<ProductCreatedDto>("/products", input);
}

function mapApiError(error: unknown): FormErrors {
  if (!(error instanceof BackendApiError)) return { form: "Opslaan mislukt. Probeer opnieuw." };
  const body = error.body;
  if (body.fields) return body.fields;
  if (body.code === "CATEGORY_ALREADY_EXISTS") return { categoryName: "Deze categorie bestaat al op dit niveau." };
  if (body.code === "CATEGORY_HAS_CHILDREN") return { form: "Verwijder eerst de subcategorieën onder deze categorie." };
  if (body.code === "CATEGORY_HAS_PRODUCTS") return { form: "Deze categorie is nog gekoppeld aan producten." };
  if (body.code === "PRODUCT_ALREADY_EXISTS") return { productName: "Dit product bestaat al." };
  if (body.code === "REFERENCE_NOT_FOUND") return { form: "Een gekozen categorie, merk of verpakking bestaat niet meer. Kies opnieuw." };
  if (body.code === "VALIDATION_ERROR") return { form: body.message ?? "Controleer de ingevulde velden." };
  return { form: body.message ?? `Aanvraag mislukt met status ${error.status}.` };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`);
  if (!response.ok) throw new Error(`${path} failed with status ${response.status}`);
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

export type { BrandDto, CategoryDto, FormErrors, PackageTypeDto, ProductCreatedDto, UnitTypeDto };
export { createBrand, createCategory, createProduct, deleteCategory, getBrands, getCategories, getPackageTypes, getUnitTypes, mapApiError };
