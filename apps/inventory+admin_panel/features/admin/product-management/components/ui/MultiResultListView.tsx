import type { ProductSearchResponse } from "@product-repos/contracts/product-search";
import ResultItem from "./ResultItem";

interface MultiResultListViewProps {
  query: string;
  result: ProductSearchResponse;
}

export default function MultiResultListView({
  query,
  result,
}: MultiResultListViewProps): React.ReactNode {
  return (
    <div className="lg:w-[20em] w-full flex flex-col gap-2 p-6 text-left">
      <h1>Producttype</h1>
      {result.productTypes.length > 0 ? (
        result.productTypes.map((item) => (
          <ResultItem key={item.id} title={item.name}>
            <p>{item.brandProductCount} merkproducten</p>
          </ResultItem>
        ))
      ) : (
        <>
          <ResultItem title="Geen producttypes gevonden." />
          <button className="bg-teal-600 p-2 text-white rounded-lg">
            + Maak "{query}" aan als producttype
          </button>
        </>
      )}

      {result.brandProducts.length > 0 && (
        <>
          <h1>Merkproducten</h1>
          {result.brandProducts.map((item) => (
            <ResultItem
              key={`${item.brandId}-${item.productTypeId}-${item.name}`}
              title={item.name}
            >
              <p>{item.variantCount} varianten</p>
            </ResultItem>
          ))}
        </>
      )}

      {result.variants.length > 0 && (
        <>
          <h1>Varianten</h1>
          {result.variants.map((item) => (
            <ResultItem key={item.id} title={item.name}>
              {item.contents.map((content) => (
                <span key={`${content.amount}-${content.unit}`}>
                  {content.amount}
                  {content.unit}
                </span>
              ))}
            </ResultItem>
          ))}
        </>
      )}
    </div>
  );
}
