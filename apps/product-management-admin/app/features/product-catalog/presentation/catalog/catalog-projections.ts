import { buildCategoryPath, formatCategoryPath } from "../../domain/category-tree";
import type { Brand, Category, ConcreteProductSummary } from "../../domain/product-catalog";
import type { CatalogBrowseResponse, CatalogCategoryRow, CatalogProductRow, CatalogSearchResponse } from "../types/product-catalog.types";

/** Build the category-tree root state. */
export function buildRootBrowse(categories: ReadonlyArray<Category>): CatalogBrowseResponse {
  return {
    state: "root",
    categories: categories.filter((category) => category.parentId === null).map((category) => toCategoryRow(category, [category], 0)),
    isEmpty: categories.length === 0,
  };
}

/** Build grouped search results for the catalog presentation. */
export function buildSearchResponse(query: string, products: ReadonlyArray<ConcreteProductSummary>, productsTruncated: boolean, categories: ReadonlyArray<Category>, brands: ReadonlyArray<Brand>): CatalogSearchResponse {
  const normalizedQuery = normalize(query);
  const matchingProducts = products.filter((product) => [product.displayName, product.compositionName, product.brandName ?? "", product.categoryPath, product.barcode ?? ""].some((value) => normalize(value).includes(normalizedQuery)));
  const matchingBrands = brands.filter((brand) => normalize(brand.name).includes(normalizedQuery));
  const matchingCategories = categories.filter((category) => formatCategoryPath(buildCategoryPath(category.id, categories)).toLocaleLowerCase("nl").includes(normalizedQuery));

  return {
    products: matchingProducts.slice(0, 50).map((product) => toCatalogProduct(product, brands)),
    brands: matchingBrands.map((brand) => ({ ...brand, productCount: products.filter((product) => normalize(product.brandName ?? "") === normalize(brand.name)).length })),
    categories: matchingCategories.map((category) => {
      const path = buildCategoryPath(category.id, categories);
      const formattedPath = formatCategoryPath(path);
      return toCategoryRow(category, path, products.filter((product) => product.categoryPath === formattedPath).length);
    }),
    hasMore: { products: productsTruncated || matchingProducts.length > 50, brands: false, categories: false },
  };
}

/** Group concrete products by their leaf category. */
export function groupProductsByCategory(products: ReadonlyArray<ConcreteProductSummary>, categories: ReadonlyArray<Category>, brands: ReadonlyArray<Brand>): ReadonlyArray<{ readonly category: Category; readonly categoryPath: string; readonly products: ReadonlyArray<CatalogProductRow> }> {
  const groups = new Map<string, ConcreteProductSummary[]>();
  for (const product of products) groups.set(product.categoryPath, [...(groups.get(product.categoryPath) ?? []), product]);
  return [...groups.entries()].flatMap(([categoryPath, items]) => {
    const category = categories.find((candidate) => formatCategoryPath(buildCategoryPath(candidate.id, categories)) === categoryPath);
    return category ? [{ category, categoryPath, products: items.map((product) => toCatalogProduct(product, brands)) }] : [];
  });
}

/** Project one concrete product into the product-card model. */
export function toCatalogProduct(product: ConcreteProductSummary, brands: ReadonlyArray<Brand>): CatalogProductRow {
  return {
    id: product.productId,
    displayName: product.displayName,
    brand: brands.find((brand) => normalize(brand.name) === normalize(product.brandName ?? "")) ?? null,
    consumptionType: product.consumptionType,
    categoryPath: product.categoryPath,
    packageSummary: product.packageSummary ?? "",
    imageUrl: product.imageUrl,
  };
}

/** Project a category and path into a catalog row. */
export function toCategoryRow(category: Category, path: ReadonlyArray<Category>, productCount: number): CatalogCategoryRow {
  return { ...category, path: formatCategoryPath(path), productCount };
}

/** Normalize catalog text for case-insensitive Dutch matching. */
function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("nl");
}
