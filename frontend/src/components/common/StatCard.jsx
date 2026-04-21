export default function StatCard({ icon, value, label, title, sub, color = 'indigo', trend, onClick }) {
  const colors = {
    indigo: { from: 'from-indigo-500/20', to: 'to-indigo-600/10', text: 'text-indigo-500', border: 'border-indigo-500/20' },
    cyan: { from: 'from-cyan-500/20', to: 'to-cyan-600/10', text: 'text-cyan-500', border: 'border-cyan-500/20' },
    green: { from: 'from-emerald-500/20', to: 'to-emerald-600/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
    amber: { from: 'from-amber-500/20', to: 'to-amber-600/10', text: 'text-amber-500', border: 'border-amber-500/20' },
    red: { from: 'from-rose-500/20', to: 'to-rose-600/10', text: 'text-rose-500', border: 'border-rose-500/20' },
    violet: { from: 'from-violet-500/20', to: 'to-violet-600/10', text: 'text-violet-500', border: 'border-violet-500/20' },
    rose: { from: 'from-rose-500/20', to: 'to-rose-600/10', text: 'text-rose-500', border: 'border-rose-500/20' },
  };

  const cfg = colors[color] || colors.indigo;

  return (
    <div
      className={`card p-4 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''} border-l-4`}
      style={{ borderLeftColor: color === 'indigo' ? '#6366f1' : color === 'cyan' ? '#06b6d4' : color === 'green' ? '#10b981' : color === 'amber' ? '#f59e0b' : color === 'red' ? '#ef4444' : color === 'violet' ? '#8b5cf6' : '#f43f5e' }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-gradient-to-br ${cfg.from} ${cfg.to} transition-transform hover:scale-110`}>
          <span>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xl md:text-2xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>{value}</div>
          <div className="text-xs font-semibold uppercase tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>
            {label ?? title}
          </div>
          {sub && <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>{sub}</div>}
        </div>
      </div>
      {trend && (
        <div className="h-1.5 mt-4 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
          <div className={`h-full bg-gradient-to-r ${cfg.from} ${cfg.to} transition-all duration-500`} style={{ width: `${trend}%` }} />
        </div>
      )}
    </div>
  );
}
