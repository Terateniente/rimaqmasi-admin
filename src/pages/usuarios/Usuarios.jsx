import { useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, GraduationCap, Trophy, Download, Flame, Trash2, X, Power, UserPlus, Eye, EyeOff, Users } from 'lucide-react';
import { getUsuarios, deleteUsuario, cambiarEstadoUsuario, createUsuario } from '../../services/userService';
import { downloadCsv } from '../../services/analyticsService';
import { resolveMediaUrl } from '../../services/api';
import { matchesSearch } from '../../utils/searchUtils';
import { AuthContext } from '../../context/AuthContext';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { PageHeader, EmptyState, Pagination } from '../../components/PageKit';
import './Usuarios.css';

const ITEMS_PER_PAGE = 10;
const STUDENT_ROLES = ['student', 'estudiante', 'alumno'];
const ADMIN_ROLES = ['admin', 'administrador', 'super_admin'];
const EMPTY_ADMIN = { nombres: '', apellidos: '', correo: '', contrasena: '', rol: 'admin', idioma_origen_id: 1 };

const userId = (u) => u?.id || u?.usuarios_id;
const fullName = (u) => `${u?.nombres || ''} ${u?.apellidos || ''}`.trim();
const hasRole = (u, roles) => roles.includes(u.rol?.toLowerCase());
const levelFromXp = (xp) => Math.floor(xp / 1000) + 1;
const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const formatDays = (total) => {
  if (!total) return '0 días';
  if (total < 30) return `${total} ${total === 1 ? 'día' : 'días'}`;
  const years = Math.floor(total / 365);
  const months = Math.floor((total % 365) / 30);
  const days = (total % 365) % 30;
  return [
    years && `${years} ${years === 1 ? 'año' : 'años'}`,
    months && `${months} ${months === 1 ? 'mes' : 'meses'}`,
    !years && days && `${days} días`,
  ].filter(Boolean).join(', ') || `${total} días`;
};

const Avatar = ({ user }) => {
  const [failed, setFailed] = useState(false);
  const src = resolveMediaUrl(user.url_foto_perfil);
  return (
    <span className="user-avatar" aria-hidden="true">
      {src && !failed ? <img src={src} alt="" crossOrigin="anonymous" onError={() => setFailed(true)} /> : (user.nombres || 'U')[0].toUpperCase()}
    </span>
  );
};

