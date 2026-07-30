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
    package: {
      amount: String(form.get("amount") ?? "").trim().replace(",", "."),
      packageTypeId: Number(form.get("packageTypeId")),
      unitTypeId: Number(form.get("unitTypeId")),
      unitsPerPackage: Number(form.get("unitsPerPackage")),
    },
  });
  return { ok: true, product };
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
