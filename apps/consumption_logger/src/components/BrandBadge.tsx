interface BrandBadgeProps {
  name: string;
}

export function BrandBadge({ name }: BrandBadgeProps) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      backgroundColor: '#e0f0ff',
      color: '#1a6fcc',
      fontSize: '0.75rem',
      fontWeight: 600,
    }}>
      {name}
    </span>
  );
}
