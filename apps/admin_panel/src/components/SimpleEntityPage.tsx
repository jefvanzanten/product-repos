'use client';

import { useEffect, useState } from 'react';

interface Entity {
  id: number;
  [key: string]: unknown;
}

interface SimpleEntityPageProps {
  title: string;
  apiPath: string;
  fieldKey: string;
  fieldLabel: string;
  onFetch: () => Promise<Entity[]>;
  onCreate: (value: string) => Promise<unknown>;
  onUpdate: (id: number, value: string) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
}

export default function SimpleEntityPage({
  title,
  fieldKey,
  fieldLabel,
  onFetch,
  onCreate,
  onUpdate,
  onDelete,
}: SimpleEntityPageProps) {
  const [items, setItems] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editing?: Entity }>({ open: false });
  const [fieldValue, setFieldValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await onFetch());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij laden');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setFieldValue('');
    setModal({ open: true });
  }

  function openEdit(item: Entity) {
    setFieldValue(String(item[fieldKey] ?? ''));
    setModal({ open: true, editing: item });
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (modal.editing) {
        await onUpdate(modal.editing.id, fieldValue);
      } else {
        await onCreate(fieldValue);
      }
      setModal({ open: false });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij opslaan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Weet je zeker dat je dit wilt verwijderen?')) return;
    try {
      await onDelete(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij verwijderen');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
        <button onClick={openAdd} className="btn-primary">+ Toevoegen</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p style={{ color: '#64748b' }}>Laden...</p>
      ) : (
        <div className="table-wrap">
          {items.length === 0 ? (
            <div className="empty">Geen items gevonden.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>{fieldLabel}</th>
                  <th style={{ width: '160px' }}>Acties</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{String(item[fieldKey] ?? '')}</td>
                    <td>
                      <button onClick={() => openEdit(item)} className="btn-sm">Bewerken</button>
                      <button onClick={() => handleDelete(item.id)} className="btn-sm btn-danger">Verwijderen</button>
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
          <div className="modal">
            <h2>{modal.editing ? `${title.slice(0, -1)} bewerken` : `${title.slice(0, -1)} toevoegen`}</h2>
            <div className="form-group">
              <label>{fieldLabel}</label>
              <input
                className="input"
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
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
