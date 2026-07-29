import type { CalorieTrackerProduct } from '../api/legacy-types';
import { ProductCard } from './ProductCard';

interface ProductListProps {
  products: CalorieTrackerProduct[];
}

export function ProductList({ products }: ProductListProps) {
  if (products.length === 0) {
    return <p style={{ color: '#777' }}>Geen producten gevonden.</p>;
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: '16px',
    }}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
