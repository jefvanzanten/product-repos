import type { CreateConcreteProduct, CreateProductComposition, MacroProfileMutation, UpdateConcreteProduct, UpdateProductComposition } from "@product-repos/contracts";
import { canonicalDecimal, trimRequired, type Result } from "../domain/catalog-domain.ts";
import { parseProductMacroProfile } from "../domain/product-macro-profile.ts";
import type { ProductV2Repository } from "../repositories/product-v2.repository.ts";

/** Product-model application use cases exposed to HTTP routes. */
export type ProductV2Service = ReturnType<typeof createProductV2Service>;

/**
 * Create product-model use cases around an injected repository.
 *
 * @param repository - Product persistence capability.
 * @returns Product-model application service.
 */
export function createProductV2Service(repository: ProductV2Repository) {
  /** Normalize and create one product composition. */
  function createComposition(input: CreateProductComposition) {
    const normalized = normalizeCompositionInput(input);
    return normalized.ok ? repository.createComposition(normalized.value) : normalized;
  }

  /** Normalize and update one product composition. */
  function updateComposition(compositionId: string, input: UpdateProductComposition) {
    const normalized = normalizeCompositionInput(input);
    return normalized.ok ? repository.updateComposition(compositionId, normalized.value) : normalized;
  }

  /** Validate and explicitly activate or deactivate one composition macro profile. */
  function updateMacroProfile(compositionId: string, mutation: MacroProfileMutation) {
    if (!mutation.enabled) return repository.updateMacroProfile(compositionId, mutation);
    const parsed = parseProductMacroProfile(mutation.profile);
    if (!parsed.ok) return parsed;
    if (parsed.value === null) throw new Error("Enabled macro mutation parsed without a profile");
    return repository.updateMacroProfile(compositionId, { enabled: true, profile: parsed.value });
  }

  /** Normalize and create one concrete product. */
  function createProduct(input: CreateConcreteProduct) {
    const normalized = normalizeConcreteProductInput(input);
    return normalized.ok ? repository.createProduct(normalized.value) : normalized;
  }

  /** Normalize and update one concrete product. */
  function updateProduct(productId: string, input: UpdateConcreteProduct) {
    const normalized = normalizeConcreteProductInput(input);
    return normalized.ok ? repository.updateProduct(productId, normalized.value) : normalized;
  }

  return {
    searchCompositions: repository.searchCompositions,
    createComposition,
    updateComposition,
    updateMacroProfile,
    listProducts: repository.listProducts,
    getProduct: repository.getProduct,
    createProduct,
    updateProduct,
    setArchived: repository.setArchived,
  };
}

/** Normalize one composition input at the application boundary. */
function normalizeCompositionInput(input: CreateProductComposition): Result<CreateProductComposition>;
function normalizeCompositionInput(input: UpdateProductComposition): Result<UpdateProductComposition>;
function normalizeCompositionInput(input: CreateProductComposition | UpdateProductComposition): Result<CreateProductComposition | UpdateProductComposition> {
  const name = trimRequired(input.name, "name");
  if (!name.ok) return name;
  if (!("macroProfile" in input)) return { ok: true, value: { ...input, name: name.value, brandId: input.brandId ?? null } };
  const macro = parseProductMacroProfile(input.macroProfile);
  if (!macro.ok) return macro;
  if (input.consumptionType === null && macro.value !== null) {
    return { ok: false, error: { code: "PRODUCT_MACRO_PROFILE_INVALID", message: "Voedingswaarden vereisen een consumptieproduct.", fields: { macroProfile: "Schakel Consumptieproduct in om voedingswaarden te activeren." } } };
  }
  return { ok: true, value: { ...input, name: name.value, brandId: input.brandId ?? null, macroProfile: macro.value } };
}

/** Normalize one concrete-product input at the application boundary. */
function normalizeConcreteProductInput(input: CreateConcreteProduct): Result<CreateConcreteProduct>;
function normalizeConcreteProductInput(input: UpdateConcreteProduct): Result<UpdateConcreteProduct>;
function normalizeConcreteProductInput(input: CreateConcreteProduct | UpdateConcreteProduct): Result<CreateConcreteProduct | UpdateConcreteProduct> {
  const content = input.content ? canonicalDecimal(input.content.amount, "content.amount") : null;
  if (content && !content.ok) return content;
  const singularName = input.portion ? trimRequired(input.portion.singularName, "portion.singularName") : null;
  if (singularName && !singularName.ok) return singularName;
  const pluralName = input.portion ? trimRequired(input.portion.pluralName, "portion.pluralName") : null;
  if (pluralName && !pluralName.ok) return pluralName;
  const portionAmount = input.portion ? canonicalDecimal(input.portion.amount, "portion.amount") : null;
  if (portionAmount && !portionAmount.ok) return portionAmount;
  return { ok: true, value: {
    ...input,
    packageTypeId: input.packageTypeId ?? null,
    content: input.content && content?.ok ? { ...input.content, amount: content.value } : null,
    imageUrl: input.imageUrl ?? null,
    barcode: input.barcode ?? null,
    portion: input.portion && singularName?.ok && pluralName?.ok && portionAmount?.ok
      ? { ...input.portion, singularName: singularName.value, pluralName: pluralName.value, amount: portionAmount.value, portionsPerProduct: input.portion.portionsPerProduct ?? null }
      : null,
  } };
}
