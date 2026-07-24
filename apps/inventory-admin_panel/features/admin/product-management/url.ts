import {
  productManagementQueryParams,
  type SingleResultParamName,
} from "./types";

interface ProductManagementUrlInput {
  initialQuery?: string;
  previousParam?: SingleResultParamName;
  previousQuery?: string;
  selectedParam?: SingleResultParamName;
  selectedQuery?: string;
}

function buildProductManagementUrl({
  initialQuery,
  previousParam,
  previousQuery,
  selectedParam,
  selectedQuery,
}: ProductManagementUrlInput): string {
  const searchParams = new URLSearchParams();

  if (initialQuery) {
    searchParams.set(productManagementQueryParams.search, initialQuery);
  }

  if (selectedParam && selectedQuery) {
    searchParams.set(selectedParam, selectedQuery);
  }

  if (previousParam && previousQuery) {
    searchParams.set(productManagementQueryParams.previousParam, previousParam);
    searchParams.set(productManagementQueryParams.previousQuery, previousQuery);
  }

  const queryString = searchParams.toString();

  return queryString
    ? `/admin/product-management?${queryString}`
    : "/admin/product-management";
}

export { buildProductManagementUrl };
