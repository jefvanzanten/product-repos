import type { Brand, Category, ConcreteProductSummary } from "../../domain/product-catalog";

/** Field and form errors returned by product catalog mutations. */
export type FormErrors = Record<string, string>;

/** Concrete product projected into the catalog's established product-card shape. */
export type CatalogProductRow = {
  readonly id: string;
  readonly displayName: string;
  readonly brand: Brand | null;
  readonly consumptionType: ConcreteProductSummary["consumptionType"];
  readonly categoryPath: string;
  readonly packageSummary: string;
  readonly imageUrl: string | null;
};

/** Category projected with the metadata used by browse and search views. */
export type CatalogCategoryRow = Category & {
  readonly path: string;
  readonly productCount: number;
};

/** Established category and brand browse states backed by concrete products. */
export type CatalogBrowseResponse =
  | { readonly state: "root"; readonly categories: ReadonlyArray<CatalogCategoryRow>; readonly isEmpty: boolean }
  | { readonly state: "category"; readonly category: CatalogCategoryRow; readonly categoryPath: ReadonlyArray<Category>; readonly subcategories: ReadonlyArray<CatalogCategoryRow>; readonly products: { readonly items: ReadonlyArray<CatalogProductRow>; readonly hasMore: boolean; readonly cursor: string | null } }
  | { readonly state: "brand"; readonly brand: Brand; readonly productGroups: ReadonlyArray<{ readonly category: Category; readonly categoryPath: string; readonly products: ReadonlyArray<CatalogProductRow> }>; readonly hasMore: boolean; readonly cursor: string | null };

/** Established grouped search view backed by concrete products and reference data. */
export type CatalogSearchResponse = {
  readonly products: ReadonlyArray<CatalogProductRow>;
  readonly brands: ReadonlyArray<Brand & { readonly productCount: number }>;
  readonly categories: ReadonlyArray<CatalogCategoryRow>;
  readonly hasMore: { readonly products: boolean; readonly brands: boolean; readonly categories: boolean };
};

/** Data required to render the restored product catalog UI. */
export type LoaderData = {
  readonly query: string;
  readonly mode: "browse" | "search";
  readonly browse: CatalogBrowseResponse | null;
  readonly search: CatalogSearchResponse | null;
  readonly categories: ReadonlyArray<Category>;
  readonly editCategory: Category | null;
};

/** Category mutation result returned by the product catalog action. */
export type ActionResult = {
  readonly ok?: true;
  readonly errors?: FormErrors;
  readonly createdCategory?: Category;
  readonly updatedCategory?: Category;
  readonly deletedCategoryId?: number;
  readonly deletedCategoryParentId?: number | null;
};
