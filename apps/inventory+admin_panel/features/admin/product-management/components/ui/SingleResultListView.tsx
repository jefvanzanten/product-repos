import type { ProductSearchResponse } from "@product-repos/contracts/product-search";
import ResultItem from "./ResultItem";

interface SingleResultListViewProps {
  result: ProductSearchResponse;
}

export default function SingleResultListView({
  result,
}: SingleResultListViewProps): React.ReactNode {
  const productType = result.productTypes[0];
  const brandProduct = result.brandProducts[0];
  const variant = result.variants[0];

  return (
    <div className="lg:w-[20em] w-full flex flex-col gap-2 p-6 text-left">
      {productType && (
        <>
          <h1>Producttype</h1>
          <ResultItem title={productType.name}>
            <p>{productType.brandProductCount} merkproducten</p>
          </ResultItem>
        </>
      )}

      {brandProduct && (
        <>
          <h1>Merkproduct</h1>
          <ResultItem title={brandProduct.name}>
            <p>{brandProduct.variantCount} varianten</p>
          </ResultItem>
        </>
      )}

      {variant && (
        <>
          <h1>Variant</h1>
          <ResultItem title={variant.name}>
            {variant.contents.map((content) => (
              <span key={`${content.amount}-${content.unit}`}>
                {content.amount}
                {content.unit}
              </span>
            ))}
          </ResultItem>
        </>
      )}
    </div>
  );
}
