import type { CatalogCategoryRow, CategoryDto, ProductCreatedDto, ProductDetailDto, ProductPackageDetailDto } from "@product-repos/contracts";
import type { Result } from "../../domain";
import { findBrandById, findBrandByNormalizedName, findOrCreateBrand } from "../../repositories/brands.repository";
import * as catalogRepository from "../../repositories/catalog.repository";
import * as categoryRepository from "../../repositories/category.repository";
import * as productPackageRepository from "../../repositories/product-packages.repository";
import * as productRepository from "../../repositories/products.repository";
import { findAllPackageTypes, findAllUnitTypes } from "../../repositories/units.repository";
import { catalogErr, catalogOk, fromResult } from "../helpers/product-catalog-result";
import { type CatalogResult, CatalogContextNotFound, InvalidCatalogForm, InvalidCatalogQuery } from "../models/product-catalog-result.model";
import type { CatalogIndexModel } from "../models/catalog-index.model";
import type { CatalogUrlState } from "../models/catalog-navigation.model";
import type { CategoryWithPath } from "../models/category.model";
import type { CategoryAccordionNode, RootCategoryAccordionModel } from "../models/category-tree.model";
import type { ProductCreateModel } from "../models/product-create.model";
import type { PackageFormInput, ProductEditInput, ProductFormInput } from "../models/product-form.model";
import type { CatalogReferenceData } from "../models/reference-data.model";

/** Load catalog state for the admin product catalog page. */
export function loadCatalogIndex(state: CatalogUrlState): CatalogResult<CatalogIndexModel> {
  if (state.brandId !== undefined && state.categoryId !== undefined) {
    return catalogErr(new InvalidCatalogQuery("context", "Kies een merk of categorie, niet allebei."));
  }

  const categoryTree = loadCategoryAccordionTree();
  const rootCategories = categoryTree.map((node) => node.category);
  const query = state.q.trim();
  if (query.length >= 2) {
    return catalogOk({
      state,
      search: catalogRepository.searchCatalog({ query, productLimit: 20, brandLimit: 10, categoryLimit: 10 }),
      browse: null,
      rootCategories,
      categoryTree,
    });
  }

  const browse = repositoryResult(() => catalogRepository.browseCatalog({
    ...(state.categoryId === undefined ? {} : { categoryId: state.categoryId }),
    ...(state.brandId === undefined ? {} : { brandId: state.brandId }),
    limit: state.limit,
  }));
  if (!browse.ok) return browse;
  return catalogOk({ state, search: null, browse: browse.value, rootCategories, categoryTree });
}

/** Load the root-category accordion, optionally with one category opened. */
export function loadRootCategoryAccordion(input: { readonly categoryId: number | null; readonly limit: number }): CatalogResult<RootCategoryAccordionModel> {
  const categoryTree = loadCategoryAccordionTree();
  const categoryId = input.categoryId;
  if (categoryId === null) return catalogOk({ categoryTree, openPathIds: [], openCategory: null, limit: input.limit });
  if (!categoryTreeContains(categoryTree, categoryId)) {
    return catalogErr(new CatalogContextNotFound("category", String(categoryId)));
  }
  const browse = repositoryResult(() => catalogRepository.browseCatalog({ categoryId, limit: input.limit }));
  if (!browse.ok) return browse;
  if (browse.value.state !== "category") return catalogErr(new CatalogContextNotFound("category", String(categoryId)));
  return catalogOk({ categoryTree, openPathIds: browse.value.categoryPath.map((category) => category.id), openCategory: browse.value, limit: input.limit });
}

/** Load all reference data and optional explicit context for the product creation page. */
export function loadProductCreateForm(input: { readonly brandId: string | undefined; readonly categoryId: number | undefined }): CatalogResult<ProductCreateModel> {
  const references = buildReferenceData();
  const selectedBrand = input.brandId === undefined ? null : findBrandById(input.brandId) ?? null;
  if (input.brandId !== undefined && selectedBrand === null) return catalogErr(new CatalogContextNotFound("brand", input.brandId));
  const selectedCategoryId = input.categoryId ?? null;
  if (selectedCategoryId !== null && !references.categories.some((category) => category.id === selectedCategoryId)) {
    return catalogErr(new CatalogContextNotFound("category", String(selectedCategoryId)));
  }
  return catalogOk({ ...references, selectedBrand, selectedCategoryId });
}

/** Load all reference data needed by product and package mutation forms. */
export function loadCatalogReferenceData(): CatalogResult<CatalogReferenceData> {
  return catalogOk(buildReferenceData());
}

/** Create a product and its first package through the admin application service. */
export function createProduct(input: ProductFormInput): CatalogResult<ProductCreatedDto> {
  const brandId = resolveBrandId(input);
  if (!brandId.ok) return brandId;
  return repositoryResult(() => productRepository.createProduct({
    name: input.name,
    categoryId: input.categoryId,
    brandId: brandId.value,
    package: input.package,
  }));
}

/** Load one product detail for the admin detail page. */
export function loadProductDetail(productId: string): CatalogResult<ProductDetailDto> {
  return repositoryResult(() => productRepository.findProductDetailById(productId));
}

/** Update product identity fields from the admin detail page. */
export function updateProduct(productId: string, input: ProductEditInput): CatalogResult<ProductDetailDto> {
  const brandId = resolveBrandId(input);
  if (!brandId.ok) return brandId;
  return repositoryResult(() => productRepository.updateProduct({ productId, name: input.name, categoryId: input.categoryId, brandId: brandId.value }));
}

