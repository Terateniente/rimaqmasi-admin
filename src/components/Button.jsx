export const Button = ({ 
  children, 
  variant = 'primary', 
  type = 'button', 
  className = '', 
  disabled = false,
  style,
  ...props 
}) => {
  const getVariantStyles = () => {
    switch(variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          padding: '10px 18px',
          boxShadow: 'var(--shadow-level-1)',
          border: 'none',
          cursor: 'pointer'
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--color-secondary)',
          color: 'var(--color-on-secondary)',
          padding: '10px 18px',
          boxShadow: 'var(--shadow-level-1)',
          border: 'none',
          cursor: 'pointer'
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-primary)',
          border: '1px solid var(--color-primary)',
          padding: '10px 18px',
          cursor: 'pointer'
        };
      default:
        return {
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-on-primary)',
          padding: '10px 18px',
          boxShadow: 'var(--shadow-level-1)',
          border: 'none',
          cursor: 'pointer'
        };
    }
  };

  return (
    <button 
      type={type} 
      style={{
        ...getVariantStyles(),
        minHeight: 'var(--control-height)',
        borderRadius: '10px',
        fontSize: 'var(--text-label-lg)',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        transition: 'transform .2s ease, opacity .2s ease, box-shadow .2s ease',
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      className={`rq-button rq-button--${variant} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
