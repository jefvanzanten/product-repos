import type {
  ProductSearchContent,
  ProductSearchResponse,
  ProductSearchVariant,
} from '@product-repos/contracts/product-search';
import { normalizeProductTypeName } from '@product-repos/contracts/text';
import {
  searchBrandProducts,
  searchProductTypes,
  searchProductVariants,
  type ProductVariantSearchRow,
} from '../repositories/product-search.repository';

const emptySearchResponse = (): ProductSearchResponse => ({
  productTypes: [],
  brandProducts: [],
  variants: [],
});

function buildVariants(rows: ProductVariantSearchRow[]): ProductSearchVariant[] {
  const variants = new Map<string, {
    id: string;
    name: string;
    brandName: string | null;
    productTypeName: string;
    contents: Map<string, ProductSearchContent>;
  }>();

  for (const row of rows) {
    const variant = variants.get(row.id) ?? {
      id: row.id,
      name: `${row.productName} — ${row.variantName}`,
      brandName: row.brandName,
      productTypeName: normalizeProductTypeName(row.productTypeName),
      contents: new Map<string, ProductSearchContent>(),
    };

    if (
      row.productSkuId !== null
      && row.unitContentId !== null
      && row.amount !== null
      && row.packagingTypeName !== null
      && row.unit !== null
      && row.unitsPerPackage !== null
    ) {
      variant.contents.set(row.productSkuId, {
        id: row.productSkuId,
        amount: row.amount,
        barcode: row.barcode,
        packagingTypeName: row.packagingTypeName,
        unit: row.unit,
        unitsPerPackage: row.unitsPerPackage,
      });
    }

    variants.set(row.id, variant);
  }

  return [...variants.values()].map((variant) => ({
    id: variant.id,
    name: variant.name,
    brandName: variant.brandName,
    productTypeName: variant.productTypeName,
    contents: [...variant.contents.values()],
  }));
}

export function getProductSearchResults(query: string | undefined): ProductSearchResponse {
  const normalizedQuery = query?.trim() ?? '';
  if (!normalizedQuery) return emptySearchResponse();

  const productTypes = searchProductTypes(normalizedQuery).map((productType) => ({
    ...productType,
    name: normalizeProductTypeName(productType.name),
    brandProductCount: Number(productType.brandProductCount),
  }));
  const brandProducts = searchBrandProducts(normalizedQuery).flatMap((brandProduct) => {
    if (brandProduct.brandId === null) return [];

    return [{
      brandId: brandProduct.brandId,
      productId: brandProduct.productId,
      productTypeId: brandProduct.productTypeId,
      productTypeName: normalizeProductTypeName(brandProduct.productTypeName),
      name: brandProduct.name,
      variantCount: Number(brandProduct.variantCount),
    }];
  });
  const variants = buildVariants(searchProductVariants(normalizedQuery));

  return { productTypes, brandProducts, variants };
}
