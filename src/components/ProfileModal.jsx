import React, { useState, useEffect, useRef } from 'react';
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

  const { register: registerPerfil, handleSubmit: handleSubmitPerfil, reset: resetPerfil, formState: { errors: errorsPerfil } } = useForm();
  const { register: registerAuth, handleSubmit: handleSubmitAuth, reset: resetAuth, watch: watchAuth } = useForm();

  const currentUserId = user?.id || user?.usuario_id;

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
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-level-3)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 0', borderBottom: '1px solid var(--color-surface-variant)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: 'var(--color-on-surface)' }}>Configuración de Perfil</h2>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
                Administra tus datos personales, contraseña y sesiones activas.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'var(--color-surface-variant)', border: 'none',
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-on-surface-variant)', cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => setCurrentTab('personal')}
              style={{
                padding: '12px 0', border: 'none', background: 'transparent',
                borderBottom: currentTab === 'personal' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: currentTab === 'personal' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Datos Generales
            </button>
            <button
              onClick={() => setCurrentTab('security')}
              style={{
                padding: '12px 0', border: 'none', background: 'transparent',
                borderBottom: currentTab === 'security' ? '2px solid var(--color-primary)' : '2px solid transparent',
                color: currentTab === 'security' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <ShieldCheck size={16} /> Seguridad y Sesiones
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Cargando...</div>
          ) : currentTab === 'personal' ? (
            <form onSubmit={handleSubmitPerfil(onUpdatePerfil)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    backgroundColor: 'var(--color-surface-variant)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--color-outline-variant)'
                  }}>
                    {profileData?.url_foto_perfil ? (
                      <img src={resolveMediaUrl(profileData.url_foto_perfil)} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                    ) : (
                      <User size={32} color="var(--color-outline)" />
                    )}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '10px', fontWeight: 700, color: 'var(--color-outline)', textAlign: 'center', letterSpacing: '0.5px' }}>
                    FOTO DE PERFIL
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-outline)', marginBottom: '6px', textTransform: 'uppercase' }}>Nombres</label>
                  <input
                    {...registerPerfil('nombres', { required: 'Requerido' })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', fontSize: '14px', outline: 'none' }}
                  />
                  {errorsPerfil.nombres && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errorsPerfil.nombres.message}</span>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-outline)', marginBottom: '6px', textTransform: 'uppercase' }}>Apellidos</label>
                  <input
                    {...registerPerfil('apellidos', { required: 'Requerido' })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', fontSize: '14px', outline: 'none' }}
                  />
                  {errorsPerfil.apellidos && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errorsPerfil.apellidos.message}</span>}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-outline)', marginBottom: '6px', textTransform: 'uppercase' }}>Correo Electrónico (No modificable)</label>
                <input
                  value={profileData?.correo || ''}
                  disabled
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container)', color: 'var(--color-outline)', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--color-surface-variant)', paddingTop: '20px' }}>
                <button type="button" onClick={onClose} style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', backgroundColor: 'transparent', color: 'var(--color-on-surface)', fontWeight: 600, cursor: 'pointer' }}>
                  Cerrar
                </button>
                <button type="submit" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <form onSubmit={handleSubmitAuth(onUpdatePassword)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-outline)', marginBottom: '6px', textTransform: 'uppercase' }}>Contraseña Actual</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      {...registerAuth('contrasenaActual', { required: 'Requerido' })}
                      style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', fontSize: '14px', outline: 'none' }}
                    />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-outline)', marginBottom: '6px', textTransform: 'uppercase' }}>Nueva Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      {...registerAuth('nuevaContrasena', { required: 'Requerido', minLength: 8 })}
                      style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', fontSize: '14px', outline: 'none' }}
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-outline)', marginBottom: '6px', textTransform: 'uppercase' }}>Confirmar Nueva Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...registerAuth('confirmarContrasena', { required: 'Requerido', validate: (val) => val === watchAuth('nuevaContrasena') || 'No coinciden' })}
                      style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', fontSize: '14px', outline: 'none' }}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                    Actualizar Contraseña
                  </button>
                </div>
              </form>

              <div style={{ borderTop: '1px solid var(--color-surface-variant)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--color-on-surface)' }}>Dispositivos con sesión activa</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                      Revoca cualquier sesión abierta en otros navegadores o teléfonos.
                    </p>
                  </div>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={handleLogoutAll}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: '8px',
                        border: '1px solid var(--color-error)', backgroundColor: 'transparent',
                        color: 'var(--color-error)', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      <LogOut size={14} /> Cerrar todas
                    </button>
                  )}
                </div>

                {sessionsLoading ? (
                  <div style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', padding: '12px 0' }}>
                    Consultando sesiones activas...
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
                        <div
                          key={sesion.sesion_id}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', borderRadius: '10px',
                            border: '1px solid var(--color-outline-variant)',
                            backgroundColor: 'var(--color-surface-container)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isMobile ? <Smartphone size={18} color="var(--color-primary)" /> : <Laptop size={18} color="var(--color-primary)" />}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                                <span>{sesion.nombre_dispositivo || 'Sesión activa'}</span>
                                {sesion.actual && (
                                  <span style={{
                                    fontSize: '10px', padding: '2px 7px', borderRadius: '999px',
                                    backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 700
                                  }}>
                                    Actual
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                                Iniciada: {sesion.iniciada_en ? new Date(sesion.iniciada_en).toLocaleString('es-PE') : 'Reciente'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(sesion)}
                            title={sesion.actual ? 'Cerrar esta sesión' : 'Revocar acceso a este dispositivo'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '6px 10px', borderRadius: '6px',
                              border: '1px solid var(--color-outline-variant)',
                              backgroundColor: 'transparent',
                              color: 'var(--color-error)', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
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
      </div>
    </div>
  );
};
