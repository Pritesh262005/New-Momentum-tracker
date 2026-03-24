import { AnimatePresence, motion } from 'framer-motion';

export default function Modal({ isOpen, onClose, title, children, size = 'md', noPad = false }) {
  const widths = { xs: 380, sm: 440, md: 560, lg: 720, xl: 920, full: '95vw' };
  const width = widths[size] || widths.md;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="rounded-[20px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden pointer-events-auto"
              style={{ width, background: 'var(--bg-card)', border: '1px solid var(--border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b flex justify-between items-center flex-shrink-0"
                style={{ borderColor: 'var(--border)' }}>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:rotate-90"
                  style={{ color: 'var(--text-muted)', background: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  ✕
                </button>
              </div>
              <div className={`overflow-y-auto flex-1 ${noPad ? '' : 'p-6'}`}>
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
