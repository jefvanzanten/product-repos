export type ProductSearchContent = {
  amount: number;
  unit: string;
};

export type ProductSearchProductType = {
  id: string;
  name: string;
  brandProductCount: number;
};

export type ProductSearchBrandProduct = {
  brandId: string;
  productTypeId: string;
  name: string;
  variantCount: number;
};

export type ProductSearchVariant = {
  id: string;
  name: string;
  contents: ProductSearchContent[];
};

export type ProductSearchResponse = {
  productTypes: ProductSearchProductType[];
  brandProducts: ProductSearchBrandProduct[];
  variants: ProductSearchVariant[];
};
