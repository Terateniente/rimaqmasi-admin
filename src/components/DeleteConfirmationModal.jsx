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
}) => {
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
      onClick={busy ? undefined : onCancel}
      style={{ position: 'fixed', inset: 0, zIndex: 1400, display: 'grid', placeItems: 'center', padding: '20px', background: 'rgba(15, 23, 42, .58)', backdropFilter: 'blur(3px)' }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirmation-title"
        onClick={(event) => event.stopPropagation()}
        style={{ width: 'min(360px, 100%)', padding: '32px 24px 24px', borderRadius: '20px', background: 'var(--color-surface)', color: 'var(--color-on-surface)', textAlign: 'center', boxShadow: '0 22px 60px rgba(0, 0, 0, .28)' }}
      >
        <div style={{ width: '64px', height: '64px', margin: '0 auto 22px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-error) 18%, transparent)' }}>
          <Trash2 size={30} strokeWidth={2.4} />
        </div>

        <h2 id="delete-confirmation-title" style={{ margin: '0 0 12px', fontSize: '22px', lineHeight: 1.25, fontWeight: 800 }}>
          {title}
        </h2>
        <p style={{ margin: '0 auto', maxWidth: '290px', color: 'var(--color-on-surface-variant)', fontSize: '15px', lineHeight: 1.5 }}>
          {description || <>Se eliminará <strong>“{itemName}”</strong> del sistema. Esta acción es irreversible.</>}
        </p>
        {children}

        <div style={{ display: 'grid', gridTemplateColumns: secondaryLabel ? '1fr 1fr' : '1fr 1fr', gap: '12px', marginTop: '26px' }}>
          <button ref={cancelButtonRef} type="button" onClick={onCancel} disabled={busy} style={{ minHeight: '44px', padding: '10px 14px', border: 'none', borderRadius: '9px', background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)', fontWeight: 750, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .65 : 1, transition: 'background-color 0.2s' }} onMouseOver={e => !busy && (e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)')} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-high)'}>
            Cancelar
          </button>
          {secondaryLabel && <button type="button" onClick={onSecondary} disabled={busy} style={{ minHeight: '44px', padding: '10px 14px', border: '1px solid var(--color-primary)', borderRadius: '9px', background: 'var(--color-surface)', color: 'var(--color-primary)', fontWeight: 750, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .65 : 1 }}>
            {secondaryLabel}
          </button>}
          <button type="button" onClick={onConfirm} disabled={busy || confirmDisabled} style={{ gridColumn: secondaryLabel ? '1 / -1' : 'auto', minHeight: '44px', padding: '10px 14px', border: 'none', borderRadius: '9px', background: 'var(--color-error)', color: 'var(--color-on-error, #fff)', fontWeight: 750, cursor: busy || confirmDisabled ? 'not-allowed' : 'pointer', opacity: busy || confirmDisabled ? .55 : 1, transition: 'filter 0.2s' }} onMouseOver={e => !busy && !confirmDisabled && (e.currentTarget.style.filter = 'brightness(1.1)')} onMouseOut={e => e.currentTarget.style.filter = 'none'}>
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
};
