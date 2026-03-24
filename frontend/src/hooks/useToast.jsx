import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info') => {
    const toastId = ++id;
    setToasts(t => [...t, { id: toastId, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== toastId)), 3500);
  }, []);

  const dismiss = useCallback((toastId) => {
    setToasts(t => t.filter(x => x.id !== toastId));
  }, []);

  const toast = {
    showToast: (msg, type = 'info') => add(msg, type),
    success: (msg) => add(msg, 'success'),
    error: (msg) => add(msg, 'error'),
    warning: (msg) => add(msg, 'warning'),
    info: (msg) => add(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 min-w-[300px]">
          {toasts.map((t, i) => {
            const cfg = {
              success: { icon: '✓', bg: '#10b981', label: 'Success' },
              error: { icon: '✕', bg: '#ef4444', label: 'Error' },
              warning: { icon: '!', bg: '#f59e0b', label: 'Warning' },
              info: { icon: 'ℹ', bg: '#6366f1', label: 'Info' },
            }[t.type] || { icon: 'ℹ', bg: '#6366f1' };

            return (
              <div
                key={t.id}
                className="animate-slideRight flex items-center gap-3 p-4 rounded-xl shadow-xl"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  animationDelay: `${i * 50}ms`
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: cfg.bg }}
                >
                  {cfg.icon}
                </div>
                <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
                  {t.message}
                </span>
                <button
                  onClick={() => dismiss(t.id)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};
