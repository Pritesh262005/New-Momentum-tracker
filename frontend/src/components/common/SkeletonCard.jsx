export default function SkeletonCard({ rows = 3 }) {
  return (
    <div className="card-flat p-5 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${100 - i * 10}%` }} />
      ))}
    </div>
  );
}
