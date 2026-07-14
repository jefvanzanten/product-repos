import type {
  ProductSearchContent,
  ProductSearchResponse,
  ProductSearchVariant,
} from '@product-repos/contracts/product-search';
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
    contents: Map<number, ProductSearchContent>;
  }>();

  for (const row of rows) {
    const variant = variants.get(row.id) ?? {
      id: row.id,
      name: `${row.productName} — ${row.variantName}`,
      contents: new Map<number, ProductSearchContent>(),
    };

    if (
      row.unitContentId !== null
      && row.amount !== null
      && row.unit !== null
    ) {
      variant.contents.set(row.unitContentId, {
        amount: row.amount,
        unit: row.unit,
      });
    }

    variants.set(row.id, variant);
  }

  return [...variants.values()].map((variant) => ({
    id: variant.id,
    name: variant.name,
    contents: [...variant.contents.values()],
  }));
}

export function getProductSearchResults(query: string | undefined): ProductSearchResponse {
  const normalizedQuery = query?.trim() ?? '';
  if (!normalizedQuery) return emptySearchResponse();

  const productTypes = searchProductTypes(normalizedQuery).map((productType) => ({
    ...productType,
    brandProductCount: Number(productType.brandProductCount),
  }));
  const brandProducts = searchBrandProducts(normalizedQuery).flatMap((brandProduct) => {
    if (brandProduct.brandId === null) return [];

    return [{
      brandId: brandProduct.brandId,
      productTypeId: brandProduct.productTypeId,
      name: brandProduct.name,
      variantCount: Number(brandProduct.variantCount),
    }];
  });
  const variants = buildVariants(searchProductVariants(normalizedQuery));

  return { productTypes, brandProducts, variants };
}
