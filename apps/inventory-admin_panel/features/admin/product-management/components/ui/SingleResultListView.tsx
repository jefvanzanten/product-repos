import type { UnitType } from "@product-repos/contracts";
import type { ProductSearchResponse } from "@product-repos/contracts/product-search";
import { Link } from "react-router";
import {
  productManagementQueryParams,
  type PackagingType,
  type SingleResultParamName,
} from "../../types";
import { buildProductManagementUrl } from "../../url";
import CreateChildModal, { type CreateChildContext } from "./CreateChildModal";
import ResultItem from "./ResultItem";

interface SingleResultListViewProps {
  backUrl?: string;
  initialQuery?: string;
  packagingTypes: PackagingType[];
  query: string;
  result?: ProductSearchResponse;
  selectedParam: SingleResultParamName;
  unitTypes: UnitType[];
}

export default function SingleResultListView({
  backUrl,
  initialQuery,
  packagingTypes,
  query,
  result,
  selectedParam,
  unitTypes,
}: SingleResultListViewProps): React.ReactNode {
  const rootQuery = initialQuery || query;
  const productType = result?.productTypes[0];
  const brandProduct = result?.brandProducts[0];
  const variant = result?.variants[0];
  const selectedResult = getSelectedResult({
    brandProduct,
    productType,
    selectedParam,
    variant,
  });
  const createContext = getCreateContext({
    brandProduct,
    brandProducts: result?.brandProducts ?? [],
    productType,
    selectedParam,
    packagingTypes,
    unitTypes,
    variant,
  });
  const emptyMessage = `Geen ${getResultLabel(selectedParam)} gevonden.`;
  const selectedBrandProductParam =
    selectedParam === productManagementQueryParams.brandProduct
    || selectedParam === productManagementQueryParams.brandProductAlias;
  const headerTitle = getHeaderTitle({ brandProduct, productType, query, variant });
  const resolvedBackUrl = backUrl ?? buildProductManagementUrl({ initialQuery: rootQuery });

  if (selectedBrandProductParam && productType) {
    const brandProducts = result?.brandProducts.filter(
      (item) => item.productTypeId === productType.id,
    ) ?? [];

    return (
      <ResultCard backUrl={resolvedBackUrl} title={productType.name}>
        <SectionTitle>Merkproducten</SectionTitle>
        {brandProducts.length > 0 ? (
          brandProducts.map((item) => (
            <ResultItem
              key={item.productId}
              title={item.name}
              to={buildProductManagementUrl({
                initialQuery: rootQuery,
                previousParam: selectedParam,
                previousQuery: query,
                selectedParam: productManagementQueryParams.variant,
                selectedQuery: item.name,
              })}
            >
              <p>{item.variantCount} varianten</p>
            </ResultItem>
          ))
        ) : (
          <ResultItem title="Geen merken gevonden." />
        )}
        {createContext && <CreateChildModal context={createContext} />}
      </ResultCard>
    );
  }

  if (selectedBrandProductParam && brandProduct) {
    const variants = result?.variants ?? [];

    return (
      <ResultCard backUrl={resolvedBackUrl} title={brandProduct.name}>
        <SectionTitle>Varianten</SectionTitle>
        {variants.length > 0 ? (
          variants.map((item) => (
            <ResultItem
              key={item.id}
              title={item.name}
              to={buildProductManagementUrl({
                initialQuery: rootQuery,
                previousParam: selectedParam,
                previousQuery: query,
                selectedParam: productManagementQueryParams.variant,
                selectedQuery: item.name,
              })}
            >
              {item.contents.map((content) => (
                <span key={content.id}>
                  {content.amount} {content.unit}
                </span>
              ))}
            </ResultItem>
          ))
        ) : (
          <ResultItem title="Geen varianten gevonden.">
            <p>{brandProduct.name}</p>
          </ResultItem>
        )}
        {createContext && <CreateChildModal context={createContext} />}
      </ResultCard>
    );
  }

  return (
    <ResultCard backUrl={resolvedBackUrl} title={headerTitle}>
      {selectedResult ? (
        <>
          {selectedResult.item}
          {createContext && <CreateChildModal context={createContext} />}
        </>
      ) : (
        <>
          <ResultItem title={emptyMessage}>
            <p>{query}</p>
          </ResultItem>
          {createContext && <CreateChildModal context={createContext} />}
        </>
      )}
    </ResultCard>
  );
}

