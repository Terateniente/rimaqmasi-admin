import { forwardRef, useId } from 'react';

export const Input = forwardRef(({
  label,
  error,
  type = 'text',
  className = '',
  icon: Icon,
  id,
  'aria-describedby': describedBy,
  ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || `rq-input-${generatedId}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`rq-field ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="rq-field__label">
          {label}
        </label>
      )}
      <div className="rq-field__control">
        {Icon && (
          <div aria-hidden="true" className="rq-field__icon">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={Boolean(error)}
          aria-describedby={[describedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined}
          className={`rq-field__input ${Icon ? 'rq-field__input--with-icon' : ''} ${error ? 'rq-field__input--error' : ''}`.trim()}
          {...props}
        />
      </div>
      {error && (
        <span id={errorId} role="alert" className="rq-field__error">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
