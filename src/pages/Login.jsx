import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { login } from '../services/authService';
import './PasswordRecovery.css';

const getLoginErrorMessage = (error) => {
  const status = error.response?.status;
  if (!error.response) {
    return 'No pudimos conectar con el servidor. Verifica que el backend esté iniciado e inténtalo nuevamente.';
  }
  if (status === 503) {
    return error.response.data?.message || 'El servicio de datos no está disponible. Inténtalo nuevamente en unos minutos.';
  }
  if (status >= 500) {
    return 'El servidor encontró un problema. Inténtalo nuevamente o contacta con soporte si continúa.';
  }
  return error.response.data?.message || 'No pudimos iniciar sesión. Revisa tus credenciales.';
};

export const Login = () => {
  const { loginAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('rememberedEmail')));
  const [loginError, setLoginError] = useState('');
  const { register, handleSubmit, formState: { errors }, setValue } = useForm();

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) setValue('correo', savedEmail);
  }, [setValue]);

  useEffect(() => {
    if (location.state?.passwordResetMessage) {
      toast.success(location.state.passwordResetMessage);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setLoginError('');
    try {
      const response = await login(data.correo.trim().toLowerCase(), data.contrasena);
      if (response.success || response.token || response.data?.token) {
        const token = response.token || response.data?.token;
        const usuario = response.usuario || response.data?.usuario || { correo: data.correo, rol: 'administrador' };
        const rol = (usuario.rol || '').toLowerCase();
        if (!['admin', 'administrador', 'super admin', 'super admi', 'super_admin'].includes(rol)) {
          setLoginError('Acceso denegado. Esta cuenta no tiene permisos administrativos.');
          return;
        }
        if (rememberMe) localStorage.setItem('rememberedEmail', data.correo);
        else localStorage.removeItem('rememberedEmail');
        loginAuth(usuario, token);
        toast.success(response.message || 'Sesión iniciada exitosamente');
        navigate('/dashboard');
      }
    } catch (error) {
      setLoginError(getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="recovery-page login-page">
      <div className="recovery-page__glow recovery-page__glow--red" />
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__rainbow" aria-hidden="true" />
        <header className="login-card__header">
          <p>Panel de administración</p>
          <h1 id="login-title">Bienvenido</h1>
        </header>

        <div className="login-card__body">
          {loginError && <div className="recovery-alert recovery-alert--error" role="alert" aria-live="polite">{loginError}</div>}
          <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isLoading}>
            <div className="login-field">
              <label htmlFor="admin-email">Usuario o correo</label>
              <div className="login-input">
                <User size={18} aria-hidden="true" />
                <input id="admin-email" type="email" autoComplete="username" placeholder="admin@idiomas.com" aria-invalid={Boolean(errors.correo)} aria-describedby={errors.correo ? 'admin-email-error' : undefined} {...register('correo', { required: 'El correo es requerido', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Correo inválido' } })} />
              </div>
              {errors.correo && <span id="admin-email-error" className="login-field-error" role="alert">{errors.correo.message}</span>}
            </div>

            <div className="login-field">
              <label htmlFor="admin-password">Contraseña</label>
              <div className="login-input">
                <Lock size={18} aria-hidden="true" />
                <input id="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" aria-invalid={Boolean(errors.contrasena)} aria-describedby={errors.contrasena ? 'admin-password-error' : undefined} {...register('contrasena', { required: 'La contraseña es requerida' })} />
                <button className="login-eye" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.contrasena && <span id="admin-password-error" className="login-field-error" role="alert">{errors.contrasena.message}</span>}
            </div>

            <div className="login-form__options">
              <label className="login-check"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>Recordarme</span></label>
              <Link to="/recuperar-contrasena">¿Olvidaste tu clave?</Link>
            </div>

            <button className="login-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Ingresando…' : 'Ingresar al sistema'}
            </button>
          </form>
        </div>

        <footer className="login-card__footer">
          <span>RimaqMasi EDU © 2026</span>
          <span className="login-card__status" aria-hidden="true"><i /><i /></span>
        </footer>
      </section>
    </main>
  );
};
