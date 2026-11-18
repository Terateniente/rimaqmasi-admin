export const Button = ({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  disabled = false,
  style,
  ...props
}) => (
  <button
    type={type}
    className={`rq-button rq-button--${variant} ${className}`.trim()}
    style={style}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);
