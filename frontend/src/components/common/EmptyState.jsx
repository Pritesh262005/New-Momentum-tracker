export default function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div className="py-24 flex flex-col items-center gap-5 text-center px-4">
      <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl relative"
        style={{
          background: 'linear-gradient(135deg, var(--bg-hover), var(--bg-base))',
          border: '2px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
        }}>
        <span className="animate-bounce" style={{ animationDelay: '0s' }}>{icon}</span>
      </div>
      <div>
        <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {subtitle && (
          <p className="text-sm max-w-sm mt-2" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
