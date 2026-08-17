import type { Brand } from "../../../domain/product-catalog";

/**
 * Find a brand name by identifier.
 *
 * @param brands - Brands available to the form.
 * @param brandId - Optional selected brand identifier.
 * @returns The matching brand name, when present.
 */
export function findBrandNameById(brands: ReadonlyArray<Brand>, brandId: string | undefined): string | undefined {
  if (!brandId) return undefined;
  return brands.find((brand) => brand.id === brandId)?.name;
}

/**
 * Filter brand suggestions using a case-insensitive partial match.
 *
 * @param brands - Brands available to the form.
 * @param query - User-entered search query.
 * @returns Brands whose names contain the query.
 */
export function filterBrandSuggestions(brands: ReadonlyArray<Brand>, query: string): ReadonlyArray<Brand> {
  const normalizedQuery = normalizeBrandName(query);
  return brands.filter((brand) => normalizeBrandName(brand.name).includes(normalizedQuery));
}

/**
 * Remove duplicate brands by identifier.
 *
 * @param brands - Possibly duplicated brand suggestions.
 * @returns Suggestions with unique identifiers.
 */
export function dedupeBrands(brands: ReadonlyArray<Brand>): ReadonlyArray<Brand> {
  const seenBrandIds = new Set<string>();
  return brands.filter((brand) => {
    if (seenBrandIds.has(brand.id)) return false;
    seenBrandIds.add(brand.id);
    return true;
  });
}

/**
 * Normalize a brand name for comparisons.
 *
 * @param value - Brand name or query.
 * @returns A trimmed, lower-case value.
 */
export function normalizeBrandName(value: string): string {
  return value.trim().toLowerCase();
}
