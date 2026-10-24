import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import {
  requestPasswordReset,
  resetPassword,
  verifyPasswordResetCode,
} from '../services/authService';
import './PasswordRecovery.css';

const EMAIL_KEY = 'rq_password_reset_email';
const TOKEN_KEY = 'rq_password_reset_token';
const getApiError = (error, fallback) => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message === 'Network Error') return 'No se pudo conectar con el servidor. Verifica tu conexión.';
  return error?.message || fallback;
};

export const PasswordRecovery = ({ step }) => {
  const navigate = useNavigate();
  const codeRefs = useRef([]);
  const [correo, setCorreo] = useState(() => sessionStorage.getItem(EMAIL_KEY) || '');
  const [codigo, setCodigo] = useState(Array(6).fill(''));
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  const currentStep = step === 'request' ? 1 : step === 'code' ? 2 : 3;
  const resetToken = sessionStorage.getItem(TOKEN_KEY);
  const passwordRules = useMemo(() => [
    { label: '8 caracteres', valid: nuevaContrasena.length >= 8 },
    { label: 'Una mayúscula', valid: /[A-Z]/.test(nuevaContrasena) },
    { label: 'Una minúscula', valid: /[a-z]/.test(nuevaContrasena) },
    { label: 'Un número', valid: /\d/.test(nuevaContrasena) },
  ], [nuevaContrasena]);
  const passwordIsValid = passwordRules.every((rule) => rule.valid);
  const validRulesCount = useMemo(() => passwordRules.filter((rule) => rule.valid).length, [passwordRules]);
  const strengthInfo = useMemo(() => {
    if (!nuevaContrasena) return { label: 'Requisitos', level: 0, pillClass: '' };
    if (validRulesCount === 1) return { label: 'Débil', level: 1, pillClass: 'rq-strength-pill--level-1' };
    if (validRulesCount === 2) return { label: 'Media', level: 2, pillClass: 'rq-strength-pill--level-2' };
    if (validRulesCount === 3) return { label: 'Buena', level: 3, pillClass: 'rq-strength-pill--level-3' };
    return { label: 'Excelente', level: 4, pillClass: 'rq-strength-pill--level-4' };
  }, [nuevaContrasena, validRulesCount]);

  useEffect(() => {
    if (step === 'code' && !correo) navigate('/recuperar-contrasena', { replace: true });
    if (step === 'reset' && (!correo || !resetToken)) {
      navigate('/recuperar-contrasena', { replace: true });
    }
  }, [correo, navigate, resetToken, step]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setInterval(
      () => setResendSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const clearAlerts = () => { setError(''); setMessage(''); };

  const submitEmail = async (event) => {
    event.preventDefault();
    clearAlerts();
    setLoading(true);
    try {
      const normalizedEmail = correo.trim().toLowerCase();
      await requestPasswordReset(normalizedEmail);
      sessionStorage.setItem(EMAIL_KEY, normalizedEmail);
      setCorreo(normalizedEmail);
      navigate('/recuperar-contrasena/codigo');
    } catch (requestError) {
      setError(getApiError(requestError, 'No pudimos procesar la solicitud. Inténtalo nuevamente.'));
    } finally {
      setLoading(false);
    }
  };

  const updateCode = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextCode = [...codigo];
    nextCode[index] = digit;
    setCodigo(nextCode);
    setError('');
    if (digit && index < 5) codeRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !codigo[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (event) => {
    event.preventDefault();
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    const nextCode = Array(6).fill('');
    digits.split('').forEach((digit, index) => { nextCode[index] = digit; });
    setCodigo(nextCode);
    codeRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const submitCode = async (event) => {
    event.preventDefault();
    clearAlerts();
    const completeCode = codigo.join('');
    if (completeCode.length !== 6) {
      setError('Completa los 6 dígitos del código.');
      return;
    }
    setLoading(true);
    try {
      const response = await verifyPasswordResetCode(correo, completeCode);
      sessionStorage.setItem(TOKEN_KEY, response.data.reset_token);
      navigate('/recuperar-contrasena/nueva');
    } catch (requestError) {
      setError(getApiError(requestError, 'El código es inválido o ha expirado.'));
      setCodigo(Array(6).fill(''));
      codeRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendSeconds > 0 || loading) return;
    clearAlerts();
    setLoading(true);
    try {
      const response = await requestPasswordReset(correo);
      setMessage(response.message);
      setResendSeconds(60);
      setCodigo(Array(6).fill(''));
    } catch (requestError) {
      setError(getApiError(requestError, 'No pudimos reenviar el código.'));
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    clearAlerts();
    if (!passwordIsValid) {
      setError('La contraseña todavía no cumple todos los requisitos.');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const response = await resetPassword({
        correo,
        resetToken,
        nuevaContrasena,
        confirmarContrasena,
      });
      sessionStorage.removeItem(EMAIL_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      navigate('/login', { replace: true, state: { passwordResetMessage: response.message } });
    } catch (requestError) {
      setError(getApiError(requestError, 'No pudimos actualizar la contraseña.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="recovery-page">
      <div className="recovery-page__glow recovery-page__glow--red" />
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        padding: '32px 32px',
        position: 'relative',
        zIndex: 1
      }}>
        
        <div style={{ width: '100%' }}>
          
          {/* Franja de colores andinos */}
          <div style={{ 
            height: '6px', 
            width: '100%', 
            background: 'linear-gradient(to right, #ba1a1a 0 16.6%, #e4b221 16.6% 33.2%, #22c55e 33.2% 49.8%, #1e5fa9 49.8% 66.4%, #6b21a8 66.4% 83%, #ea580c 83% 100%)', 
            marginBottom: '24px', 
            borderRadius: '4px' 
          }} />

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ 
              color: 'var(--color-outline)', 
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
              fontWeight: 600
            }}>
              PANEL DE ADMINISTRACIÓN
            </h4>
            <h2 style={{ color: 'var(--color-primary)', fontSize: '30px', fontWeight: 'bold', margin: 0, marginBottom: '12px' }}>
              {step === 'request' && 'Recupera tu contraseña'}
              {step === 'code' && 'Introduce el código'}
              {step === 'reset' && 'Nueva contraseña'}
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
              {step === 'request' && 'Ingresa el correo de tu cuenta administrativa. Te enviaremos un código seguro.'}
              {step === 'code' && <>Enviamos un código de 6 dígitos a <strong>{correo}</strong>.</>}
              {step === 'reset' && 'Elige una contraseña segura que no hayas utilizado anteriormente.'}
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'var(--color-error-container)',
              color: 'var(--color-on-error-container)',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {message}
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={submitEmail} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ 
                  color: 'var(--color-outline)', 
                  fontSize: '12px', 
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  CORREO ELECTRÓNICO
                </label>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e4e2e1', transition: 'border-color 0.2s', paddingBottom: '8px' }}>
                  <Mail size={18} color="var(--color-outline)" />
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="administrador@rimaqmasi.com"
                    autoComplete="email"
                    required
                    autoFocus
                    style={{
                      flex: 1,
                      border: 'none',
                      marginLeft: '12px',
                      fontSize: '15px',
                      color: 'var(--color-on-surface)',
                      outline: 'none',
                      backgroundColor: 'transparent'
                    }}
                    onFocus={(e) => e.target.parentElement.style.borderBottom = '1px solid var(--color-primary)'}
                    onBlur={(e) => e.target.parentElement.style.borderBottom = '1px solid #e4e2e1'}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    borderRadius: '6px', 
                    backgroundColor: 'var(--color-primary)', 
                    color: 'white',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.8 : 1,
                    boxShadow: 'var(--shadow-level-1)'
                  }}
                >
                  {loading ? 'ENVIANDO...' : 'ENVIAR CÓDIGO'}
                </button>
                <Link to="/login" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none', textAlign: 'center' }}>
                  Volver al inicio de sesión
                </Link>
              </div>
              

            </form>
          )}

          {step === 'code' && (
            <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ 
                  color: 'var(--color-outline)', 
                  fontSize: '12px', 
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  CÓDIGO DE VERIFICACIÓN
                </label>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '8px' }} onPaste={handleCodePaste}>
                  {codigo.map((digit, index) => (
                    <input key={index}
                      ref={(element) => { codeRefs.current[index] = element; }}
                      value={digit} onChange={(event) => updateCode(index, event.target.value)}
                      onKeyDown={(event) => handleCodeKeyDown(index, event)}
                      inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      aria-label={`Dígito ${index + 1}`} maxLength={1} autoFocus={index === 0}
                      style={{
                        width: '45px',
                        height: '50px',
                        fontSize: '24px',
                        textAlign: 'center',
                        border: 'none',
                        borderBottom: '2px solid #e4e2e1',
                        outline: 'none',
                        color: 'var(--color-on-surface)',
                        backgroundColor: 'transparent',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => e.target.style.borderBottomColor = 'var(--color-primary)'}
                      onBlur={(e) => {
                        if (!e.target.value) {
                          e.target.style.borderBottomColor = '#e4e2e1';
                        } else {
                          e.target.style.borderBottomColor = 'var(--color-outline)';
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    borderRadius: '6px', 
                    backgroundColor: 'var(--color-primary)', 
                    color: 'white',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.8 : 1,
                    boxShadow: 'var(--shadow-level-1)'
                  }}
                >
                  {loading ? 'VERIFICANDO...' : 'VERIFICAR CÓDIGO'}
                </button>
                <button 
                  type="button" 
                  onClick={resendCode}
                  disabled={loading || resendSeconds > 0}
                  style={{ 
                    background: 'none',
                    border: 'none',
                    fontSize: '13px', 
                    fontWeight: 600, 
                    color: (loading || resendSeconds > 0) ? 'var(--color-outline)' : 'var(--color-primary)', 
                    cursor: (loading || resendSeconds > 0) ? 'not-allowed' : 'pointer',
                    textDecoration: 'none', 
                    textAlign: 'center' 
                  }}
                >
                  {resendSeconds > 0 ? `Reenviar código en ${resendSeconds}s` : 'Reenviar código'}
                </button>
                <Link to="/recuperar-contrasena" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none', textAlign: 'center' }}>
                  Usar otro correo
                </Link>
              </div>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={submitPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ 
                  color: 'var(--color-outline)', 
                  fontSize: '12px', 
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  NUEVA CONTRASEÑA
                </label>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e4e2e1', transition: 'border-color 0.2s', paddingBottom: '8px', position: 'relative' }}>
                  <LockKeyhole size={18} color="var(--color-outline)" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    autoComplete="new-password"
                    required
                    autoFocus
                    placeholder="••••••••"
                    style={{
                      flex: 1,
                      border: 'none',
                      marginLeft: '12px',
                      paddingRight: '36px',
                      fontSize: '15px',
                      color: 'var(--color-on-surface)',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      letterSpacing: showPassword ? 'normal' : '2px'
                    }}
                    onFocus={(e) => e.target.parentElement.style.borderBottom = '1px solid var(--color-primary)'}
                    onBlur={(e) => e.target.parentElement.style.borderBottom = '1px solid #e4e2e1'}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-outline)',
                      outline: 'none'
                    }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="rq-password-strength-box">
                <div className="rq-strength-meta">
                  <span className="rq-strength-title">Seguridad de la clave</span>
                  {nuevaContrasena && (
                    <span className={`rq-strength-pill ${strengthInfo.pillClass}`}>
                      {strengthInfo.label}
                    </span>
                  )}
                </div>

                <div className="rq-strength-bars" role="progressbar" aria-valuenow={validRulesCount} aria-valuemin={0} aria-valuemax={4} aria-label="Nivel de seguridad">
                  {[1, 2, 3, 4].map((barIndex) => (
                    <div
                      key={barIndex}
                      className={`rq-strength-bar ${validRulesCount >= barIndex ? `is-active is-level-${strengthInfo.level}` : ''}`}
                    />
                  ))}
                </div>

                <div className="rq-requirements-grid">
                  {passwordRules.map((rule) => (
                    <div key={rule.label} className={`rq-requirement-item ${rule.valid ? 'is-valid' : ''}`}>
                      <div className="rq-requirement-badge">
                        {rule.valid ? <Check size={10} strokeWidth={3} /> : <span className="rq-requirement-dot" />}
                      </div>
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ 
                  color: 'var(--color-outline)', 
                  fontSize: '12px', 
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  CONFIRMAR CONTRASEÑA
                </label>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e4e2e1', transition: 'border-color 0.2s', paddingBottom: '8px', position: 'relative' }}>
                  <LockKeyhole size={18} color="var(--color-outline)" />
                  <input
                    type={showConfirmation ? 'text' : 'password'}
                    value={confirmarContrasena}
                    onChange={(e) => setConfirmarContrasena(e.target.value)}
                    autoComplete="new-password"
                    required
                    placeholder="••••••••"
                    style={{
                      flex: 1,
                      border: 'none',
                      marginLeft: '12px',
                      paddingRight: '36px',
                      fontSize: '15px',
                      color: 'var(--color-on-surface)',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      letterSpacing: showConfirmation ? 'normal' : '2px'
                    }}
                    onFocus={(e) => e.target.parentElement.style.borderBottom = '1px solid var(--color-primary)'}
                    onBlur={(e) => e.target.parentElement.style.borderBottom = '1px solid #e4e2e1'}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmation(!showConfirmation)}
                    style={{
                      position: 'absolute',
                      right: '0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-outline)',
                      outline: 'none'
                    }}
                  >
                    {showConfirmation ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {confirmarContrasena && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 500,
                    color: nuevaContrasena === confirmarContrasena ? '#16a34a' : '#dc2626'
                  }}>
                    {nuevaContrasena === confirmarContrasena ? (
                      <>
                        <Check size={13} strokeWidth={2.5} />
                        <span>Las contraseñas coinciden</span>
                      </>
                    ) : (
                      <span>Las contraseñas no coinciden</span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    borderRadius: '6px', 
                    backgroundColor: 'var(--color-primary)', 
                    color: 'white',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.8 : 1,
                    boxShadow: 'var(--shadow-level-1)'
                  }}
                >
                  {loading ? 'ACTUALIZANDO...' : 'CAMBIAR CONTRASEÑA'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem(TOKEN_KEY);
                    sessionStorage.removeItem(EMAIL_KEY);
                    navigate('/login');
                  }}
                  disabled={loading}
                  className="recovery-cancel-btn"
                >
                  CANCELAR
                </button>
              </div>
            </form>
          )}

          <div style={{ 
            marginTop: '32px', 
            display: 'flex', 
            justifyContent: 'space-between',
            color: 'var(--color-surface-dim)',
            fontSize: '12px',
            textTransform: 'uppercase',
            fontWeight: 600
          }}>
            <span>RIMAQMASI EDU © 2026</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-surface-dim)' }}></div>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-surface-dim)' }}></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
