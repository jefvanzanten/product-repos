'use client';

import SimpleEntityPage from '@/components/SimpleEntityPage';
import { api } from '@/lib/api';

export default function ConsumptionsPage() {
  return (
    <SimpleEntityPage
      title="Consumpties"
      apiPath="/consumptions"
      fieldKey="name"
      fieldLabel="Naam"
      onFetch={() => api.consumptions.getAll() as Promise<{ id: number; name: string }[]>}
      onCreate={(name) => api.consumptions.create({ name })}
      onUpdate={(id, name) => api.consumptions.update(id, { name })}
      onDelete={(id) => api.consumptions.delete(id)}
    />
  );
}
