export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'confirm',
}) {
  if (!open) return null

  const isAlert = variant === 'alert'

  return (
    <div className="confirm-overlay" onClick={onCancel} role="presentation">
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-title">{title}</h3>
        <p id="confirm-message">{message}</p>
        <div className={`confirm-actions ${isAlert ? 'confirm-actions--single' : ''}`}>
          {!isAlert && (
            <button type="button" className="btn-confirm-cancel" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={isAlert ? 'btn-confirm-primary' : 'btn-confirm-danger'}
            onClick={isAlert ? onCancel : onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
