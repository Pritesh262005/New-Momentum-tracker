import { getMomentumConfig } from '../../utils/formatters';

export default function MomentumRing({ score, size = 80 }) {
  const cfg = getMomentumConfig(score);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="6"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={cfg.ring}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${score >= 70 ? 'gradient-text' : ''}`}
            style={{ fontSize: size / 3, color: score < 70 ? 'var(--text-primary)' : undefined }}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      <span className="text-xs font-semibold px-2 py-1 rounded-full"
        style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    </div>
  );
}
