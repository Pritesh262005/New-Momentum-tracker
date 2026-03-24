export default function StatCard({ icon, value, label, title, sub, color = 'indigo', trend, onClick }) {
  const colors = {
    indigo: { from: 'from-indigo-500/20', to: 'to-indigo-600/10', text: 'text-indigo-500' },
    cyan: { from: 'from-cyan-500/20', to: 'to-cyan-600/10', text: 'text-cyan-500' },
    green: { from: 'from-emerald-500/20', to: 'to-emerald-600/10', text: 'text-emerald-500' },
    amber: { from: 'from-amber-500/20', to: 'to-amber-600/10', text: 'text-amber-500' },
    red: { from: 'from-rose-500/20', to: 'to-rose-600/10', text: 'text-rose-500' },
    violet: { from: 'from-violet-500/20', to: 'to-violet-600/10', text: 'text-violet-500' },
    rose: { from: 'from-rose-500/20', to: 'to-rose-600/10', text: 'text-rose-500' },
  };

  const cfg = colors[color] || colors.indigo;

  return (
    <div
      className={`card p-5 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br ${cfg.from} ${cfg.to}`}>
          <span className={cfg.text}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
          <div className="text-xs font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {label ?? title}
          </div>
          {sub && <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{sub}</div>}
        </div>
      </div>
      {trend && (
        <div className="h-1 mt-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
          <div className={`h-full bg-gradient-to-r ${cfg.from} ${cfg.to}`} style={{ width: `${trend}%` }} />
        </div>
      )}
    </div>
  );
}
