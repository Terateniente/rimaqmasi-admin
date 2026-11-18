import { Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

export const DeleteConfirmationModal = ({
  open,
  title,
  itemName,
  description,
  onCancel,
  onConfirm,
  confirmLabel = 'Sí, eliminar',
  busy = false,
  confirmDisabled = false,
  secondaryLabel,
  onSecondary,
  children,
  tone = 'danger',
  icon: Icon = Trash2,
}) => {
  const isDanger = tone === 'danger';
  const cancelButtonRef = useRef(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancelRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, busy]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="rq-modal-backdrop"
      onClick={busy ? undefined : onCancel}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirmation-title"
        className="rq-modal-dialog rq-delete-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`rq-delete-dialog__icon${isDanger ? '' : ' rq-delete-dialog__icon--primary'}`}>
          <Icon size={28} strokeWidth={2.2} />
        </div>

        <h2 id="delete-confirmation-title" className="rq-delete-dialog__title">
          {title}
        </h2>
        <p className="rq-delete-dialog__description">
          {description || <>Se eliminará <strong>“{itemName}”</strong> del sistema. Esta acción es irreversible.</>}
        </p>
        {children}

        <div className="rq-delete-dialog__actions">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rq-button rq-button--ghost"
          >
            Cancelar
          </button>
          {secondaryLabel && (
            <button
              type="button"
              onClick={onSecondary}
              disabled={busy}
              className="rq-button rq-button--outline"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className={`rq-button rq-button--${isDanger ? 'danger' : 'primary'} ${secondaryLabel ? 'rq-delete-dialog__confirm-full' : ''}`.trim()}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

/** Mismo diálogo para confirmaciones no destructivas (crear/guardar). */
export const ConfirmDialog = (props) => <DeleteConfirmationModal tone="primary" confirmLabel="Sí, confirmar" {...props} />;
