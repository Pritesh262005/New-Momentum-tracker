export default function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div className="py-20 flex flex-col items-center gap-4 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
        style={{ background: 'var(--bg-hover)' }}>
        {icon}
      </div>
      <h3 className="font-bold text-lg" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      {subtitle && (
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