/** Create a package for an existing product. */
export function createProductPackage(productId: string, input: PackageFormInput): CatalogResult<ProductPackageDetailDto> {
  return repositoryResult(() => productPackageRepository.createProductPackage({ productId, ...input }));
}

/** Load one package detail for an existing product. */
export function loadProductPackageDetail(productId: string, packageId: string): CatalogResult<ProductPackageDetailDto> {
  return repositoryResult(() => productPackageRepository.findProductPackageDetailById(productId, packageId));
}

/** Update one package for an existing product. */
export function updateProductPackage(productId: string, packageId: string, input: PackageFormInput): CatalogResult<ProductPackageDetailDto> {
  return repositoryResult(() => productPackageRepository.updateProductPackage({ productId, packageId, ...input }));
}

/** Load one category for admin editing. */
export function loadCatalogCategory(categoryId: number): CatalogResult<CategoryWithPath> {
  const categories = withCategoryPaths(categoryRepository.findAllCategories());
  const category = categories.find((item) => item.id === categoryId);
  if (category === undefined) return catalogErr(new CatalogContextNotFound("category", String(categoryId)));
  return catalogOk(category);
}

/** Create a root category or direct child category from catalog browse. */
export function createCatalogCategory(input: { readonly name: string; readonly parentId: number | null }): CatalogResult<CategoryDto> {
  return repositoryResult(() => categoryRepository.createCategory({ name: input.name, parentId: input.parentId }));
}

/** Rename a category from catalog browse. */
export function updateCatalogCategoryName(input: { readonly id: number; readonly name: string }): CatalogResult<CategoryDto> {
  return repositoryResult(() => categoryRepository.updateCategoryName(input));
}

function repositoryResult<T>(operation: () => Result<T>): CatalogResult<T> {
  return fromResult(operation());
}

function buildReferenceData(): CatalogReferenceData {
  return {
    categories: withCategoryPaths(categoryRepository.findAllCategories()),
    packageTypes: findAllPackageTypes(),
    unitTypes: findAllUnitTypes(),
  };
}

function loadCategoryAccordionTree(): ReadonlyArray<CategoryAccordionNode> {
  const categories = withCategoryPaths(categoryRepository.findAllCategories()).map((category): CatalogCategoryRow => ({ ...category, productCount: 0 }));
  const childrenByParentId = new Map<number | null, CatalogCategoryRow[]>();
  for (const category of categories) {
    const siblings = childrenByParentId.get(category.parentId) ?? [];
    siblings.push(category);
    childrenByParentId.set(category.parentId, siblings);
  }

  return buildCategoryNodes(null, childrenByParentId, new Set());
}

function buildCategoryNodes(parentId: number | null, childrenByParentId: ReadonlyMap<number | null, ReadonlyArray<CatalogCategoryRow>>, visited: ReadonlySet<number>): ReadonlyArray<CategoryAccordionNode> {
  const children = childrenByParentId.get(parentId) ?? [];
  return children
    .filter((category) => !visited.has(category.id))
    .map((category) => {
      const nextVisited = new Set(visited);
      nextVisited.add(category.id);
      return {
        category,
        children: buildCategoryNodes(category.id, childrenByParentId, nextVisited),
      };
    });
}

function categoryTreeContains(nodes: ReadonlyArray<CategoryAccordionNode>, categoryId: number): boolean {
  return nodes.some((node) => node.category.id === categoryId || categoryTreeContains(node.children, categoryId));
}

function withCategoryPaths(categories: ReadonlyArray<CategoryDto>): ReadonlyArray<CategoryWithPath> {
  return categories.map((category) => ({ ...category, path: makeCategoryPath(category, categories) }));
}

function makeCategoryPath(category: CategoryDto, categories: ReadonlyArray<CategoryDto>): string {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const path: string[] = [];
  const visited = new Set<number>();
  let current: CategoryDto | undefined = category;
  while (current !== undefined && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current.name);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return path.join(" > ");
}

function resolveBrandId(input: ProductEditInput): CatalogResult<string | null> {
  if (input.brandName === null) return catalogOk(null);
  if (input.newBrandName !== null) {
    if (normalizeBrandName(input.newBrandName) !== normalizeBrandName(input.brandName)) {
      return catalogErr(new InvalidCatalogForm({ brandName: "Bevestig het nieuw ingevoerde merk opnieuw." }));
    }
    return catalogOk(findOrCreateBrand(input.newBrandName).brand.id);
  }
  if (input.brandId !== null) {
    const selectedBrand = findBrandById(input.brandId);
    if (selectedBrand && normalizeBrandName(selectedBrand.name) === normalizeBrandName(input.brandName)) return catalogOk(selectedBrand.id);
    return catalogErr(new InvalidCatalogForm({ brandName: "Kies het bestaande merk opnieuw." }));
  }
  const exactBrand = findBrandByNormalizedName(input.brandName);
  if (exactBrand) return catalogOk(exactBrand.id);
  return catalogErr(new InvalidCatalogForm({ brandName: `Bevestig “${input.brandName}” als nieuw merk.` }));
}

function normalizeBrandName(name: string): string {
  return name.trim().toLowerCase();
}
