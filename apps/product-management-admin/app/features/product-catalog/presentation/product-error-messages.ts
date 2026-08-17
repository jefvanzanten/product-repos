import { isProductApiFailure } from "../domain/product-api-failure";

/** Field and form errors displayed by product-catalog forms. */
export type ProductFormErrors = Record<string, string>;

/**
 * Translate a classified product-catalog API failure into localized form errors.
 *
 * @param error - Unknown route action failure.
 * @returns Errors safe for presentation.
 */
export function mapProductApiError(error: unknown): ProductFormErrors {
  if (!isProductApiFailure(error)) return { form: "Opslaan mislukt. Probeer opnieuw." };
  if (error.fields) return error.fields;
  if (error.code === "CATEGORY_ALREADY_EXISTS") return { categoryName: "Deze categorie bestaat al op dit niveau." };
  if (error.code === "CATEGORY_HAS_CHILDREN") return { form: "Verwijder eerst de subcategorieën onder deze categorie." };
  if (error.code === "CATEGORY_HAS_PRODUCTS") return { form: "Deze categorie is nog gekoppeld aan producten." };
  if (error.code === "PRODUCT_ALREADY_EXISTS") return { productName: "Dit product bestaat al." };
  if (error.code === "PRODUCT_COMPOSITION_ALREADY_EXISTS") return { productName: "Deze samenstelling bestaat al. Kies de bestaande samenstelling uit de suggesties." };
  if (error.code === "BARCODE_ALREADY_EXISTS") return { barcode: "Deze barcode is al aan een ander product gekoppeld." };
  if (error.code === "PRODUCT_PACKAGE_ALREADY_EXISTS") return { form: "Deze verpakking bestaat al voor dit product." };
  if (error.code === "PRODUCT_MACRO_PROFILE_INVALID") return { macroProfile: error.message ?? "Controleer de voedingswaarden." };
  if (error.code === "UNIT_DIMENSION_INCOMPATIBLE") return { referenceBasis: "De referentiebasis past niet bij de verpakkingseenheid." };
  if (error.code === "PRODUCT_NOT_FOUND") return { form: "Product niet gevonden." };
  if (error.code === "REFERENCE_NOT_FOUND") return { form: "Een gekozen categorie, merk of verpakking bestaat niet meer. Kies opnieuw." };
  if (error.code === "VALIDATION_ERROR") return { form: error.message ?? "Controleer de ingevulde velden." };
  return { form: error.message ?? `Aanvraag mislukt met status ${error.status}.` };
}
