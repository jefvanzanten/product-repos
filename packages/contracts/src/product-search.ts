export type ProductSearchContent = {
  id: string;
  amount: number;
  barcode: string | null;
  packagingTypeName: string;
  unit: string;
  unitsPerPackage: number;
};

export type ProductSearchProductType = {
  id: string;
  name: string;
  brandProductCount: number;
};

export type ProductSearchBrandProduct = {
  brandId: string;
  productId: string;
  productTypeId: string;
  productTypeName: string;
  name: string;
  variantCount: number;
};

export type ProductSearchVariant = {
  id: string;
  name: string;
  brandName: string | null;
  productTypeName: string;
  contents: ProductSearchContent[];
};

export type ProductSearchResponse = {
  productTypes: ProductSearchProductType[];
  brandProducts: ProductSearchBrandProduct[];
  variants: ProductSearchVariant[];
};
