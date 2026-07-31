import type {
  BrandDto,
  CreateProductRequest,
  ProductCreatedDto,
  ProductDetailDto,
  UpdateProductRequest,
} from "@product-repos/contracts";
import { projectProductFormData } from "./product-form-data";

/** Dependencies required to submit the create-product form. */
export type CreateProductFormPort = {
  readonly createBrand: (input: { readonly name: string }) => Promise<BrandDto>;
  readonly createProduct: (input: CreateProductRequest) => Promise<ProductCreatedDto>;
};

/** Dependencies required to submit the edit-product form. */
export type UpdateProductFormPort = {
  readonly createBrand: (input: { readonly name: string }) => Promise<BrandDto>;
  readonly updateProduct: (productId: string, input: UpdateProductRequest) => Promise<ProductDetailDto>;
};

/** Successful or invalid product-form submission. */
export type ProductFormSubmission<T> =
  | { readonly ok: true; readonly product: T }
  | { readonly ok: false; readonly errors: Record<string, string> };

/** Parse and submit a product creation form through the supplied application port. */
export async function submitCreateProductForm(
  form: FormData,
  port: CreateProductFormPort,
): Promise<ProductFormSubmission<ProductCreatedDto>> {
  const projection = projectProductFormData(form);
  if (!projection.ok) return projection;

  const brand = await resolveBrand(form, port.createBrand);
  if (!brand.ok) return brand;

  const product = await port.createProduct({
    name: projection.value.name,
    categoryId: projection.value.categoryId,
    brandId: brand.brandId,
    consumptionType: projection.value.consumptionType,
    macroProfile: projection.value.macroProfile,
    package: readPackageForm(form),
  });
  return { ok: true, product };
}

/** Parse total package content and a separately enabled optional portion. */
function readPackageForm(form: FormData): CreateProductRequest["package"] {
  return {
    amount: normalizeDutchDecimal(form.get("amount")),
    packageTypeId: Number(form.get("packageTypeId")),
    unitTypeId: Number(form.get("unitTypeId")),
    portion: String(form.get("portionEnabled") ?? "") !== "on" ? null : {
      name: String(form.get("portionName") ?? "").trim(),
      amount: normalizeDutchDecimal(form.get("portionAmount")),
      unitTypeId: Number(form.get("portionUnitTypeId")),
      portionsPerPackage: parseOptionalPositiveInteger(form.get("portionsPerPackage")),
    },
  };
}

/** Normalize one Dutch decimal form value for the JSON protocol. */
function normalizeDutchDecimal(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().replace(",", ".");
}

/** Parse an optional integer without turning an empty field into zero. */
function parseOptionalPositiveInteger(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  return raw.length === 0 ? null : Number(raw);
}

/** Parse and submit a product edit form through the supplied application port. */
export async function submitUpdateProductForm(
  productId: string,
  form: FormData,
  port: UpdateProductFormPort,
): Promise<ProductFormSubmission<ProductDetailDto>> {
  const projection = projectProductFormData(form);
  if (!projection.ok) return projection;

  const brand = await resolveBrand(form, port.createBrand);
  if (!brand.ok) return brand;

  const product = await port.updateProduct(productId, {
    name: projection.value.name,
    categoryId: projection.value.categoryId,
    brandId: brand.brandId,
    consumptionType: projection.value.consumptionType,
    macroProfile: projection.value.macroProfile,
  });
  return { ok: true, product };
}

/** Resolve an existing or newly entered brand without exposing transport details to callers. */
async function resolveBrand(
  form: FormData,
  createBrand: CreateProductFormPort["createBrand"],
): Promise<{ readonly ok: true; readonly brandId: string | null } | { readonly ok: false; readonly errors: Record<string, string> }> {
  const brandQuery = String(form.get("brandQuery") ?? "").trim();
  const selectedBrandId = String(form.get("brandId") ?? "").trim() || null;
  const brandName = String(form.get("brandName") ?? "").trim();
  if (brandQuery && selectedBrandId === null && !brandName) {
    return { ok: false, errors: { brandName: "Kies een suggestie of maak het merk aan met de plus-optie." } };
  }
  if (!brandName) return { ok: true, brandId: selectedBrandId };
  const brand = await createBrand({ name: brandName });
  return { ok: true, brandId: brand.id };
}
