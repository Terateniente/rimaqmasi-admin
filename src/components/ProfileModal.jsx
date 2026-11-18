import React, { useState, useEffect, useRef, useId } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { ShieldCheck, Eye, EyeOff, X, User, Laptop, Smartphone, Trash2, LogOut } from 'lucide-react';
import { getUsuarioById, updateUsuarioPerfil, updateUsuarioFoto, updateUsuarioContrasena } from '../services/userService';
import { getActiveSessions, revokeSession, logoutAllSessions } from '../services/authService';
import { getStoredRefreshToken, getStoredToken, resolveMediaUrl } from '../services/api';

export const ProfileModal = ({ onClose }) => {
  const { user, loginAuth, logoutAuth } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('personal');

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const baseId = useId();

  const { register: registerPerfil, handleSubmit: handleSubmitPerfil, reset: resetPerfil, formState: { errors: errorsPerfil } } = useForm();
  const { register: registerAuth, handleSubmit: handleSubmitAuth, reset: resetAuth, watch: watchAuth } = useForm();

  const currentUserId = user?.id || user?.usuario_id;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  const loadData = async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const userRes = await getUsuarioById(currentUserId);
      const userData = userRes.data || userRes;
      setProfileData(userData);
      resetPerfil({
        nombres: userData.nombres || '',
        apellidos: userData.apellidos || '',
      });
    } catch {
      toast.error('Error al cargar la información del perfil');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const list = await getActiveSessions();
      setSessions(Array.isArray(list) ? list : []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  useEffect(() => {
    if (currentTab === 'security') {
      loadSessions();
    }
  }, [currentTab]);

  const onUpdatePerfil = async (data) => {
    const toastId = toast.loading('Actualizando información personal...');
    try {
      await updateUsuarioPerfil(currentUserId, data);
      toast.success('Perfil actualizado exitosamente', { id: toastId });
      const userRes = await getUsuarioById(currentUserId);
      loginAuth(userRes.data || userRes, getStoredToken(), getStoredRefreshToken());
      loadData();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al actualizar perfil', { id: toastId });
    }
  };

  const onUpdatePassword = async (data) => {
    const toastId = toast.loading('Actualizando contraseña...');
    try {
      await updateUsuarioContrasena(currentUserId, data);
      toast.success('Contraseña actualizada exitosamente', { id: toastId });
      resetAuth();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al actualizar contraseña', { id: toastId });
    }
  };

  const handleRevokeSession = async (sesion) => {
    try {
      await revokeSession(sesion.sesion_id);
      if (sesion.actual) {
        toast.success('Sesión actual cerrada');
        logoutAuth();
        onClose();
        return;
      }
      toast.success('Dispositivo desvinculado correctamente');
      loadSessions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo cerrar la sesión seleccionada');
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAllSessions();
      toast.success('Se cerraron todas las sesiones activas');
      logoutAuth();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudieron cerrar las sesiones');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande. El límite es 5MB.');
      e.target.value = '';
      return;
    }

    const toastId = toast.loading('Subiendo foto de perfil...');
    try {
      await updateUsuarioFoto(currentUserId, file);
      toast.success('Foto de perfil actualizada', { id: toastId });
      const userRes = await getUsuarioById(currentUserId);
      loginAuth(userRes.data || userRes, getStoredToken(), getStoredRefreshToken());
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al actualizar foto', { id: toastId });
    }
  };

  return (
    <div
      role="presentation"
      className="rq-modal-backdrop rq-profile-modal"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        className="rq-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="rq-profile-modal__header">
          <div className="rq-profile-modal__title-row">
            <div>
              <h2 id={`${baseId}-title`}>Configuración de Perfil</h2>
              <p>Administra tus datos personales, contraseña y sesiones activas.</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Cerrar configuración de perfil"
              className="rq-icon-close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rq-profile-modal__tabs" role="tablist" aria-label="Secciones de perfil">
            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'personal'}
              onClick={() => setCurrentTab('personal')}
              className={`rq-profile-modal__tab ${currentTab === 'personal' ? 'is-active' : ''}`}
            >
              Datos Generales
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={currentTab === 'security'}
              onClick={() => setCurrentTab('security')}
              className={`rq-profile-modal__tab ${currentTab === 'security' ? 'is-active' : ''}`}
            >
              <ShieldCheck size={16} aria-hidden="true" /> Seguridad y Sesiones
            </button>
          </div>
        </header>

        <div className="rq-profile-modal__body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-on-surface-variant)' }}>Cargando…</div>
          ) : currentTab === 'personal' ? (
            <form onSubmit={handleSubmitPerfil(onUpdatePerfil)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Cambiar foto de perfil"
                  className="rq-profile-modal__avatar-btn"
                >
                  <div className="rq-profile-modal__avatar-circle">
                    {profileData?.url_foto_perfil ? (
                      <img src={resolveMediaUrl(profileData.url_foto_perfil)} alt="Foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                    ) : (
                      <User size={30} color="var(--color-on-surface-variant)" />
                    )}
                  </div>
                  <span>Cambiar foto</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
              </div>

              <div className="responsive-grid-2">
                <div className="rq-field" style={{ marginBottom: 0 }}>
                  <label htmlFor={`${baseId}-nombres`} className="rq-field__label">Nombres</label>
                  <input
                    id={`${baseId}-nombres`}
                    {...registerPerfil('nombres', { required: 'Requerido' })}
                    className={`rq-field__input ${errorsPerfil.nombres ? 'rq-field__input--error' : ''}`.trim()}
                  />
                  {errorsPerfil.nombres && <span className="rq-field__error">{errorsPerfil.nombres.message}</span>}
                </div>
                <div className="rq-field" style={{ marginBottom: 0 }}>
                  <label htmlFor={`${baseId}-apellidos`} className="rq-field__label">Apellidos</label>
                  <input
                    id={`${baseId}-apellidos`}
                    {...registerPerfil('apellidos', { required: 'Requerido' })}
                    className={`rq-field__input ${errorsPerfil.apellidos ? 'rq-field__input--error' : ''}`.trim()}
                  />
                  {errorsPerfil.apellidos && <span className="rq-field__error">{errorsPerfil.apellidos.message}</span>}
                </div>
              </div>

              <div className="rq-field" style={{ marginBottom: 0 }}>
                <label htmlFor={`${baseId}-correo`} className="rq-field__label">Correo electrónico (no modificable)</label>
                <input
                  id={`${baseId}-correo`}
                  value={profileData?.correo || ''}
                  disabled
                  className="rq-field__input"
                  style={{ background: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid var(--color-outline-variant)', paddingTop: '18px' }}>
                <button type="button" onClick={onClose} className="rq-button rq-button--ghost">
                  Cerrar
                </button>
                <button type="submit" className="rq-button rq-button--primary">
                  Guardar cambios
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <form onSubmit={handleSubmitAuth(onUpdatePassword)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="rq-field" style={{ marginBottom: 0 }}>
                  <label htmlFor={`${baseId}-curr-pass`} className="rq-field__label">Contraseña actual</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id={`${baseId}-curr-pass`}
                      type={showCurrentPassword ? 'text' : 'password'}
                      {...registerAuth('contrasenaActual', { required: 'Requerido' })}
                      className="rq-field__input"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                      className="rq-profile-modal__eye"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="rq-field" style={{ marginBottom: 0 }}>
                  <label htmlFor={`${baseId}-new-pass`} className="rq-field__label">Nueva contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id={`${baseId}-new-pass`}
                      type={showNewPassword ? 'text' : 'password'}
                      {...registerAuth('nuevaContrasena', { required: 'Requerido', minLength: 8 })}
                      className="rq-field__input"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                      className="rq-profile-modal__eye"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="rq-field" style={{ marginBottom: 0 }}>
                  <label htmlFor={`${baseId}-conf-pass`} className="rq-field__label">Confirmar nueva contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id={`${baseId}-conf-pass`}
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...registerAuth('confirmarContrasena', { required: 'Requerido', validate: (val) => val === watchAuth('nuevaContrasena') || 'No coinciden' })}
                      className="rq-field__input"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                      className="rq-profile-modal__eye"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="submit" className="rq-button rq-button--primary">
                    Actualizar contraseña
                  </button>
                </div>
              </form>

              <div style={{ borderTop: '1px solid var(--color-outline-variant)', paddingTop: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--color-on-surface)' }}>Dispositivos con sesión activa</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--color-on-surface-variant)' }}>
                      Revoca cualquier sesión abierta en otros navegadores o teléfonos.
                    </p>
                  </div>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={handleLogoutAll}
                      className="rq-button"
                      style={{
                        minHeight: '34px',
                        padding: '6px 12px',
                        border: '1px solid color-mix(in srgb, var(--color-error-text) 40%, transparent)',
                        backgroundColor: 'var(--color-error-container)',
                        color: 'var(--color-on-error-container)',
                        fontSize: '12px',
                      }}
                    >
                      <LogOut size={14} /> Cerrar todas
                    </button>
                  )}
                </div>

                {sessionsLoading ? (
                  <div style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', padding: '12px 0' }}>
                    Consultando sesiones activas…
                  </div>
                ) : sessions.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', padding: '12px 0' }}>
                    No se encontraron sesiones registradas.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessions.map((sesion) => {
                      const isMobile = sesion.plataforma === 'android' || sesion.plataforma === 'ios';
                      return (
                        <div key={sesion.sesion_id} className="rq-profile-modal__session-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            {isMobile ? <Smartphone size={18} color="var(--color-primary-text)" /> : <Laptop size={18} color="var(--color-primary-text)" />}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                                <span>{sesion.nombre_dispositivo || 'Sesión activa'}</span>
                                {sesion.actual && (
                                  <span style={{
                                    fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                                    backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', fontWeight: 700
                                  }}>
                                    Actual
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                                Iniciada: {sesion.iniciada_en ? new Date(sesion.iniciada_en).toLocaleString('es-PE') : 'Reciente'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(sesion)}
                            title={sesion.actual ? 'Cerrar esta sesión' : 'Revocar acceso a este dispositivo'}
                            className="rq-button"
                            style={{
                              minHeight: '34px',
                              padding: '5px 10px',
                              border: '1px solid var(--color-outline-variant)',
                              backgroundColor: 'var(--color-surface)',
                              color: 'var(--color-error-text)',
                              fontSize: '12px',
                            }}
                          >
                            <Trash2 size={14} /> {sesion.actual ? 'Salir' : 'Revocar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
