import type { Brand } from '@product-repos/contracts';
import type { Consumption } from '../api/client';

interface ConsumptionFilterProps {
  consumptions: Consumption[];
  brands: Brand[];
  selectedConsumptionId: number | null;
  selectedBrandId: number | null;
  onConsumptionChange: (id: number | null) => void;
  onBrandChange: (id: number | null) => void;
}

export function ConsumptionFilter({
  consumptions,
  brands,
  selectedConsumptionId,
  selectedBrandId,
  onConsumptionChange,
  onBrandChange,
}: ConsumptionFilterProps) {
  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.875rem' }}>
        Categorie
        <select
          value={selectedConsumptionId ?? ''}
          onChange={(e) => onConsumptionChange(e.target.value === '' ? null : Number(e.target.value))}
          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">Alle</option>
          {consumptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.875rem' }}>
        Merk
        <select
          value={selectedBrandId ?? ''}
          onChange={(e) => onBrandChange(e.target.value === '' ? null : Number(e.target.value))}
          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">Alle</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
