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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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
    setHighlightedIndex(-1);
    setOpen(true);
    if (val === '') onChange('');
  }

  function handleSelect(option: Option) {
    setInputValue(option.label);
    onChange(option.id);
    setOpen(false);
    setHighlightedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(highlightedIndex + 1, filtered.length - 1);
      setHighlightedIndex(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(highlightedIndex - 1, 0);
      setHighlightedIndex(prev);
      listRef.current?.children[prev]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0) handleSelect(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlightedIndex(-1);
    }
  }

  return (
    <div className="form-group" ref={containerRef} style={{ position: 'relative' }}>
      <label>{label}</label>
      <input
        className="input"
        value={inputValue}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => inputValue.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul ref={listRef} style={{
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
                background: filtered.indexOf(option) === highlightedIndex ? '#f1f5f9' : option.id === value ? '#eff6ff' : 'white',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = filtered.indexOf(option) === highlightedIndex ? '#f1f5f9' : option.id === value ? '#eff6ff' : 'white')}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
