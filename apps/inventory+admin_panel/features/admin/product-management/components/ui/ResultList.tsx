import ResultItem from "./ProductTypeResults";
import ProductTypeResults from "./ProductTypeResults";

type ProductVariant = {
  name: string;
  sizes: UnitContent[];
};

type BrandProduct = {
  name: string;
  productVariant: ProductVariant[];
};

type UnitContent = {
  unitType: string;
  quantity: string;
};

type ProductTypeResult = {
  productType: string;
  brandProducts: BrandProduct[];
};

//
type BrandProductResult = {
  brand: string;
  productVariants: ProductVariant[];
};

type ProductVariantResult = {
  productVariant: string;
  sizes: UnitContent[];
};

interface ResultListProps {
  ptr: ProductTypeResult[] | null;
  bpr: BrandProductResult[] | null;
  pvr: ProductVariantResult[] | null;
}

export type {
  ProductVariant,
  BrandProduct,
  UnitContent,
  ProductTypeResult,
  BrandProductResult,
  ProductVariantResult,
};

export default function ResultList({
  ptr,
  bpr,
  pvr,
}: ResultListProps): React.ReactNode {
  return (
    <div>
      <h1>Producttype</h1>
      {ptr ? (
        ptr?.map((result) => (
          <ResultItem title={result.productType}>
            <p>{result.brandProducts.length} Merkproducten</p>
          </ResultItem>
        ))
      ) : (
        <div>Empty, voeg toe?</div>
      )}

      <h1>Merkproducten</h1>
      {bpr?.map((result) => (
        <ResultItem title={result.brand}>
          <p>{result.productVariants.length} Varianten</p>
        </ResultItem>
      ))}

      <h1>Varianten</h1>
      {pvr?.map((result) => (
        <div>
          <div>
            <h2>{result.productVariant}</h2>
            {result.sizes.map((unitContent) => (
              <span>
                {unitContent.quantity}
                {unitContent.unitType}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
