export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div
      className="page-header sticky top-0 z-30 px-8 py-6 backdrop-blur-xl border-b transition-all"
      style={{
        background: 'var(--page-header-bg)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {breadcrumbs && Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-xs mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="opacity-50">{'/'}</span>}
              <span className="hover:text-primary transition-colors cursor-pointer">
                {typeof crumb === 'string' ? crumb : crumb.label}
              </span>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-3xl truncate" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          {subtitle && (
            <p className="text-sm mt-1.5 line-clamp-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center justify-end gap-3 flex-wrap flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
