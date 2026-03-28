'use client';

import { useEffect, useState } from 'react';
import type { Brand, Consumption, ProductWithRelations, UnitType } from '@product-repos/contracts';
import { api } from '@/lib/api';
import AutocompleteInput from '@/components/AutocompleteInput';

interface ProductForm {
  brandId: number | '';
  consumptionsId: number | '';
  servingContent: number | '';
  servingUnitId: number | '';
  content: number | '';
  contentunitId: number | '';
}

const emptyForm: ProductForm = {
  brandId: '',
  consumptionsId: '',
  servingContent: '',
  servingUnitId: '',
  content: '',
  contentunitId: '',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [units, setUnits] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editing?: ProductWithRelations }>({ open: false });
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [p, b, c, u] = await Promise.all([
        api.products.getAll(),
        api.brands.getAll(),
        api.consumptions.getAll(),
        api.units.getAll(),
      ]);
      setProducts(p);
      setBrands(b);
      setConsumptions(c);
      setUnits(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij laden');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setModal({ open: true });
  }

  function openEdit(product: ProductWithRelations) {
    setForm({
      brandId: product.brandId,
      consumptionsId: product.consumptionsId,
      servingContent: product.servingContent,
      servingUnitId: product.servingUnitId,
      content: product.content,
      contentunitId: product.contentunitId,
    });
    setModal({ open: true, editing: product });
  }

  function setField(key: keyof ProductForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value === '' ? '' : Number(value),
    }));
  }

  async function handleSave() {
    if (
      form.brandId === '' ||
      form.consumptionsId === '' ||
      form.servingContent === '' ||
      form.servingUnitId === '' ||
      form.content === '' ||
      form.contentunitId === ''
    ) {
      setError('Vul alle velden in');
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      brandId: form.brandId as number,
      consumptionsId: form.consumptionsId as number,
      servingContent: form.servingContent as number,
      servingUnitId: form.servingUnitId as number,
      content: form.content as number,
      contentunitId: form.contentunitId as number,
    };
    try {
      if (modal.editing) {
        await api.products.update(modal.editing.id, body);
      } else {
        await api.products.create(body);
      }
      setModal({ open: false });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Weet je zeker dat je dit product wilt verwijderen?')) return;
    try {
      await api.products.delete(id);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij verwijderen');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Producten</h1>
        <button onClick={openAdd} className="btn-primary">+ Toevoegen</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p style={{ color: '#64748b' }}>Laden...</p>
      ) : (
        <div className="table-wrap">
          {products.length === 0 ? (
            <div className="empty">Geen producten gevonden.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>ID</th>
                  <th>Merk</th>
                  <th>Consumptie</th>
                  <th>Portie</th>
                  <th>Inhoud</th>
                  <th style={{ width: '160px' }}>Acties</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.brand?.name ?? '—'}</td>
                    <td>{p.consumption?.name ?? '—'}</td>
                    <td>{p.servingContent} {p.servingUnit?.type ?? ''}</td>
                    <td>{p.content} {p.contentUnit?.type ?? ''}</td>
                    <td>
                      <button onClick={() => openEdit(p)} className="btn-sm">Bewerken</button>
                      <button onClick={() => handleDelete(p.id)} className="btn-sm btn-danger">Verwijderen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal.open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal({ open: false })}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <h2>{modal.editing ? 'Product bewerken' : 'Product toevoegen'}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <AutocompleteInput
                label="Merk"
                options={brands.map((b) => ({ id: b.id, label: b.name }))}
                value={form.brandId}
                onChange={(id) => setForm((prev) => ({ ...prev, brandId: id }))}
              />

              <AutocompleteInput
                label="Consumptie"
                options={consumptions.map((c) => ({ id: c.id, label: c.name }))}
                value={form.consumptionsId}
                onChange={(id) => setForm((prev) => ({ ...prev, consumptionsId: id }))}
              />

              <div className="form-group">
                <label>Portie hoeveelheid</label>
                <input className="input" type="number" min="0" value={form.servingContent} onChange={(e) => setField('servingContent', e.target.value)} />
              </div>

              <div className="form-group">
                <label>Portie eenheid</label>
                <select className="select" value={form.servingUnitId} onChange={(e) => setField('servingUnitId', e.target.value)}>
                  <option value="">Selecteer...</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.type}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Inhoud hoeveelheid</label>
                <input className="input" type="number" min="0" value={form.content} onChange={(e) => setField('content', e.target.value)} />
              </div>

              <div className="form-group">
                <label>Inhoud eenheid</label>
                <select className="select" value={form.contentunitId} onChange={(e) => setField('contentunitId', e.target.value)}>
                  <option value="">Selecteer...</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.type}</option>)}
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setModal({ open: false })} className="btn-sm">Annuleren</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
