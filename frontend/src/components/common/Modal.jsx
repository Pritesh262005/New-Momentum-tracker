import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

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
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="rounded-[20px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden pointer-events-auto"
              style={{
                width,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 1px rgba(99,102,241,0.1)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b flex justify-between items-center flex-shrink-0 bg-gradient-to-r from-transparent to-indigo-500/5"
                style={{ borderColor: 'var(--border)' }}>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                <motion.button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{ color: 'var(--text-muted)', background: 'transparent' }}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <X size={18} />
                </motion.button>
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
