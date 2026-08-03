import type { BrandRepository } from "../internal/brands.repository.ts";
import type { CategoryRepository } from "../internal/category.repository.ts";
import type { ReferenceDataRepository } from "../internal/units.repository.ts";

/** Cohesive current use cases for brands, categories, units, and package types. */
export type CatalogReferenceService = BrandRepository & CategoryRepository & ReferenceDataRepository;

/** Compose existing reference-data use cases without adding another persistence abstraction. */
export function createCatalogReferenceService(dependencies: {
  readonly brands: BrandRepository;
  readonly categories: CategoryRepository;
  readonly referenceData: ReferenceDataRepository;
}): CatalogReferenceService {
  return { ...dependencies.brands, ...dependencies.categories, ...dependencies.referenceData };
}
