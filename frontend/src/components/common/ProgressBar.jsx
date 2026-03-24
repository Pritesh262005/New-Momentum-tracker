export default function ProgressBar({ value, max = 100, color = 'indigo', height = 6, animated = false, label }) {
  const pct = Math.min(100, (value / max) * 100);

  const colors = {
    indigo: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
    green: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-500',
    red: 'bg-gradient-to-r from-rose-500 to-red-600',
    cyan: 'bg-gradient-to-r from-cyan-500 to-blue-500',
  };

  return (
    <div>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="rounded-full overflow-hidden" style={{ height, background: 'var(--bg-hover)' }}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors[color] || colors.indigo} ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
