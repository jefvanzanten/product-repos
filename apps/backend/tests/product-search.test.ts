import { describe, expect, it, mock } from 'bun:test';
import type {
  BrandProductSearchRow,
  ProductTypeSearchRow,
  ProductVariantSearchRow,
} from '../src/repositories/product-search.repository';

const queries: string[] = [];

const productTypes: ProductTypeSearchRow[] = [{
  id: 'type-1',
  name: 'Cola',
  brandProductCount: 2,
}];

const brandProducts: BrandProductSearchRow[] = [{
  brandId: 'brand-1',
  productId: 'product-1',
  productTypeId: 'type-1',
  productTypeName: 'Cola',
  name: "G'woon Cola",
  variantCount: 2,
}];

const variants: ProductVariantSearchRow[] = [
  {
    id: 'variant-1',
    productName: "G'woon Cola",
    brandName: "G'woon",
    productTypeName: 'Cola',
    variantName: 'Zero',
    productSkuId: 'sku-1',
    unitContentId: 1,
    amount: 1,
    barcode: null,
    packagingTypeName: 'Fles',
    unit: 'L',
    unitsPerPackage: 1,
  },
  {
    id: 'variant-1',
    productName: "G'woon Cola",
    brandName: "G'woon",
    productTypeName: 'Cola',
    variantName: 'Zero',
    productSkuId: 'sku-2',
    unitContentId: 2,
    amount: 1.5,
    barcode: '1234567890123',
    packagingTypeName: 'Fles',
    unit: 'L',
    unitsPerPackage: 6,
  },
];

await mock.module('../src/repositories/product-search.repository', () => ({
  searchProductTypes: (query: string) => {
    queries.push(`types:${query}`);
    return productTypes;
  },
  searchBrandProducts: (query: string) => {
    queries.push(`brands:${query}`);
    return brandProducts;
  },
  searchProductVariants: (query: string) => {
    queries.push(`variants:${query}`);
    return variants;
  },
}));

const { getProductSearchResults } = await import('../src/services/product-search.service');

describe('product search service', () => {
  it('returns the screen-oriented response using exactly three queries', () => {
    queries.length = 0;

    expect(getProductSearchResults('  cola  ')).toEqual({
      productTypes,
      brandProducts: [{
        brandId: 'brand-1',
        productId: 'product-1',
        productTypeId: 'type-1',
        productTypeName: 'Cola',
        name: "G'woon Cola",
        variantCount: 2,
      }],
      variants: [{
        id: 'variant-1',
        name: "G'woon Cola — Zero",
        brandName: "G'woon",
        productTypeName: 'Cola',
        contents: [
          {
            id: 'sku-1',
            amount: 1,
            barcode: null,
            packagingTypeName: 'Fles',
            unit: 'L',
            unitsPerPackage: 1,
          },
          {
            id: 'sku-2',
            amount: 1.5,
            barcode: '1234567890123',
            packagingTypeName: 'Fles',
            unit: 'L',
            unitsPerPackage: 6,
          },
        ],
      }],
    });
    expect(queries).toEqual(['types:cola', 'brands:cola', 'variants:cola']);
  });

  it('does not query the database for an empty query', () => {
    queries.length = 0;

    expect(getProductSearchResults('   ')).toEqual({
      productTypes: [],
      brandProducts: [],
      variants: [],
    });
    expect(queries).toEqual([]);
  });

  it('deduplicates contents by their sku id', () => {
    variants.push({ ...variants[0]!, amount: 999 });

    const result = getProductSearchResults('cola');

    expect(result.variants[0]?.contents).toEqual([
      {
        id: 'sku-1',
        amount: 999,
        barcode: null,
        packagingTypeName: 'Fles',
        unit: 'L',
        unitsPerPackage: 1,
      },
      {
        id: 'sku-2',
        amount: 1.5,
        barcode: '1234567890123',
        packagingTypeName: 'Fles',
        unit: 'L',
        unitsPerPackage: 6,
      },
    ]);
    variants.pop();
  });
});
