import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';

export default function ConfirmModal({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  variant = 'default',
  loading = false
}) {
  const handleClose = onClose || onCancel;
  const icons = { default: 'âš ï¸', danger: 'ðŸ—‘ï¸', warning: 'âš ï¸' };
  const icon = icons[variant] || icons.default;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="xs">
      <div className="text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
        <div className="flex gap-3">
          <button onClick={handleClose} className="btn-secondary flex-1" disabled={loading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={variant === 'danger' ? 'btn-danger flex-1' : 'btn-primary flex-1'}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
