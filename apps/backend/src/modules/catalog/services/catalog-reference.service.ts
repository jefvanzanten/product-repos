import { trimRequired, type Result } from "../domain/catalog-domain.ts";
import type { BrandRepository } from "../repositories/brand.repository.ts";
import type { CategoryRepository } from "../repositories/category.repository.ts";
import type { ReferenceDataRepository } from "../repositories/reference-data.repository.ts";

/** Cohesive current use cases for brands, categories, units, and package types. */
export type CatalogReferenceService = ReturnType<typeof createCatalogReferenceService>;

/**
 * Create normalized reference-data use cases.
 *
 * @param dependencies - Injected catalog repositories.
 * @returns Catalog reference-data application service.
 */
export function createCatalogReferenceService(dependencies: {
  readonly brands: BrandRepository;
  readonly categories: CategoryRepository;
  readonly referenceData: ReferenceDataRepository;
}) {
  /** Normalize and find or create one brand. */
  function findOrCreateBrand(name: string): Result<ReturnType<BrandRepository["findOrCreateBrand"]>> {
    const normalized = trimRequired(name, "name");
    return normalized.ok ? { ok: true, value: dependencies.brands.findOrCreateBrand(normalized.value) } : normalized;
  }

  /** Normalize and create one category. */
  function createCategory(input: Parameters<CategoryRepository["createCategory"]>[0]) {
    const name = trimRequired(input.name, "name");
    return name.ok ? dependencies.categories.createCategory({ ...input, name: name.value }) : name;
  }

  /** Normalize and rename one category. */
  function updateCategoryName(id: number, value: string) {
    const name = trimRequired(value, "name");
    return name.ok ? dependencies.categories.updateCategoryName(id, name.value) : name;
  }

  return {
    findAllBrands: dependencies.brands.findAllBrands,
    searchBrands: dependencies.brands.searchBrands,
    findBrandById: dependencies.brands.findBrandById,
    findOrCreateBrand,
    findAllCategories: dependencies.categories.findAllCategories,
    findCategoryById: dependencies.categories.findCategoryById,
    createCategory,
    updateCategoryName,
    deleteCategory: dependencies.categories.deleteCategory,
    findAllPackageTypes: dependencies.referenceData.findAllPackageTypes,
    findAllUnitTypes: dependencies.referenceData.findAllUnitTypes,
  };
}
