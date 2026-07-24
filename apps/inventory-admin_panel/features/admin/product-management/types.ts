import type { ProductSearchResponse } from "@product-repos/contracts/product-search";
import type { UnitType } from "@product-repos/contracts";

interface PackagingType {
  id: number;
  name: string;
}

const productManagementQueryParams = {
  search: "q",
  productType: "producttype",
  brandProduct: "productmerken",
  brandProductAlias: "merkproduct",
  variant: "variant",
  previousParam: "previousParam",
  previousQuery: "previousQuery",
} as const;

const singleResultParamNames = [
  productManagementQueryParams.productType,
  productManagementQueryParams.brandProduct,
  productManagementQueryParams.brandProductAlias,
  productManagementQueryParams.variant,
] as const;

type ProductManagementView = "multi" | "page" | "single";
type SingleResultParamName = (typeof singleResultParamNames)[number];

interface ProductManagementLoaderData {
  initialQuery: string;
  packagingTypes: PackagingType[];
  previousParam?: SingleResultParamName;
  previousQuery?: string;
  query: string;
  result?: ProductSearchResponse;
  selectedParam?: SingleResultParamName;
  unitTypes: UnitType[];
  view: ProductManagementView;
}

export { productManagementQueryParams, singleResultParamNames };
export type {
  PackagingType,
  ProductManagementLoaderData,
  ProductManagementView,
  SingleResultParamName,
};
