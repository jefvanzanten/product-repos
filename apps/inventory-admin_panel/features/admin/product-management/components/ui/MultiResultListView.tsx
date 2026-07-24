import type { ProductSearchResponse } from "@product-repos/contracts/product-search";
import { normalizeProductTypeName } from "@product-repos/contracts/text";
import { Form } from "react-router";
import {
  productManagementQueryParams,
  type SingleResultParamName,
} from "../../types";
import { buildProductManagementUrl } from "../../url";
import ResultItem from "./ResultItem";

interface MultiResultListViewProps {
  query: string;
  result: ProductSearchResponse;
}

export default function MultiResultListView({
  query,
  result,
}: MultiResultListViewProps): React.ReactNode {
  const productTypeName = normalizeProductTypeName(query);
  const resultUrl = (paramName: SingleResultParamName, value: string) =>
    buildProductManagementUrl({
      initialQuery: query,
      selectedParam: paramName,
      selectedQuery: value,
    });

  return (
    <div className="overflow-hidden rounded-lg bg-white text-left text-[#151515] shadow-sm">
      <SectionTitle>Producttype</SectionTitle>
      {result.productTypes.length > 0 ? (
        result.productTypes.map((item) => (
          <ResultItem
            key={item.id}
            title={item.name}
            to={resultUrl(productManagementQueryParams.brandProduct, item.name)}
          >
            <p>{item.brandProductCount} merkproducten</p>
          </ResultItem>
        ))
      ) : (
        <ResultItem title="Geen producttypes gevonden." />
      )}

      {result.brandProducts.length > 0 && (
        <>
          <SectionTitle>Merkproducten</SectionTitle>
          {result.brandProducts.map((item) => (
            <ResultItem
              key={`${item.brandId}-${item.productTypeId}-${item.name}`}
              title={item.name}
              to={resultUrl(productManagementQueryParams.brandProduct, item.name)}
            >
              <p>{item.variantCount} varianten</p>
            </ResultItem>
          ))}
        </>
      )}

      {result.variants.length > 0 && (
        <>
          <SectionTitle>Varianten</SectionTitle>
          {result.variants.map((item) => (
            <ResultItem
              key={item.id}
              title={item.name}
              to={resultUrl(productManagementQueryParams.variant, item.name)}
            >
              {item.contents.map((content) => (
                <span key={content.id}>
                  {content.amount} {content.unit}
                </span>
              ))}
            </ResultItem>
          ))}
        </>
      )}

      <Form className="p-3" method="post">
        <input name="intent" type="hidden" value="create-product-type" />
        <input name="name" type="hidden" value={productTypeName} />
        <button
          className="h-10 w-full rounded-md bg-[#209b7e] px-4 text-xs font-semibold text-white transition hover:bg-[#1b876e] disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!productTypeName}
          type="submit"
        >
          + Product aanmaken
        </button>
      </Form>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <h1 className="px-3 pb-1 pt-3 text-xs font-bold leading-5 text-[#151515]">
      {children}
    </h1>
  );
}
