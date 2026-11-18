import React, { useState, useEffect, useRef, useId } from 'react';
import { Image as ImageIcon } from 'lucide-react';

export const IconPicker = ({ value, onChange, error }) => {
  const [query, setQuery] = useState('');
  const [icons, setIcons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);
  const inputId = useId();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchIcons = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setIcons([]);
      return;
    }
    setLoading(true);
    try {
      let translatedQuery = searchQuery;
      try {
        const transRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(searchQuery)}`);
        const transData = await transRes.json();
        if (transData && transData[0] && transData[0][0] && transData[0][0][0]) {
          translatedQuery = transData[0][0][0];
        }
      } catch (transErr) {
        console.warn('Error en traducción, usando query original', transErr);
      }

      const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(translatedQuery)}&limit=30`);
      const data = await res.json();
      setIcons(data.icons || []);
    } catch (err) {
      console.error('Error buscando iconos', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowDropdown(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      searchIcons(newQuery);
    }, 500);
  };

  const handleSelectIcon = (iconName) => {
    onChange(iconName);
    setShowDropdown(false);
  };

  const getIconUrl = (iconName) => {
    if (!iconName) return '';
    const [prefix, name] = iconName.split(':');
    return `https://api.iconify.design/${prefix}/${name}.svg?color=%2394a3b8`;
  };

  const defaultIcons = [
    'lucide:book', 'lucide:graduation-cap', 'lucide:brain', 'lucide:star', 'lucide:award',
    'lucide:heart', 'lucide:smile', 'lucide:zap', 'lucide:target', 'lucide:flag',
    'lucide:music', 'lucide:message-circle', 'lucide:users', 'lucide:globe', 'lucide:sun',
    'lucide:moon', 'lucide:cloud', 'lucide:camera', 'lucide:play', 'lucide:check-circle',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }} ref={dropdownRef}>
      <label htmlFor={inputId} className="rq-field__label">Ícono (buscar en catálogo)</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            border: '1px solid var(--color-outline-variant)',
            backgroundColor: 'var(--color-surface-container-low)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {value ? (
            <img src={getIconUrl(value)} alt="Vista previa del ícono" style={{ width: '24px', height: '24px' }} />
          ) : (
            <ImageIcon size={20} color="var(--color-text-muted)" />
          )}
        </div>

        <div style={{ position: 'relative', flex: 1 }}>
          <input
            id={inputId}
            type="text"
            placeholder="Libro, estrella…"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => setShowDropdown(true)}
            className={`rq-field__input ${error ? 'rq-field__input--error' : ''}`.trim()}
          />
          {loading && (
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
              Buscando…
            </span>
          )}
        </div>
      </div>

      {error && <span className="rq-field__error">{error}</span>}
      {value && !showDropdown && (
        <span style={{ fontSize: '11.5px', color: 'var(--color-primary-text)', fontWeight: 600 }}>
          Seleccionado: {value}
        </span>
      )}

      {showDropdown && (
        <div className="rq-icon-picker__dropdown">
          {icons.length > 0 || query.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '8px' }}>
              {(query.length === 0 ? defaultIcons : icons).map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleSelectIcon(icon)}
                  title={icon}
                  aria-label={`Seleccionar ícono ${icon}`}
                  className="rq-icon-picker__option"
                >
                  <img src={getIconUrl(icon)} alt={icon} style={{ width: '20px', height: '20px' }} />
                </button>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px' }}>
              {!loading && 'No se encontraron íconos'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
