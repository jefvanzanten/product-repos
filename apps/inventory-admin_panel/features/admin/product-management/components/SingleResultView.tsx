import type { UnitType } from "@product-repos/contracts";
import type { ProductSearchResponse } from "@product-repos/contracts/product-search";
import {
  productManagementQueryParams,
  type PackagingType,
  type SingleResultParamName,
} from "../types";
import { buildProductManagementUrl } from "../url";
import SingleResultListView from "./ui/SingleResultListView";

interface SingleResultViewProps {
  initialQuery: string;
  packagingTypes: PackagingType[];
  previousParam?: SingleResultParamName;
  previousQuery?: string;
  query: string;
  result?: ProductSearchResponse;
  selectedParam: SingleResultParamName;
  unitTypes: UnitType[];
}

export default function SingleResultView({
  initialQuery,
  packagingTypes,
  previousParam,
  previousQuery,
  query,
  result,
  selectedParam,
  unitTypes,
}: SingleResultViewProps): React.ReactNode {
  const backUrl = getBackUrl({
    initialQuery,
    previousParam,
    previousQuery,
    query,
    result,
    selectedParam,
  });

  return (
    <section className="flex flex-1 flex-col pb-4">
      <SingleResultListView
        backUrl={backUrl}
        initialQuery={initialQuery}
        packagingTypes={packagingTypes}
        query={query}
        result={result}
        selectedParam={selectedParam}
        unitTypes={unitTypes}
      />
    </section>
  );
}

function getBackUrl({
  initialQuery,
  previousParam,
  previousQuery,
  query,
  result,
  selectedParam,
}: {
  initialQuery: string;
  previousParam?: SingleResultParamName;
  previousQuery?: string;
  query: string;
  result?: ProductSearchResponse;
  selectedParam: SingleResultParamName;
}): string {
  const rootQuery = initialQuery || query;

  if (previousParam && previousQuery) {
    return buildProductManagementUrl({
      initialQuery: rootQuery,
      selectedParam: previousParam,
      selectedQuery: previousQuery,
    });
  }

  if (initialQuery) {
    return buildProductManagementUrl({
      initialQuery,
    });
  }

  if (selectedParam === productManagementQueryParams.variant) {
    const brandProductName = result?.brandProducts[0]?.name;

    if (brandProductName) {
      return buildProductManagementUrl({
        initialQuery: rootQuery,
        selectedParam: productManagementQueryParams.brandProduct,
        selectedQuery: brandProductName,
      });
    }
  }

  return buildProductManagementUrl({
    initialQuery: rootQuery,
  });
}
