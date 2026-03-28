'use client';

import { useEffect, useRef, useState } from 'react';

interface Option {
  id: number;
  label: string;
}

interface AutocompleteInputProps {
  label: string;
  options: Option[];
  value: number | '';
  onChange: (id: number | '') => void;
}

export default function AutocompleteInput({ label, options, value, onChange }: AutocompleteInputProps) {
  const selectedLabel = options.find((o) => o.id === value)?.label ?? '';
  const [inputValue, setInputValue] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input when value changes externally (e.g. edit modal pre-fill)
  useEffect(() => {
    setInputValue(options.find((o) => o.id === value)?.label ?? '');
  }, [value, options]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // Reset to last valid selection if input doesn't match
        setInputValue(options.find((o) => o.id === value)?.label ?? '');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [value, options]);

  const filtered = inputValue.length === 0
    ? []
    : options.filter((o) => o.label.toLowerCase().includes(inputValue.toLowerCase()));

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    setOpen(true);
    if (val === '') onChange('');
  }

  function handleSelect(option: Option) {
    setInputValue(option.label);
    onChange(option.id);
    setOpen(false);
  }

  return (
    <div className="form-group" ref={containerRef} style={{ position: 'relative' }}>
      <label>{label}</label>
      <input
        className="input"
        value={inputValue}
        onChange={handleInput}
        onFocus={() => inputValue.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 100,
          listStyle: 'none',
          maxHeight: '180px',
          overflowY: 'auto',
          marginTop: '2px',
        }}>
          {filtered.map((option) => (
            <li
              key={option.id}
              onMouseDown={() => handleSelect(option)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                color: '#334155',
                fontSize: '14px',
                background: option.id === value ? '#eff6ff' : 'white',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = option.id === value ? '#eff6ff' : 'white')}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
