import Link from 'next/link';

const navLinks = [
  { href: '/admin/brands', label: 'Merken' },
  { href: '/admin/units', label: 'Eenheden' },
  { href: '/admin/consumptions', label: 'Consumpties' },
  { href: '/admin/products', label: 'Producten' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-title">Admin Panel</div>
        <nav className="sidebar-nav">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="sidebar-link">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
