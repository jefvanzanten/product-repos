import { useState } from 'react';
import { ConsumptionFilter } from '../components/ConsumptionFilter';
import { ProductList } from '../components/ProductList';
import { useBrands } from '../hooks/useBrands';
import { useConsumptions } from '../hooks/useConsumptions';
import { useProducts } from '../hooks/useProducts';

export function Dashboard() {
  const { products, loading: loadingProducts, error: errorProducts } = useProducts();
  const { consumptions, loading: loadingConsumptions } = useConsumptions();
  const { brands, loading: loadingBrands } = useBrands();

  const [selectedConsumptionId, setSelectedConsumptionId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  const filtered = products.filter((p) => {
    if (selectedConsumptionId !== null && p.consumptionsId !== selectedConsumptionId) return false;
    if (selectedBrandId !== null && p.brandId !== selectedBrandId) return false;
    return true;
  });

  const isLoading = loadingProducts || loadingConsumptions || loadingBrands;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ marginBottom: '24px' }}>Consumption Logger</h1>

      {isLoading && <p>Laden...</p>}
      {errorProducts && <p style={{ color: 'red' }}>Fout: {errorProducts}</p>}

      {!isLoading && (
        <>
          <ConsumptionFilter
            consumptions={consumptions}
            brands={brands}
            selectedConsumptionId={selectedConsumptionId}
            selectedBrandId={selectedBrandId}
            onConsumptionChange={setSelectedConsumptionId}
            onBrandChange={setSelectedBrandId}
          />
          <div style={{ marginTop: '24px' }}>
            <ProductList products={filtered} />
          </div>
        </>
      )}
    </div>
  );
}
