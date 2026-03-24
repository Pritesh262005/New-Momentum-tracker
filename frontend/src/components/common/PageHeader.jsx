export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="sticky top-0 z-30 px-8 py-4 backdrop-blur"
      style={{ background: 'var(--bg-base)', opacity: 0.98, borderBottom: '1px solid var(--border)' }}>
      {breadcrumbs && Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-2">›</span>}
              {typeof crumb === 'string' ? crumb : crumb.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          {subtitle && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
