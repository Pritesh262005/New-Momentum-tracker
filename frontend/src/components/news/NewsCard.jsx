import { formatDateTime } from '../../utils/formatters';

export default function NewsCard({ news, onClick }) {
  return (
    <div className="card p-6 cursor-pointer hover:shadow-lg transition" onClick={onClick}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-2xl flex-shrink-0">
          📰
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-2">{news.title}</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">{news.content}</p>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <span>By {news.author?.name}</span>
            <span>{formatDateTime(news.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
