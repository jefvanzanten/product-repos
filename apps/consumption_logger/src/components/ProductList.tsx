import type { ProductWithRelations } from '@product-repos/contracts';
import { ProductCard } from './ProductCard';

interface ProductListProps {
  products: ProductWithRelations[];
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
