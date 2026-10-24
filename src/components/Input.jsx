import { forwardRef, useId } from 'react';

export const Input = forwardRef(({ 
  label, 
  error, 
  type = 'text', 
  className = '', 
  icon: Icon,
  id,
  onFocus,
  onBlur,
  'aria-describedby': describedBy,
  ...props 
}, ref) => {
  const generatedId = useId();
  const inputId = id || `rq-input-${generatedId}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`flex flex-col mb-4 ${className}`} style={{ marginBottom: 'var(--spacing-md)' }}>
      {label && (
        <label 
          htmlFor={inputId}
          style={{ 
            color: 'var(--color-on-surface-variant)', 
            fontSize: 'var(--text-label-md)',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: 'var(--spacing-xs)'
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {Icon && (
          <div aria-hidden="true" style={{ position: 'absolute', left: '12px', color: 'var(--color-on-surface-variant)' }}>
            <Icon size={20} />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={Boolean(error)}
          aria-describedby={[describedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined}
          style={{
            width: '100%',
            minHeight: 'var(--control-height)',
            backgroundColor: 'var(--color-surface)',
            border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-outline-variant)'}`,
            borderRadius: '10px',
            padding: Icon ? '10px 14px 10px 40px' : '10px 14px',
            fontSize: 'var(--text-body-sm)',
            color: 'var(--color-on-surface)',
            transition: 'all 0.3s ease',
            outline: 'none',
            boxShadow: 'none'
          }}
          onFocus={(e) => {
            e.target.style.border = `1px solid ${error ? 'var(--color-error)' : 'var(--color-primary)'}`;
            e.target.style.boxShadow = 'var(--focus-ring)';
            onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.border = `1px solid ${error ? 'var(--color-error)' : 'var(--color-outline-variant)'}`;
            e.target.style.boxShadow = 'none';
            onBlur?.(e);
          }}
          {...props}
        />
      </div>
      {error && (
        <span 
          id={errorId}
          role="alert"
          style={{ 
            color: 'var(--color-error)', 
            fontSize: 'var(--text-body-sm)', 
            marginTop: '4px' 
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
