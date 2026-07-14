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
  productTypeId: 'type-1',
  name: "G'woon Cola",
  variantCount: 2,
}];

const variants: ProductVariantSearchRow[] = [
  {
    id: 'variant-1',
    productName: "G'woon Cola",
    variantName: 'Zero',
    unitContentId: 1,
    amount: 1,
    unit: 'L',
  },
  {
    id: 'variant-1',
    productName: "G'woon Cola",
    variantName: 'Zero',
    unitContentId: 2,
    amount: 1.5,
    unit: 'L',
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
        productTypeId: 'type-1',
        name: "G'woon Cola",
        variantCount: 2,
      }],
      variants: [{
        id: 'variant-1',
        name: "G'woon Cola — Zero",
        contents: [
          { amount: 1, unit: 'L' },
          { amount: 1.5, unit: 'L' },
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

  it('deduplicates contents by their database id', () => {
    variants.push({ ...variants[0]!, amount: 999 });

    const result = getProductSearchResults('cola');

    expect(result.variants[0]?.contents).toEqual([
      { amount: 999, unit: 'L' },
      { amount: 1.5, unit: 'L' },
    ]);
    variants.pop();
  });
});