export const Usuarios = () => {
  const { user: currentUser } = useContext(AuthContext);
  const isSuperAdmin = currentUser?.rol === 'super_admin';
  const isAdmin = currentUser?.rol === 'admin';

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('estudiantes');
  const [currentPage, setCurrentPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState(EMPTY_ADMIN);
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const res = await getUsuarios();
      setUsuarios(res.data || res);
    } catch {
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsuarios(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab]);

  const isStudentsTab = activeTab === 'estudiantes';
  const filtered = usuarios
    .filter((u) => hasRole(u, isStudentsTab ? STUDENT_ROLES : ADMIN_ROLES))
    .filter((u) => matchesSearch(fullName(u), searchTerm) || matchesSearch(u.correo, searchTerm));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const visible = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const students = usuarios.filter((u) => hasRole(u, STUDENT_ROLES));
  const activeStudents = students.filter((u) => u.estado !== 'desactivado').length;
  const totalXp = students.reduce((acc, u) => acc + (u.xp_total || 0), 0);
  const avgStreak = students.length ? Math.round(students.reduce((acc, u) => acc + (u.racha_actual || 0), 0) / students.length) : 0;
  const stats = [
    { label: 'Estudiantes activos', value: activeStudents.toLocaleString(), icon: GraduationCap, tone: 'secondary' },
    { label: 'XP total', value: totalXp >= 1000 ? `${(totalXp / 1000).toFixed(1)}k` : totalXp, icon: Trophy, tone: 'tertiary' },
    { label: 'Racha promedio', value: formatDays(avgStreak), icon: Flame, tone: 'error' },
  ];

  const canToggle = (u) => String(currentUser?.id) !== String(userId(u)) && (isSuperAdmin || (isAdmin && isStudentsTab));

  const handleToggleEstado = async (u) => {
    const nuevo = u.estado === 'activo' ? 'desactivado' : 'activo';
    const toastId = toast.loading(`Cambiando estado a ${nuevo}...`);
    try {
      await cambiarEstadoUsuario(userId(u), nuevo);
      toast.success(`Usuario marcado como ${nuevo}`, { id: toastId });
      loadUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar estado', { id: toastId });
    }
  };

  const nameMatches = toDelete && deleteConfirmText.trim().toLowerCase() === (toDelete.nombres || '').trim().toLowerCase();

  const confirmDelete = async () => {
    if (!nameMatches) {
      toast.error('El nombre no coincide. Operación cancelada.');
      return;
    }
    setIsDeleting(true);
    const toastId = toast.loading(isSuperAdmin ? 'Eliminando usuario...' : 'Desactivando usuario...');
    try {
      if (isSuperAdmin) await deleteUsuario(userId(toDelete));
      else await cambiarEstadoUsuario(userId(toDelete), 'desactivado');
      toast.success(isSuperAdmin ? 'Usuario eliminado exitosamente' : 'Usuario desactivado exitosamente', { id: toastId });
      setToDelete(null);
      loadUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al procesar la solicitud', { id: toastId });
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
      setCreateData(EMPTY_ADMIN);
      loadUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear administrador', { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportCsv = () => {
    if (!filtered.length) {
      toast.info('No hay usuarios visibles para exportar');
      return;
    }
    const rows = filtered.map((u) => ({
      Nombres: u.nombres || '',
      Apellidos: u.apellidos || '',
      Correo: u.correo || '',
      Rol: u.rol || 'estudiante',
      Estado: u.estado || 'activo',
      RachaDias: u.racha_actual || 0,
      XPTotal: u.xp_total || 0,
      Registro: u.creado_en ? formatDate(u.creado_en) : '',
    }));
    downloadCsv(`rimaqmasi-usuarios-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success(`Exportados ${rows.length} usuarios a CSV`);
  };

  const setField = (key) => (e) => setCreateData({ ...createData, [key]: e.target.value });
  const columns = isStudentsTab ? 6 : 5;

  return (
    <div>
      <PageHeader
        title="Gestión de Usuarios"
        description="Administre los perfiles de estudiantes y administradores. Supervise rachas, crecimiento de XP y estado de cuenta."
        actions={isSuperAdmin && (
          <button type="button" className="rq-button rq-button--primary" onClick={() => setShowCreateModal(true)}>
            <UserPlus size={18} /> Nuevo Administrador
          </button>
        )}
      />

      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="stat-card">
            <div className="stat-card-info">
              <p>{label}</p>
              {loading ? <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 6 }} /> : <h3>{value}</h3>}
            </div>
            <span className={`stat-card-icon stat-card-icon--${tone}`} aria-hidden="true"><Icon size={20} /></span>
          </div>
        ))}
      </div>

      {isSuperAdmin && (
        <div className="tabs-container" role="tablist" aria-label="Tipo de usuario">
          {[['estudiantes', 'Estudiantes'], ['administradores', 'Administradores']].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={activeTab === key} className="tab-button" onClick={() => setActiveTab(key)}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="rq-toolbar" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end' }}>
        <div className="rq-filter">
          <label htmlFor="usuario-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input id="usuario-search" type="search" placeholder="Buscar usuarios por nombre o correo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <button type="button" className="rq-button rq-button--ghost" onClick={handleExportCsv}><Download size={16} /> Exportar CSV</button>
      </div>

      <div className="rq-table-card">
        <div className="table-responsive-container">
          <table className="rq-table" aria-busy={loading}>
            <thead>
              <tr>
                <th>Usuario</th>
                {isStudentsTab ? <><th>Racha</th><th>XP total</th></> : <th>Rol</th>}
                <th>Estado</th>
                <th>Registro</th>
                <th className="rq-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }, (_, i) => (
                  <tr key={i} aria-hidden="true">
                    <td><div className="rq-inline"><div className="skeleton user-avatar" /><div className="skeleton" style={{ width: 160, height: 14, borderRadius: 4 }} /></div></td>
                    <td colSpan={columns - 1}><div className="skeleton" style={{ height: 20, borderRadius: 6 }} /></td>
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={columns} className="rq-empty-cell">
                    <EmptyState icon={Users} title="No se encontraron usuarios" hint={searchTerm ? 'Intenta con otra búsqueda' : undefined} />
                  </td>
                </tr>
              ) : (
                visible.map((u) => {
                  const xp = u.xp_total || 0;
                  const isInactive = u.estado === 'desactivado';
                  const name = fullName(u);
                  return (
                    <tr key={userId(u)} className={isInactive ? 'is-muted' : ''}>
                      <td>
                        <div className="rq-person" style={{ marginTop: 0, gap: 12 }}>
                          <Avatar user={u} />
                          <div><strong>{name}</strong><small>{u.correo}</small></div>
                        </div>
                      </td>
                      {isStudentsTab ? (
                        <>
                          <td><span className="rq-inline rq-strong"><Flame size={16} color="var(--color-error-text)" aria-hidden="true" /> {formatDays(u.racha_actual || 0)}</span></td>
                          <td style={{ minWidth: 150 }}>
                            <div className="rq-inline" style={{ justifyContent: 'space-between', marginBottom: 6, fontSize: 11.5 }}>
                              <span className="rq-strong" style={{ color: 'var(--color-secondary-text)' }}>{xp.toLocaleString()} XP</span>
                              <span className="rq-muted">Nvl {levelFromXp(xp)}</span>
                            </div>
                            <span className="rq-progress__track" style={{ display: 'block' }}>
                              <span className="rq-progress__fill rq-progress__fill--secondary" style={{ width: `${(xp % 1000) / 10}%` }} />
                            </span>
                          </td>
                        </>
                      ) : (
                        <td><span className="rq-badge rq-badge--primary">{u.rol?.toLowerCase() === 'super_admin' ? 'Super Admin' : 'Admin'}</span></td>
                      )}
                      <td><span className={`rq-badge rq-badge--${isInactive ? 'danger' : 'success'}`}>{isInactive ? 'Inactivo' : 'Activo'}</span></td>
                      <td className="rq-muted" style={{ fontSize: 13.5 }}>{formatDate(u.creado_en)}</td>
                      <td className="rq-col-actions">
                        <div>
                          {canToggle(u) && (
                            <button type="button" className="rq-icon-btn" onClick={() => handleToggleEstado(u)} title={isInactive ? 'Activar' : 'Desactivar'} aria-label={`${isInactive ? 'Activar' : 'Desactivar'} a ${name}`}>
                              <Power size={16} />
                            </button>
                          )}
                          {isSuperAdmin && String(currentUser?.id) !== String(userId(u)) && (
                            <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => { setToDelete(u); setDeleteConfirmText(''); }} title="Eliminar permanentemente" aria-label={`Eliminar a ${name}`}>
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
      </div>

      {!loading && (
        <p className="rq-muted" style={{ margin: '12px 0 0' }}>
          Mostrando {visible.length} de {filtered.length} usuarios
        </p>
      )}
      <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />

      <DeleteConfirmationModal
        open={Boolean(toDelete)}
        title={isSuperAdmin ? '¿Eliminar usuario?' : '¿Desactivar usuario?'}
        itemName={fullName(toDelete)}
        description={isSuperAdmin ? undefined : <>Se desactivará <strong>“{fullName(toDelete)}”</strong> y ya no podrá ingresar al sistema.</>}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
        confirmLabel={isSuperAdmin ? 'Sí, eliminar' : 'Sí, desactivar'}
        busy={isDeleting}
        confirmDisabled={!nameMatches}
      >
        <div className="rq-field" style={{ marginTop: 20, textAlign: 'left' }}>
          <label htmlFor="delete-user-confirm-input" className="rq-field__label" style={{ textTransform: 'none', letterSpacing: 0 }}>
            Escribe el nombre del usuario ({(toDelete?.nombres || '').trim()}) para confirmar
          </label>
          <input id="delete-user-confirm-input" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder={toDelete?.nombres} className="rq-field__input" />
        </div>
      </DeleteConfirmationModal>

      {showCreateModal && (
        <div role="presentation" className="rq-modal-backdrop" onClick={() => !isCreating && setShowCreateModal(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-admin-modal-title" className="modal-content-responsive rq-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="rq-modal-header">
              <h2 id="create-admin-modal-title" className="rq-modal-header__title rq-inline">
                <span className="rq-icon-chip rq-icon-chip--primary" aria-hidden="true"><UserPlus size={18} /></span>
                Nuevo Administrador
              </h2>
              <button type="button" className="rq-icon-close" onClick={() => setShowCreateModal(false)} aria-label="Cerrar modal"><X size={18} /></button>
            </div>

            <form className="rq-form" onSubmit={handleCreate}>
              <div className="rq-stack">
                <div className="rq-form-grid-2">
                  <div className="rq-field">
                    <label htmlFor="create-admin-nombres" className="rq-field__label">Nombre</label>
                    <input id="create-admin-nombres" required value={createData.nombres} onChange={setField('nombres')} className="rq-field__input" />
                  </div>
                  <div className="rq-field">
                    <label htmlFor="create-admin-apellidos" className="rq-field__label">Apellido</label>
                    <input id="create-admin-apellidos" required value={createData.apellidos} onChange={setField('apellidos')} className="rq-field__input" />
                  </div>
                </div>
                <div className="rq-field">
                  <label htmlFor="create-admin-correo" className="rq-field__label">Correo electrónico</label>
                  <input id="create-admin-correo" type="email" required placeholder="admin@rimaqmasi.com" value={createData.correo} onChange={setField('correo')} className="rq-field__input" />
                </div>
                <div className="rq-field">
                  <label htmlFor="create-admin-password" className="rq-field__label">Contraseña provisoria</label>
                  <div className="rq-field__control">
                    <input
                      id="create-admin-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      value={createData.contrasena}
                      onChange={setField('contrasena')}
                      className="rq-field__input"
                      style={{ paddingRight: 42 }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="rq-profile-modal__eye">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="rq-form__actions">
                <button type="button" onClick={() => setShowCreateModal(false)} disabled={isCreating} className="rq-button rq-button--ghost">Cancelar</button>
                <button type="submit" disabled={isCreating} className="rq-button rq-button--primary">{isCreating ? 'Creando…' : 'Crear Administrador'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
