import { InvalidCatalogForm, InvalidCatalogQuery } from "./models/product-catalog-result.model";
import type { PackageFormInput, ProductEditInput, ProductFormInput } from "./models/product-form.model";

type ReadableFormData = { readonly get: (name: string) => unknown };

/** Raw product form values preserved when a submission contains errors. */
export type ProductFormValues = {
  /** Product name input. */
  readonly name: string;
  /** Category select value. */
  readonly categoryId: string;
  /** Visible brand name input. */
  readonly brandName: string;
  /** Hidden existing brand id selected by the user. */
  readonly brandId: string;
  /** Hidden confirmed new brand name. */
  readonly newBrandName: string;
  /** Package type select value. */
  readonly packageTypeId: string;
  /** Amount input. */
  readonly amount: string;
  /** Unit type select value. */
  readonly unitTypeId: string;
  /** Units-per-package input. */
  readonly unitsPerPackage: string;
};

/** Raw package form values preserved when a submission contains errors. */
export type PackageFormValues = Pick<ProductFormValues, "packageTypeId" | "amount" | "unitTypeId" | "unitsPerPackage">;

/** Parse admin catalog query state from a route URL. */
export function parseCatalogQuery(url: URL) {
  const q = url.searchParams.get("q") ?? "";
  const brandId = blankToUndefined(url.searchParams.get("brandId"));
  const categoryId = parseOptionalPositiveInteger(url.searchParams.get("categoryId"), "categoryId");
  const limit = parsePositiveIntegerWithDefault(url.searchParams.get("limit"), 50, "limit");
  return { q, brandId, categoryId, limit };
}

/** Parse optional product-create context from a route URL. */
export function parseProductCreateQuery(url: URL): { readonly brandId: string | undefined; readonly categoryId: number | undefined } {
  return {
    brandId: blankToUndefined(url.searchParams.get("brandId")),
    categoryId: parseOptionalPositiveInteger(url.searchParams.get("categoryId"), "categoryId"),
  };
}

/** Read product form values from HTML form data. */
export function productValuesFromFormData(formData: ReadableFormData): ProductFormValues {
  return {
    name: getFormString(formData, "name"),
    categoryId: getFormString(formData, "categoryId"),
    brandName: getFormString(formData, "brandName"),
    brandId: getFormString(formData, "brandId"),
    newBrandName: getFormString(formData, "newBrandName"),
    packageTypeId: getFormString(formData, "packageTypeId"),
    amount: getFormString(formData, "amount"),
    unitTypeId: getFormString(formData, "unitTypeId"),
    unitsPerPackage: getFormString(formData, "unitsPerPackage") || "1",
  };
}

/** Read package form values from HTML form data. */
export function packageValuesFromFormData(formData: ReadableFormData): PackageFormValues {
  return {
    packageTypeId: getFormString(formData, "packageTypeId"),
    amount: getFormString(formData, "amount"),
    unitTypeId: getFormString(formData, "unitTypeId"),
    unitsPerPackage: getFormString(formData, "unitsPerPackage") || "1",
  };
}

/** Convert raw product form values into parsed product-create input. */
export function parseProductForm(values: ProductFormValues): ProductFormInput {
  const identity = parseProductIdentity(values);
  return { ...identity, package: parsePackageForm(values) };
}

/** Convert raw product form values into parsed product-edit input. */
export function parseProductEditForm(values: ProductFormValues): ProductEditInput {
  return parseProductIdentity(values);
}

/** Convert raw package form values into parsed package input. */
export function parsePackageForm(values: PackageFormValues): PackageFormInput {
  const fields: Record<string, string> = {};
  const packageTypeId = parsePositiveIntegerField(values.packageTypeId, "packageTypeId", "Kies een verpakkingstype.", fields);
  const unitTypeId = parsePositiveIntegerField(values.unitTypeId, "unitTypeId", "Kies een inhoudseenheid.", fields);
  const amount = parseDecimalField(values.amount, fields);
  const unitsPerPackage = parsePositiveIntegerField(values.unitsPerPackage, "unitsPerPackage", "Vul een positief geheel aantal in.", fields);
  if (Object.keys(fields).length > 0) throw new InvalidCatalogForm(fields);
  return { packageTypeId, amount, unitTypeId, unitsPerPackage };
}

