import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Lightbox modal for viewing thumbnail or uploaded preview images at full legible size.
 */
export const ImageLightboxModal = ({ src, alt = 'Vista previa de imagen', title, onClose }) => {
  useEffect(() => {
    if (!src) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="rq-modal-backdrop rq-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title || alt}
      onClick={onClose}
    >
      <div className="rq-lightbox-dialog" onClick={(event) => event.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--color-on-surface)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {title || alt}
          </span>
          <button
            type="button"
            className="rq-icon-close"
            onClick={onClose}
            aria-label="Cerrar imagen ampliada"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rq-lightbox-stage">
          <img
            src={src}
            alt={alt}
            crossOrigin="anonymous"
          />
        </div>
      </div>
    </div>
  );
};
