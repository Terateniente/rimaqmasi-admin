import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import { ShieldCheck, Lock, Eye, EyeOff, X, User } from 'lucide-react';
import { getUsuarioById, updateUsuarioPerfil, updateUsuarioFoto, updateUsuarioContrasena } from '../services/userService';

export const ProfileModal = ({ onClose }) => {
  const { user, loginAuth } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('personal');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef(null);

  const { register: registerPerfil, handleSubmit: handleSubmitPerfil, reset: resetPerfil, formState: { errors: errorsPerfil } } = useForm();
  const { register: registerAuth, handleSubmit: handleSubmitAuth, reset: resetAuth, formState: { errors: errorsAuth }, watch: watchAuth } = useForm();

  const currentUserId = user?.id || user?.usuario_id;

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    const baseUrl = API_URL.replace('/api/v1', '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath.startsWith('/public') ? `${baseUrl}${cleanPath}` : `${baseUrl}/public${cleanPath}`;
  };

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
    } catch (error) {
      toast.error('Error al cargar la información del perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  const onUpdatePerfil = async (data) => {
    const toastId = toast.loading('Actualizando información personal...');
    try {
      await updateUsuarioPerfil(currentUserId, data);
      toast.success('Perfil actualizado exitosamente', { id: toastId });
      const userRes = await getUsuarioById(currentUserId);
      loginAuth(userRes.data || userRes, localStorage.getItem('token'));
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
      loginAuth(userRes.data || userRes, localStorage.getItem('token'));
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
        maxWidth: '500px',
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
                Administra tus datos personales y credenciales de acceso.
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
              <ShieldCheck size={16} /> Seguridad
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
                      <img src={getImageUrl(profileData.url_foto_perfil)} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
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
            <form onSubmit={handleSubmitAuth(onUpdatePassword)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--color-surface-variant)', paddingTop: '20px' }}>
                <button type="button" onClick={onClose} style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', backgroundColor: 'transparent', color: 'var(--color-on-surface)', fontWeight: 600, cursor: 'pointer' }}>
                  Cerrar
                </button>
                <button type="submit" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                  Guardar Cambios
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
