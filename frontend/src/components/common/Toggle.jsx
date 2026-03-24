export default function Toggle({ checked, onChange, disabled = false, size = 'md' }) {
  const sizes = {
    sm: { width: 28, height: 16, thumb: 12, translate: 12 },
    md: { width: 40, height: 22, thumb: 18, translate: 18 },
  };

  const cfg = sizes[size] || sizes.md;

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="rounded-full transition-all duration-200 relative flex-shrink-0"
      style={{
        width: cfg.width,
        height: cfg.height,
        background: checked ? '#6366f1' : 'var(--border)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        className="absolute top-1/2 rounded-full bg-white shadow-md transition-transform duration-200"
        style={{
          width: cfg.thumb,
          height: cfg.thumb,
          transform: `translate(${checked ? cfg.translate : 2}px, -50%)`,
        }}
      />
    </button>
  );
}