function ResultCard({
  backUrl,
  children,
  title,
}: {
  backUrl: string;
  children: React.ReactNode;
  title: string;
}): React.ReactNode {
  return (
    <div className="overflow-hidden rounded-lg bg-white text-left text-[#151515] shadow-sm">
      <div className="flex items-center gap-2 px-3 py-3 text-xs text-[#151515]">
        <Link aria-label="Terug" className="text-lg leading-none" to={backUrl}>
          ←
        </Link>
        <span className="truncate font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <h1 className="px-3 pb-1 text-xs font-bold leading-5 text-[#151515]">
      {children}
    </h1>
  );
}

interface CreateContextInput extends SelectedResultInput {
  brandProducts: ProductSearchResponse["brandProducts"];
  packagingTypes: PackagingType[];
  unitTypes: UnitType[];
}

function getCreateContext({
  brandProduct,
  brandProducts,
  productType,
  packagingTypes,
  selectedParam,
  unitTypes,
  variant,
}: CreateContextInput): CreateChildContext | undefined {
  const selectedBrandProductParam =
    selectedParam === productManagementQueryParams.brandProduct
    || selectedParam === productManagementQueryParams.brandProductAlias;

  if (
    productType
    && (
      selectedParam === productManagementQueryParams.productType
      || selectedBrandProductParam
    )
  ) {
    return {
      existingBrandNames: brandProducts
        .filter((item) => item.productTypeId === productType.id)
        .map((item) => item.name),
      kind: "brandProduct",
      productTypeId: productType.id,
      productTypeName: productType.name,
    };
  }

  if (selectedBrandProductParam && brandProduct) {
    return {
      kind: "variant",
      productId: brandProduct.productId,
    };
  }

  if (selectedParam === productManagementQueryParams.variant && variant) {
    return {
      kind: "execution",
      packagingTypes,
      unitTypes,
      variantId: variant.id,
    };
  }

  if (selectedParam === productManagementQueryParams.variant && brandProduct) {
    return {
      kind: "variant",
      productId: brandProduct.productId,
    };
  }

  return undefined;
}

interface SelectedResultInput {
  brandProduct: ProductSearchResponse["brandProducts"][number] | undefined;
  productType: ProductSearchResponse["productTypes"][number] | undefined;
  selectedParam: SingleResultParamName;
  variant: ProductSearchResponse["variants"][number] | undefined;
}

function getSelectedResult({
  brandProduct,
  productType,
  selectedParam,
  variant,
}: SelectedResultInput):
  | { title: string; item: React.ReactNode }
  | undefined {
  if (selectedParam === productManagementQueryParams.productType && productType) {
    return {
      title: productType.name,
      item: (
        <>
          <SectionTitle>Producttype</SectionTitle>
          <ResultItem title={productType.name}>
            <p>{productType.brandProductCount} merkproducten</p>
          </ResultItem>
        </>
      ),
    };
  }

  if (
    (selectedParam === productManagementQueryParams.brandProduct
      || selectedParam === productManagementQueryParams.brandProductAlias)
    && brandProduct
  ) {
    return {
      title: brandProduct.name,
      item: (
        <>
          <SectionTitle>Merkproduct</SectionTitle>
          <ResultItem title={brandProduct.name}>
            <p>{brandProduct.variantCount} varianten</p>
          </ResultItem>
        </>
      ),
    };
  }

  if (selectedParam === productManagementQueryParams.variant && variant) {
    const hasContents = variant.contents.length > 0;

    return {
      title: variant.name,
      item: (
        <>
          <SectionTitle>Uitvoeringen</SectionTitle>
          {hasContents ? (
            variant.contents.map((content) => (
              <ResultItem
                key={content.id}
                title={`${content.amount} ${content.unit}`}
              >
                <p>
                  {content.unitsPerPackage} x {content.packagingTypeName}
                </p>
              </ResultItem>
            ))
          ) : (
            <ResultItem title="Geen uitvoering gevonden." />
          )}
        </>
      ),
    };
  }

  return undefined;
}

function getHeaderTitle({
  brandProduct,
  productType,
  query,
  variant,
}: {
  brandProduct: ProductSearchResponse["brandProducts"][number] | undefined;
  productType: ProductSearchResponse["productTypes"][number] | undefined;
  query: string;
  variant: ProductSearchResponse["variants"][number] | undefined;
}): string {
  return variant?.name ?? brandProduct?.name ?? productType?.name ?? query;
}

function getResultLabel(selectedParam: SingleResultParamName): string {
  if (
    selectedParam === productManagementQueryParams.brandProduct
    || selectedParam === productManagementQueryParams.brandProductAlias
  ) {
    return "merkproducten";
  }

  if (selectedParam === productManagementQueryParams.variant) {
    return "uitvoering";
  }

  return "producttypes";
}
