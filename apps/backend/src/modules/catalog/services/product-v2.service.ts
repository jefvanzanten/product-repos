import type { CreateConcreteProduct, CreateProductComposition, MacroProfile, UpdateConcreteProduct, UpdateProductComposition } from "@product-repos/contracts";
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

  /** Validate and replace one composition macro profile. */
  function updateMacroProfile(compositionId: string, profile: MacroProfile | null) {
    const parsed = parseProductMacroProfile(profile);
    return parsed.ok ? repository.updateMacroProfile(compositionId, parsed.value) : parsed;
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
function normalizeCompositionInput(input: CreateProductComposition | UpdateProductComposition): Result<CreateProductComposition> {
  const name = trimRequired(input.name, "name");
  if (!name.ok) return name;
  const macro = parseProductMacroProfile(input.macroProfile);
  if (!macro.ok) return macro;
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
