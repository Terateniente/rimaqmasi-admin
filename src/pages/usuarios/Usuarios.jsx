import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'sonner';
import { 
  Search, Users, GraduationCap, Trophy, Activity, 
  ChevronDown, Download, Flame, Edit2, Trash2, ShieldCheck, X, Power, UserPlus, Eye, EyeOff
} from 'lucide-react';
import { getUsuarios, deleteUsuario, cambiarEstadoUsuario, createUsuario } from '../../services/userService';
import { matchesSearch } from '../../utils/searchUtils';
import { AuthContext } from '../../context/AuthContext';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import './Usuarios.css';

const getLevelFromXP = (xp) => Math.floor(xp / 1000) + 1;

const formatDate = (isoString) => {
  if (!isoString) return '---';
  const date = new Date(isoString);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const Usuarios = () => {
  const { user: currentUser } = useContext(AuthContext);
  const isSuperAdmin = currentUser?.rol === 'super_admin';
  const isAdmin = currentUser?.rol === 'admin';

  const [usuarios, setUsuarios] = useState([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('estudiantes'); // estudiantes | administradores

  // Modales
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({ nombres: '', apellidos: '', correo: '', contrasena: '', rol: 'admin', idioma_origen_id: 1 });
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const BACKEND_HOST = API_URL.replace('/api/v1', '');
  
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath.startsWith('/public') ? `${BACKEND_HOST}${cleanPath}` : `${BACKEND_HOST}/public${cleanPath}`;
  };

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const res = await getUsuarios();
      const data = res.data || res;
      setUsuarios(data);
    } catch (error) {
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, []);

  useEffect(() => {
    let filtered = usuarios;
    if (activeTab === 'estudiantes') {
      filtered = usuarios.filter(u => ['student', 'estudiante', 'alumno'].includes(u.rol?.toLowerCase()));
    } else if (activeTab === 'administradores') {
      filtered = usuarios.filter(u => ['admin', 'administrador', 'super_admin'].includes(u.rol?.toLowerCase()));
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        matchesSearch(u.nombres + ' ' + u.apellidos, searchTerm) ||
        matchesSearch(u.correo, searchTerm)
      );
    }
    setFilteredUsuarios(filtered);
  }, [searchTerm, usuarios, activeTab]);

  const handleDeleteClick = (u) => {
    setUsuarioToDelete(u);
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  const handleToggleEstado = async (u) => {
    const newEstado = u.estado === 'activo' ? 'desactivado' : 'activo';
    const toastId = toast.loading(`Cambiando estado a ${newEstado}...`);
    try {
      await cambiarEstadoUsuario(u.id || u.usuarios_id, newEstado);
      toast.success(`Usuario marcado como ${newEstado}`, { id: toastId });
      loadUsuarios();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al cambiar estado';
      toast.error(msg, { id: toastId });
    }
  };

  const confirmDelete = async () => {
    if (!usuarioToDelete) return;
    if (deleteConfirmText.trim().toLowerCase() !== (usuarioToDelete.nombres || '').trim().toLowerCase()) {
      toast.error('El nombre no coincide. Operación cancelada.');
      return;
    }

    setIsDeleting(true);
    const toastId = toast.loading(isSuperAdmin ? 'Eliminando usuario...' : 'Desactivando usuario...');
    
    try {
      if (isSuperAdmin) {
        await deleteUsuario(usuarioToDelete.id || usuarioToDelete.usuarios_id);
        toast.success('Usuario eliminado exitosamente', { id: toastId });
      } else {
        await cambiarEstadoUsuario(usuarioToDelete.id || usuarioToDelete.usuarios_id, 'desactivado');
        toast.success('Usuario desactivado exitosamente', { id: toastId });
      }
      setShowDeleteModal(false);
      loadUsuarios();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al procesar la solicitud';
      toast.error(msg, { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    const toastId = toast.loading('Creando administrador...');
    try {
      await createUsuario(createData);
      toast.success('Administrador creado exitosamente', { id: toastId });
      setShowCreateModal(false);
      setCreateData({ nombres: '', apellidos: '', correo: '', contrasena: '', rol: 'admin', idioma_origen_id: 1 });
      loadUsuarios();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al crear administrador';
      toast.error(msg, { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const students = usuarios.filter(u => ['student', 'estudiante', 'alumno'].includes(u.rol?.toLowerCase()));
  const activeStudents = students.filter(u => u.estado !== 'desactivado').length;
  const totalXp = students.reduce((acc, u) => acc + (u.xp_total || 0), 0);
  const avgStreak = students.length ? Math.round(students.reduce((acc, u) => acc + (u.racha_actual || 0), 0) / students.length) : 0;

  const formatDays = (totalDays) => {
    if (!totalDays) return '0 Días';
    if (totalDays < 30) return `${totalDays} Días`;
    
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = (totalDays % 365) % 30;
    
    let parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'Año' : 'Años'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'Mes' : 'Meses'}`);
    if (years === 0 && days > 0) parts.push(`${days} Días`);
    
    return parts.join(', ') || `${totalDays} Días`;
  };

  return (
    <div className="usuarios-page">
      
      {/* Cabecera */}
      <div className="usuarios-header">
        <div>
          <div className="usuarios-header-title rq-page-heading">
            <div className="usuarios-header-indicator rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">Gestión de Usuarios</h1>
          </div>
          <p>Administre los perfiles de estudiantes y administradores. Supervise rachas, crecimiento de XP y estado de cuenta.</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <UserPlus size={18} />
            Nuevo Administrador
          </button>
        )}
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="stats-grid">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="stat-card">
              <div>
                <div className="skeleton" style={{ width: '120px', height: '14px', marginBottom: '14px', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ width: '80px', height: '28px', borderRadius: '6px' }}></div>
              </div>
              <div className="skeleton stat-card-icon"></div>
            </div>
          ))
        ) : (
          [
            { label: 'Estudiantes Activos', value: activeStudents.toLocaleString(), icon: <GraduationCap size={20} color="var(--color-secondary)" />, bg: 'color-mix(in srgb, var(--color-secondary) 15%, transparent)' },
            { label: 'XP Total', value: (totalXp >= 1000 ? (totalXp/1000).toFixed(1) + 'k' : totalXp), icon: <Trophy size={20} color="var(--color-tertiary)" />, bg: 'color-mix(in srgb, var(--color-tertiary) 15%, transparent)' },
            { label: 'Racha Promedio', value: formatDays(avgStreak), icon: <Flame size={20} color="var(--color-error)" />, bg: 'color-mix(in srgb, var(--color-error) 15%, transparent)' }
          ].map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="stat-card-info">
                <p>{stat.label}</p>
                <h3>{stat.value}</h3>
              </div>
              <div className="stat-card-icon" style={{ backgroundColor: stat.bg }}>
                {stat.icon}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tabs */}
      {isSuperAdmin && (
        <div className="tabs-container">
          <button 
            onClick={() => setActiveTab('estudiantes')}
            className={`tab-button ${activeTab === 'estudiantes' ? 'active' : ''}`}
          >
            Estudiantes
          </button>
          <button 
            onClick={() => setActiveTab('administradores')}
            className={`tab-button ${activeTab === 'administradores' ? 'active' : ''}`}
          >
            Administradores
          </button>
        </div>
      )}

      {/* Buscador y Filtros */}
      <div className="table-controls">
        <div className="search-input-wrapper">
          <Search size={16} color="var(--color-outline)" />
          <input 
            type="text" 
            placeholder="Buscar usuarios por nombre o correo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-secondary">
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* Tabla de Usuarios */}
      <div className="corporate-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="corporate-table">
            <thead>
              <tr>
                <th>Usuario</th>
                {activeTab === 'estudiantes' && <th>Racha</th>}
                {activeTab === 'estudiantes' && <th>XP Total</th>}
                {activeTab === 'administradores' && <th>Rol</th>}
                <th>Estado</th>
                <th>Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    <td>
                      <div className="user-cell">
                        <div className="skeleton user-avatar"></div>
                        <div className="user-info">
                          <div className="skeleton" style={{ width: '120px', height: '14px', marginBottom: '6px' }}></div>
                          <div className="skeleton" style={{ width: '180px', height: '10px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td colSpan={5}><div className="skeleton" style={{ width: '100%', height: '20px' }}></div></td>
                  </tr>
                ))
              ) : filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--color-outline)' }}>
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((u) => {
                  const userId = u.id || u.usuarios_id;
                  const rol = (u.rol || 'student').toLowerCase();
                  const xpTotal = u.xp_total || 0;
                  const level = getLevelFromXP(xpTotal);
                  const progress = (xpTotal % 1000) / 1000 * 100;
                  const isInactive = u.estado === 'desactivado';

                  return (
                    <tr key={userId} style={{ opacity: isInactive ? 0.7 : 1 }}>
                      <td>
                        <div className="user-cell">
                          {u.url_foto_perfil ? (
                            <img src={getImageUrl(u.url_foto_perfil)} alt="Avatar" className="user-avatar" style={{ filter: isInactive ? 'grayscale(1)' : 'none' }} crossOrigin="anonymous" />
                          ) : (
                            <div className="user-avatar-fallback">
                              {(u.nombres || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="user-info">
                            <p className="user-name">{u.nombres} {u.apellidos}</p>
                            <p className="user-email">{u.correo}</p>
                          </div>
                        </div>
                      </td>
                      {activeTab === 'estudiantes' && (
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Flame size={16} color="var(--color-error)" />
                            <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{formatDays(u.racha_actual || 0)}</span>
                          </div>
                        </td>
                      )}
                      {activeTab === 'estudiantes' && (
                        <td style={{ minWidth: '140px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>{xpTotal.toLocaleString()} XP</span>
                            <span style={{ color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Nvl {level}</span>
                          </div>
                          <div className="xp-progress-bar">
                            <div className="xp-progress-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                        </td>
                      )}
                      {activeTab === 'administradores' && (
                        <td>
                          <span className="badge admin">
                            {rol === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </span>
                        </td>
                      )}
                      <td>
                        <span className={`badge ${isInactive ? 'inactive' : 'active'}`}>
                          {isInactive ? 'Inactivo' : 'Activo'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>
                        {formatDate(u.creado_en)}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {isSuperAdmin && currentUser?.id !== userId && (
                            <button onClick={() => handleToggleEstado(u)} title={isInactive ? 'Activar' : 'Desactivar'} className="btn-icon">
                               <Power size={16} />
                            </button>
                          )}
                          {isAdmin && !isSuperAdmin && activeTab === 'estudiantes' && (
                             <button onClick={() => handleToggleEstado(u)} title={isInactive ? 'Activar' : 'Desactivar'} className="btn-icon">
                               <Power size={16} />
                             </button>
                          )}
                          {isSuperAdmin && currentUser?.id !== userId && (
                             <button onClick={() => handleDeleteClick(u)} title="Eliminar permanentemente" className="btn-icon danger">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer info de tabla */}
        {!loading && (
          <div className="table-footer">
            <span>Mostrando {filteredUsuarios.length} usuarios</span>
            {/* Paginación mock */}
            <div className="pagination">
              <button>{'<'}</button>
              <button className="active">1</button>
              <button>{'>'}</button>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        open={showDeleteModal && Boolean(usuarioToDelete)}
        title={isSuperAdmin ? '¿Eliminar usuario?' : '¿Desactivar usuario?'}
        itemName={usuarioToDelete ? `${usuarioToDelete.nombres} ${usuarioToDelete.apellidos || ''}`.trim() : ''}
        description={isSuperAdmin ? undefined : <>Se desactivará <strong>“{usuarioToDelete?.nombres} {usuarioToDelete?.apellidos}”</strong> y ya no podrá ingresar al sistema.</>}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        confirmLabel={isSuperAdmin ? 'Sí, eliminar' : 'Sí, desactivar'}
        busy={isDeleting}
        confirmDisabled={deleteConfirmText.trim().toLowerCase() !== (usuarioToDelete?.nombres || '').trim().toLowerCase()}
      >
        <div style={{ marginTop: '20px', textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
            Escribe el nombre del usuario ({(usuarioToDelete?.nombres || '').trim()}) para confirmar
          </label>
          <input 
            type="text" 
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={usuarioToDelete?.nombres}
            style={{ 
              width: '100%', padding: '12px 16px', borderRadius: '8px', 
              border: '1px solid var(--color-outline-variant)', backgroundColor: 'var(--color-surface-container)',
              color: 'var(--color-on-surface)', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--color-error)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'}
          />
        </div>
      </DeleteConfirmationModal>

      {/* Modal Crear Administrador */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '20px', padding: '32px', boxShadow: 'var(--shadow-level-3)', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus color="var(--color-primary)" size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--color-on-surface)', fontWeight: 700 }}>Nuevo Administrador</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-outline)' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 calc(50% - 8px)' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Nombre</label>
                  <input 
                    type="text" required
                    value={createData.nombres} onChange={e => setCreateData({...createData, nombres: e.target.value})}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--color-outline-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }}
                  />
                </div>
                <div style={{ flex: '1 1 calc(50% - 8px)' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Apellido</label>
                  <input 
                    type="text" required
                    value={createData.apellidos} onChange={e => setCreateData({...createData, apellidos: e.target.value})}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--color-outline-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Correo Electrónico</label>
                <input 
                  type="email" required placeholder="admin@rimaqmasi.com"
                  value={createData.correo} onChange={e => setCreateData({...createData, correo: e.target.value})}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--color-outline-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Contraseña Provisoria</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} required minLength={6} placeholder="Mínimo 6 caracteres"
                    value={createData.contrasena} onChange={e => setCreateData({...createData, contrasena: e.target.value})}
                    style={{ width: '100%', padding: '12px 40px 12px 14px', borderRadius: '10px', border: '1px solid var(--color-outline-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', outline: 'none', boxSizing: 'border-box', fontSize: '14px' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} disabled={isCreating} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)', border: 'none', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-high)'}>
                  Cancelar
                </button>
                <button type="submit" disabled={isCreating} style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', fontWeight: 600, cursor: isCreating ? 'not-allowed' : 'pointer', opacity: isCreating ? 0.8 : 1, transition: 'all 0.2s', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent)' }} onMouseOver={e => !isCreating && (e.currentTarget.style.filter = 'brightness(1.1)')} onMouseOut={e => e.currentTarget.style.filter = 'none'}>
                  {isCreating ? 'Creando...' : 'Crear Administrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
