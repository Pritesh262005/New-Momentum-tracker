export default function LoadingSpinner({ size = 'md', fullscreen = false, text = '' }) {
  const sizes = { sm: 24, md: 40, lg: 56, xl: 72 };
  const dim = sizes[size] || sizes.md;

  const spinner = (
    <div style={{ width: dim, height: dim }} className="relative">
      <svg viewBox="0 0 50 50" className="animate-spin" style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.3))' }}>
        <circle cx="25" cy="25" r="20" fill="none" stroke="var(--border)" strokeWidth="3" opacity="0.2" />
        <circle
          cx="25" cy="25" r="20" fill="none" stroke="url(#grad)" strokeWidth="3"
          strokeDasharray="40 126" strokeLinecap="round"
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
        style={{
          background: 'var(--page-header-bg)',
          backdropFilter: 'blur(10px)'
        }}>
        {spinner}
        {text && <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{text}</p>}
        <span className="gradient-text font-mono text-xs font-bold tracking-widest">ALMTS</span>
      </div>
    );
  }

  return <div className="flex items-center justify-center p-8">{spinner}</div>;
}
