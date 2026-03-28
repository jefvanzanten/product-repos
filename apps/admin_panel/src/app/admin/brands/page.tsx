'use client';

import SimpleEntityPage from '@/components/SimpleEntityPage';
import { api } from '@/lib/api';

export default function BrandsPage() {
  return (
    <SimpleEntityPage
      title="Merken"
      apiPath="/brands"
      fieldKey="name"
      fieldLabel="Naam"
      onFetch={() => api.brands.getAll() as Promise<{ id: number; name: string }[]>}
      onCreate={(name) => api.brands.create({ name })}
      onUpdate={(id, name) => api.brands.update(id, { name })}
      onDelete={(id) => api.brands.delete(id)}
    />
  );
}
