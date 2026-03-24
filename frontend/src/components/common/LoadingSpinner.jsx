export default function LoadingSpinner({ size = 'md', fullscreen = false, text = '' }) {
  const sizes = { sm: 24, md: 40, lg: 56, xl: 72 };
  const dim = sizes[size] || sizes.md;

  const spinner = (
    <div style={{ width: dim, height: dim }}>
      <svg viewBox="0 0 50 50" className="animate-spin">
        <circle cx="25" cy="25" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx="25" cy="25" r="20" fill="none" stroke="var(--primary)" strokeWidth="4"
          strokeDasharray="40 126" strokeLinecap="round"
        />
      </svg>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3"
        style={{ background: 'var(--bg-base)' }}>
        {spinner}
        {text && <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{text}</p>}
        <span className="gradient-text font-mono text-xs font-bold">ALMTS</span>
      </div>
    );
  }

  return <div className="flex items-center justify-center p-8">{spinner}</div>;
}
