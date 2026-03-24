export default function Pagination({ page, totalPages, onPage, total, perPage }) {
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const getPages = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Showing {start}-{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="w-9 h-9 rounded-lg font-semibold text-sm transition-colors disabled:opacity-30"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          ←
        </button>
        {getPages().map(p => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className="w-9 h-9 rounded-lg font-semibold text-sm transition-all"
            style={{
              background: p === page ? '#6366f1' : 'transparent',
              color: p === page ? 'white' : 'var(--text-secondary)'
            }}
            onMouseEnter={(e) => p !== page && (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => p !== page && (e.currentTarget.style.background = 'transparent')}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="w-9 h-9 rounded-lg font-semibold text-sm transition-colors disabled:opacity-30"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          →
        </button>
      </div>
    </div>
  );
}
