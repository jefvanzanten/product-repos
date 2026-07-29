import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CalorieTrackerProduct } from '../api/legacy-types';
import { api } from '../api/client';
import { useUnits } from '../hooks/useUnits';

interface Props {
  onClose: () => void;
  products: CalorieTrackerProduct[];
  onSuccess: () => void;
}

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface FormErrors {
  product?: string;
  amount?: string;
  unit?: string;
}

export function AddConsumptionLogModal({ onClose, products, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const { units } = useUnits();

  const [productId, setProductId] = useState<number | ''>('');
  const [productInput, setProductInput] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [amount, setAmount] = useState('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [timestamp, setTimestamp] = useState(toLocalDatetimeValue(new Date()));
  const [errors, setErrors] = useState<FormErrors>({});
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const productOptions = products.map((p) => ({
    id: p.id,
    label: `Product #${p.id} – ${p.brand?.name ?? '—'} (${p.servingContent} ${p.servingUnit?.type ?? ''})`,
  }));

  const filteredOptions = productInput.length === 0
    ? []
    : productOptions.filter((o) => o.label.toLowerCase().includes(productInput.toLowerCase()));

  // Close autocomplete on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const mutation = useMutation({
    mutationFn: api.consumptionLogs.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumption-logs'] });
      onSuccess();
      onClose();
    },
  });

  function handleProductInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setProductInput(val);
    setProductId('');
    setHighlightedIndex(-1);
    setDropdownOpen(true);
    if (errors.product) setErrors((prev) => ({ ...prev, product: undefined }));
  }

  function handleProductSelect(option: { id: number; label: string }) {
    setProductId(option.id);
    setProductInput(option.label);
    setDropdownOpen(false);
    setHighlightedIndex(-1);
    setErrors((prev) => ({ ...prev, product: undefined }));
  }

  function handleProductKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropdownOpen || filteredOptions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(highlightedIndex + 1, filteredOptions.length - 1);
      setHighlightedIndex(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(highlightedIndex - 1, 0);
      setHighlightedIndex(prev);
      listRef.current?.children[prev]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const highlightedOption = filteredOptions[highlightedIndex];
      if (highlightedOption) handleProductSelect(highlightedOption);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (productId === '') newErrors.product = 'Kies een product';
    if (amount === '' || Number(amount) <= 0) newErrors.amount = 'Voer een geldige hoeveelheid in';
    if (unitId === '') newErrors.unit = 'Kies een eenheid';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      productId: productId as number,
      amount: Number(amount),
      unitsId: unitId as number,
      timestamp: new Date(timestamp).toISOString(),
    });
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '28px',
        width: '100%', maxWidth: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1.2rem' }}>Consumptie toevoegen</h2>

        <form onSubmit={handleSubmit} noValidate>
          {/* Product autocomplete */}
          <div style={{ marginBottom: '16px' }} ref={autocompleteRef}>
            <label style={labelStyle}>Product</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, borderColor: errors.product ? '#dc2626' : '#cbd5e1' }}
                value={productInput}
                onChange={handleProductInput}
                onKeyDown={handleProductKeyDown}
                onFocus={() => productInput.length > 0 && setDropdownOpen(true)}
                autoComplete="off"
                placeholder="Zoek op productnaam..."
              />
              {dropdownOpen && filteredOptions.length > 0 && (
                <ul ref={listRef} style={dropdownStyle}>
                  {filteredOptions.map((option, i) => (
                    <li
                      key={option.id}
                      onMouseDown={() => handleProductSelect(option)}
                      style={{
                        ...dropdownItemStyle,
                        background: i === highlightedIndex ? '#f1f5f9' : option.id === productId ? '#eff6ff' : 'white',
                      }}
                    >
                      {option.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {errors.product && <p style={errorStyle}>{errors.product}</p>}
          </div>

          {/* Amount + unit */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Hoeveelheid</label>
              <input
                type="number"
                min="0"
                style={{ ...inputStyle, borderColor: errors.amount ? '#dc2626' : '#cbd5e1' }}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                placeholder="bijv. 250"
              />
              {errors.amount && <p style={errorStyle}>{errors.amount}</p>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Eenheid</label>
              <select
                style={{ ...inputStyle, borderColor: errors.unit ? '#dc2626' : '#cbd5e1' }}
                value={unitId}
                onChange={(e) => {
                  setUnitId(e.target.value === '' ? '' : Number(e.target.value));
                  if (errors.unit) setErrors((prev) => ({ ...prev, unit: undefined }));
                }}
              >
                <option value="">—</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.type}</option>
                ))}
              </select>
              {errors.unit && <p style={errorStyle}>{errors.unit}</p>}
            </div>
          </div>

          {/* Datum / tijd */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Datum en tijd</label>
            <input
              type="datetime-local"
              style={inputStyle}
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
            />
          </div>

          {mutation.isError && (
            <p style={{ ...errorStyle, marginBottom: '12px' }}>
              {(mutation.error as Error).message}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>
              Annuleren
            </button>
            <button type="submit" disabled={mutation.isPending} style={submitBtnStyle}>
              {mutation.isPending ? 'Opslaan...' : 'Voeg toe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '4px',
  fontSize: '14px', fontWeight: 500, color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  border: '1px solid #cbd5e1', borderRadius: '6px',
  fontSize: '14px', boxSizing: 'border-box', outline: 'none',
};

const errorStyle: React.CSSProperties = {
  margin: '4px 0 0', fontSize: '12px', color: '#dc2626',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, right: 0,
  background: 'white', border: '1px solid #cbd5e1',
  borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  zIndex: 200, listStyle: 'none', padding: 0, margin: '2px 0 0',
  maxHeight: '180px', overflowY: 'auto',
};

const dropdownItemStyle: React.CSSProperties = {
  padding: '8px 12px', cursor: 'pointer', color: '#334155', fontSize: '14px',
};

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 20px', background: '#3b82f6', color: '#fff',
  border: 'none', borderRadius: '6px', fontSize: '14px',
  cursor: 'pointer', fontWeight: 500,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 20px', background: '#f1f5f9', color: '#374151',
  border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px',
  cursor: 'pointer',
};
