import type { ProductWithRelations } from '@product-repos/contracts';
import { BrandBadge } from './BrandBadge';

interface ProductCardProps {
  product: ProductWithRelations;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      backgroundColor: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Product #{product.id}</h3>
        <BrandBadge name={product.brand?.name ?? '—'} />
      </div>
      <div style={{ fontSize: '0.875rem', color: '#555' }}>
        <div>Serving: {product.servingContent} {product.servingUnit?.type ?? '—'}</div>
        <div>Content: {product.content} {product.contentUnit?.type ?? '—'}</div>
      </div>
    </div>
  );
}
