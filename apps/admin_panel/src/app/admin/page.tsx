import Link from 'next/link';

const sections = [
  { href: '/admin/brands', label: 'Merken', description: 'Beheer merk namen' },
  { href: '/admin/units', label: 'Eenheden', description: 'Beheer eenheden (ml, cl, ...)' },
  { href: '/admin/consumptions', label: 'Consumpties', description: 'Beheer consumptie namen' },
  { href: '/admin/products', label: 'Producten', description: 'Beheer producten met merk en inhoud' },
];

export default function AdminPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {sections.map(({ href, label, description }) => (
          <Link
            key={href}
            href={href}
            style={{ textDecoration: 'none' }}
          >
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', cursor: 'pointer' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>{description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
