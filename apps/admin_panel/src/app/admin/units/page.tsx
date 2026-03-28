'use client';

import SimpleEntityPage from '@/components/SimpleEntityPage';
import { api } from '@/lib/api';

export default function UnitsPage() {
  return (
    <SimpleEntityPage
      title="Eenheden"
      apiPath="/units"
      fieldKey="type"
      fieldLabel="Type"
      onFetch={() => api.units.getAll() as Promise<{ id: number; type: string }[]>}
      onCreate={(type) => api.units.create({ type })}
      onUpdate={(id, type) => api.units.update(id, { type })}
      onDelete={(id) => api.units.delete(id)}
    />
  );
}