/** Build default product form values for a create form. */
export function defaultProductFormValues(input: { readonly categoryId: number | null; readonly brand: { readonly id: string; readonly name: string } | null }): ProductFormValues {
  return {
    name: "",
    categoryId: input.categoryId === null ? "" : String(input.categoryId),
    brandName: input.brand?.name ?? "",
    brandId: input.brand?.id ?? "",
    newBrandName: "",
    packageTypeId: "",
    amount: "",
    unitTypeId: "",
    unitsPerPackage: "1",
  };
}

/** Build product form values from an existing product detail. */
export function productFormValuesFromDetail(detail: { readonly name: string; readonly category: { readonly id: number }; readonly brand: { readonly id: string; readonly name: string } | null }): ProductFormValues {
  return {
    ...defaultProductFormValues({ categoryId: detail.category.id, brand: detail.brand }),
    name: detail.name,
  };
}

/** Build package form values from an existing package detail. */
export function packageFormValuesFromDetail(detail: { readonly packageType: { readonly id: number }; readonly unitContent: { readonly amount: string; readonly unitType: { readonly id: number } }; readonly unitsPerPackage: number }): PackageFormValues {
  return {
    packageTypeId: String(detail.packageType.id),
    amount: detail.unitContent.amount,
    unitTypeId: String(detail.unitContent.unitType.id),
    unitsPerPackage: String(detail.unitsPerPackage),
  };
}

/** Parse and trim a required category name. */
export function parseCategoryName(formData: ReadableFormData): string {
  const name = getFormString(formData, "name").trim();
  if (name.length === 0) throw new InvalidCatalogForm({ name: "Vul een naam in." });
  return name;
}

function parseProductIdentity(values: ProductFormValues): ProductEditInput {
  const fields: Record<string, string> = {};
  const name = values.name.trim();
  if (name.length === 0) fields.name = "Vul een productnaam in.";
  const categoryId = parsePositiveIntegerField(values.categoryId, "categoryId", "Kies een categorie.", fields);
  const trimmedBrandName = values.brandName.trim();
  const trimmedBrandId = values.brandId.trim();
  const trimmedNewBrandName = values.newBrandName.trim();
  if (trimmedBrandId.length > 0 && trimmedNewBrandName.length > 0) fields.brandName = "Kies een bestaand merk of bevestig een nieuw merk, niet beide.";
  if (Object.keys(fields).length > 0) throw new InvalidCatalogForm(fields);
  return {
    name,
    categoryId,
    brandName: trimmedBrandName.length === 0 ? null : trimmedBrandName,
    brandId: trimmedBrandName.length === 0 || trimmedBrandId.length === 0 ? null : trimmedBrandId,
    newBrandName: trimmedBrandName.length === 0 || trimmedNewBrandName.length === 0 ? null : trimmedNewBrandName,
  };
}

function getFormString(formData: ReadableFormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function blankToUndefined(value: string | null): string | undefined {
  if (value === null) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function parseOptionalPositiveInteger(value: string | null, field: string): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new InvalidCatalogQuery(field, `${field} is ongeldig.`);
  return parsed;
}

function parsePositiveIntegerWithDefault(value: string | null, fallback: number, field: string): number {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new InvalidCatalogQuery(field, `${field} is ongeldig.`);
  return parsed;
}

function parsePositiveIntegerField(value: string, field: string, message: string, fields: Record<string, string>): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    fields[field] = message;
    return 0;
  }
  return parsed;
}

function parseDecimalField(value: string, fields: Record<string, string>): string {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized) || Number(normalized) <= 0) {
    fields.amount = "Vul een positieve inhoud in.";
    return "";
  }
  return normalized;
}
