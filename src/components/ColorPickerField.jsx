import { useState } from 'react';
import { PREDEFINED_COLORS } from '../utils/colorPalette';

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Selector de color con paleta predefinida, HEX manual y selector nativo. */
export const ColorPickerField = ({ value, onChange, label = 'Color', fallback = '#991b1b' }) => {
  const [open, setOpen] = useState(false);
  const color = value || fallback;
  const pick = (c) => { onChange(c); setOpen(false); };

  return (
    <div className="rq-field rq-color-field">
      <span className="rq-field__label">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`rq-color-trigger${open ? ' rq-color-trigger--open' : ''}`}
        aria-expanded={open}
        aria-label={`Color seleccionado ${color.toUpperCase()}`}
      >
        <span className="rq-color-trigger__swatch" style={{ backgroundColor: color }} />
        <span className="rq-color-trigger__hex">{color.toUpperCase()}</span>
      </button>

      {open && (
        <div className="rq-color-popover" role="dialog" aria-label="Elegir color">
          <div className="rq-color-popover__grid academic-modal-scroll">
            {PREDEFINED_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="rq-color-swatch"
                aria-pressed={color.toLowerCase() === c}
                aria-label={c}
                style={{ backgroundColor: c }}
                onClick={() => pick(c)}
              />
            ))}
          </div>
          <div className="rq-color-popover__footer">
            <label className="rq-inline">
              <span className="rq-overline">HEX:</span>
              <input className="rq-color-popover__hex" value={color} onChange={(e) => onChange(e.target.value)} />
            </label>
            <label className="rq-inline">
              <span className="rq-overline">Más:</span>
              <span className="rq-color-popover__native">
                <input type="color" value={HEX.test(color) ? color : fallback} onChange={(e) => onChange(e.target.value)} title="Elegir color personalizado" />
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
