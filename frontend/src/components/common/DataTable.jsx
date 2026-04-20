import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import EmptyState from './EmptyState';
import SkeletonCard from './SkeletonCard';

export default function DataTable({
  columns = [],
  data = [],
  loading,
  onRowClick,
  emptyState,
  rowKey = 'id',
  selectable = false,
  selectedRowIds,
  onToggleRow,
  onToggleAll,
  sortable = true,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (columnKey) => {
    if (!sortable) return;
    setSortConfig(prev => ({
      key: prev.key === columnKey ? columnKey : columnKey,
      direction: prev.key === columnKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  try {
    if (loading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <SkeletonCard key={i} rows={1} />)}
        </div>
      );
    }

    if (!data || data.length === 0) {
      return emptyState || <EmptyState title="No data" subtitle="No records found" />;
    }

    if (!columns || columns.length === 0) {
      return <EmptyState title="No columns" subtitle="Table configuration missing" />;
    }

    const allRows = Array.isArray(data) ? data : [];
    const ids = allRows.map((r) => r?.[rowKey]).filter(Boolean);
    const selectedSet =
      selectedRowIds instanceof Set
        ? selectedRowIds
        : new Set(Array.isArray(selectedRowIds) ? selectedRowIds : []);

    const selectedCount = ids.reduce((acc, id) => acc + (selectedSet.has(id) ? 1 : 0), 0);
    const allSelected = ids.length > 0 && selectedCount === ids.length;
    const someSelected = selectedCount > 0 && !allSelected;

    return (
      <div className="overflow-x-auto rounded-[16px] border transition-all" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0" style={{ background: 'var(--bg-hover)' }}>
            <tr>
              {selectable && (
                <th
                  className="px-4 py-3 text-left"
                  style={{ borderBottom: '1px solid var(--border)', width: 46 }}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => onToggleAll?.(e.target.checked)}
                    className="cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="text-xs font-bold uppercase tracking-wide px-4 py-3 text-left transition-colors"
                  style={{
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)',
                    width: col.width,
                    textAlign: col.align || 'left',
                    cursor: sortable && col.sortable !== false ? 'pointer' : 'default'
                  }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  onMouseEnter={(e) => {
                    if (sortable && col.sortable !== false) {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.background = 'rgba(99,102,241,0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div className="flex items-center gap-2">
                    {col.header}
                    {sortable && col.sortable !== false && sortConfig.key === col.key && (
                      <span className="flex-shrink-0">
                        {sortConfig.direction === 'asc' ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => (
              <tr
                key={row[rowKey] || i}
                className="transition-all duration-150"
                style={{
                  borderBottom: '1px solid var(--border-light)',
                  cursor: onRowClick ? 'pointer' : 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  if (onRowClick) e.currentTarget.style.boxShadow = 'inset 0 0 8px rgba(99,102,241,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={selectedSet.has(row?.[rowKey])}
                      onChange={(e) => onToggleRow?.(row, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer"
                    />
                  </td>
                )}
                {columns.map((col, j) => (
                  <td
                    key={j}
                    className="px-4 py-3.5 text-sm font-medium"
                    style={{ color: 'var(--text-primary)', textAlign: col.align || 'left' }}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } catch (error) {
    console.error('DataTable error:', error);
    return <EmptyState title="Error" subtitle="Failed to render table" />;
  }
}
