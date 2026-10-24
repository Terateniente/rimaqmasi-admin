import React, { useEffect, useState } from 'react';
import { getMatriculas, createMatricula, updateMatricula, deleteMatricula } from '../../services/matriculaService';
import { getCursos } from '../../services/cursoService';
import { getUsuarios, buscarUsuarios } from '../../services/userService';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, X, Save, Eye, UserPlus, CheckCircle, XCircle, AlertCircle, Calendar, RefreshCw, Mail, Phone, BookOpen, Clock, Activity, FileText, Download, Target, ChevronRight, UserCheck, Shield, ChevronDown, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { RimaqSelect } from '../../components/RimaqSelect';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const BACKEND_HOST = API_URL.replace(/\/api\/v1\/?$/, '');

const MatriculaTableRow = ({ matricula, index, cursos, usuarios, onEdit, onDelete }) => {
  const [imageError, setImageError] = useState(false);
  const mCursoId = matricula.cursos_id || matricula.curso_id;
  const mUsuarioId = matricula.usuarios_id || matricula.usuario_id;
  const cursoFull = cursos.find(c => String(c.cursos_id || c.curso_id || c.id) === String(mCursoId));
  const usuarioFull = usuarios.find(u => String(u.usuarios_id || u.usuario_id || u.id) === String(mUsuarioId));

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]}, ${d.getFullYear()}`;
  };

  const matriculaId = matricula.matriculas_id || matricula.id;

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'activo': return '#16a34a';
      case 'completado': return '#2563eb';
      case 'pausado': return '#d97706';
      case 'cancelado': return '#dc2626';
      default: return 'var(--color-outline)';
    }
  };

  const getStatusIcon = (estado) => {
    switch (estado) {
      case 'activo': return <CheckCircle size={12} />;
      case 'completado': return <CheckCircle size={12} />;
      case 'pausado': return <Clock size={12} />;
      case 'cancelado': return <XCircle size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const statusColor = getStatusColor(matricula.estado);
  const bgRow = index % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-container-low)';

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath.startsWith('/public') ? `${BACKEND_HOST}${cleanPath}` : `${BACKEND_HOST}/public${cleanPath}`;
  };

  const fotoPerfil = usuarioFull?.url_foto_perfil || matricula.usuario?.url_foto_perfil;
  const avatarUrl = getImageUrl(fotoPerfil);

  return (
    <tr style={{ 
      borderBottom: '1px solid var(--color-surface-variant)', 
      backgroundColor: bgRow,
      transition: 'background-color 0.2s ease',
      opacity: matricula.estado === 'cancelado' ? 0.75 : 1
    }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)'}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = bgRow}
    >
      {/* ID */}
      <td style={{ padding: '16px' }}>
        <span style={{ backgroundColor: 'var(--color-surface-variant)', color: 'var(--color-on-surface)', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', fontSize: '13px' }}>
          #{String(matriculaId).padStart(3, '0')}
        </span>
      </td>

      {/* Estudiante */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--color-surface-variant)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', fontWeight: 600, color: 'var(--color-on-surface)' }}>
            {avatarUrl && !imageError ? (
              <img src={avatarUrl} alt="U" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImageError(true)} />
            ) : (
              <span>{((usuarioFull?.nombres || usuarioFull?.nombre || matricula.usuario?.nombres || matricula.usuario?.nombre || 'U')[0]).toUpperCase()}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              {usuarioFull ? `${usuarioFull.nombres || usuarioFull.nombre || ''} ${usuarioFull.apellidos || usuarioFull.apellido || ''}`.trim() : (matricula.usuario ? `${matricula.usuario.nombres || matricula.usuario.nombre || ''} ${matricula.usuario.apellidos || matricula.usuario.apellido || ''}`.trim() : `Usuario #${matricula.usuarios_id}`)}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-outline)' }}>
              {usuarioFull?.email || usuarioFull?.correo || matricula.usuario?.email || matricula.usuario?.correo || '—'}
            </span>
          </div>
        </div>
      </td>

      {/* Curso */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BookOpen size={18} color="var(--color-primary)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {cursoFull?.nombre || matricula.curso?.nombre || (cursoFull && cursoFull.idioma_origen ? `${cursoFull.idioma_origen.nombre} a ${cursoFull.idioma_destino?.nombre}` : `Curso #${mCursoId}`)}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-outline)', fontWeight: 600 }}>
              {cursoFull?.nivel || matricula.curso?.nivel || 'A1'}
            </span>
          </div>
        </div>
      </td>

      {/* Fechas */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-outline)' }}>
            <Calendar size={12} />
            <span>Inicio: {formatDate(matricula.fecha_inicio)}</span>
          </div>
          {matricula.fecha_fin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-outline)' }}>
              <CheckCircle size={12} />
              <span>Fin: {formatDate(matricula.fecha_fin)}</span>
            </div>
          )}
        </div>
      </td>

      {/* Estado */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
            backgroundColor: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
            color: statusColor, border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)`
          }}>
            {getStatusIcon(matricula.estado)}
            {matricula.estado ? matricula.estado.charAt(0).toUpperCase() + matricula.estado.slice(1) : 'Desconocido'}
          </span>
          {matricula.progresoCurso && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '120px' }}>
              <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--color-surface-variant)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${matricula.progresoCurso.porcentaje}%`, height: '100%', backgroundColor: statusColor, borderRadius: '2px' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>
                {Number(matricula.progresoCurso.porcentaje).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
      </td>

      {/* Acciones */}
      <td style={{ padding: '16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={() => onEdit(matricula)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c', padding: '0' }} title="Editar">
            <Edit2 size={16} strokeWidth={2.5} />
          </button>
          <button onClick={() => onDelete(matricula)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c', padding: '0' }} title="Eliminar">
            <Trash2 size={16} strokeWidth={2.5} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const Matriculas = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.usuarios_id || user?.usuario_id;

  const [matriculas, setMatriculas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentId, setCurrentId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [searchedUsuarios, setSearchedUsuarios] = useState([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const selectedCursoId = watch('cursos_id');
  const selectedStudentId = watch('usuarios_id');
  const selectedEstado = watch('estado');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [matRes, curRes, usrRes] = await Promise.all([
        getMatriculas(),
        getCursos(),
        getUsuarios()
      ]);
      setMatriculas(Array.isArray(matRes) ? matRes : (matRes.data || []));
      setCursos(Array.isArray(curRes) ? curRes : (curRes.data || []));
      setUsuarios(Array.isArray(usrRes) ? usrRes : (usrRes.data || []));
    } catch (error) {
      toast.error('No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!studentSearchTerm.trim()) {
      setSearchedUsuarios(usuarios.filter(u => !u.rol || u.rol?.toLowerCase() === 'estudiante' || u.rol_id === 2));
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingStudents(true);
      try {
        const res = await buscarUsuarios(studentSearchTerm);
        const data = Array.isArray(res) ? res : (res.data || []);
        setSearchedUsuarios(data.filter(u => !u.rol || u.rol?.toLowerCase() === 'estudiante' || u.rol_id === 2));
      } catch (err) {
        console.error('Error al buscar estudiantes:', err);
      } finally {
        setIsSearchingStudents(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [studentSearchTerm, usuarios]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setCurrentId(null);
    reset({ usuarios_id: '', cursos_id: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (matricula) => {
    setModalMode('edit');
    setCurrentId(matricula.matriculas_id || matricula.id);
    reset({
      estado: matricula.estado,
      fecha_fin: matricula.fecha_fin ? matricula.fecha_fin.split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (matricula) => {
    setItemToDelete(matricula);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete.matriculas_id || itemToDelete.id;
    const toastId = toast.loading('Eliminando matrícula...');
    try {
      await deleteMatricula(id);
      toast.success('Matrícula eliminada exitosamente', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const onSubmit = async (data) => {
    const actionName = modalMode === 'create' ? 'Creando' : 'Actualizando';
    const toastId = toast.loading(`${actionName} matrícula...`);
    try {
      if (modalMode === 'create') {
        const payload = {
          usuarios_id: parseInt(data.usuarios_id),
          cursos_id: parseInt(data.cursos_id)
        };
        await createMatricula(payload);
        toast.success('Matrícula creada exitosamente', { id: toastId });
      } else {
        const payload = {
          estado: data.estado
        };
        if (data.fecha_fin) {
          payload.fecha_fin = new Date(data.fecha_fin).toISOString();
        } else if (data.estado === 'completado') {
           payload.fecha_fin = new Date().toISOString();
        }
        await updateMatricula(currentId, payload);
        toast.success('Matrícula actualizada exitosamente', { id: toastId });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} la matrícula`, { id: toastId });
    }
  };

  // Filtrado
  const filteredMatriculas = matriculas.filter(mat => {
    const usuario = usuarios.find(u => (u.usuarios_id || u.id) === mat.usuarios_id);
    const nombreCompleto = usuario ? `${usuario.nombres} ${usuario.apellidos}`.toLowerCase() : '';
    const email = usuario ? (usuario.email || '').toLowerCase() : '';
    
    const matchesSearch = nombreCompleto.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || mat.estado === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalPages = Math.ceil(filteredMatriculas.length / itemsPerPage) || 1;
  const paginatedMatriculas = filteredMatriculas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ flex: 1 }}>
          <div className="rq-page-heading">
            <div className="rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">Matrículas</h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Administra las inscripciones de los estudiantes a los cursos.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
            backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)',
            border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap'
          }}
          onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <Plus size={18} strokeWidth={2.5} />
          Nueva Matrícula
        </button>
      </div>

      {/* Barra de Filtros Compacta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          
          {/* Buscar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Palabra clave</label>
            <div className="rq-search-field" style={{
              display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface-container-low)',
              borderRadius: '12px', padding: '12px 16px',
              border: '1px solid var(--color-outline-variant)'
            }}>
              <Search size={18} color="var(--color-outline)" strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Nombre o correo del estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rq-search-field__input"
                style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '14px', fontWeight: 500, color: 'var(--color-on-surface)' }}
              />
            </div>
          </div>
          
          {/* Estado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Estado de matrícula</label>
            <RimaqSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'activo', label: 'Activos' },
                { value: 'completado', label: 'Completados' },
                { value: 'pausado', label: 'Pausados' },
                { value: 'cancelado', label: 'Cancelados' }
              ]}
              style={{ minWidth: '180px' }}
            />
          </div>
        </div>

      {/* Tabla de Matrículas */}
      <div style={{ 
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-surface-variant)',
        boxShadow: 'var(--shadow-level-1)',
        overflow: 'hidden',
        marginBottom: '32px'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-surface-variant)' }}>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, width: '80px' }}>ID</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Estudiante</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Curso</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Fechas</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Estado</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-surface-variant)' }}>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '40px', height: '20px', borderRadius: '4px' }}></div></td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div className="skeleton" style={{ width: '140px', height: '16px', borderRadius: '4px' }}></div>
                          <div className="skeleton" style={{ width: '100px', height: '12px', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '6px' }}></div>
                        <div className="skeleton" style={{ width: '120px', height: '16px', borderRadius: '4px' }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="skeleton" style={{ width: '100px', height: '14px', borderRadius: '4px' }}></div>
                        <div className="skeleton" style={{ width: '100px', height: '14px', borderRadius: '4px' }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '12px' }}></div></td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: '4px', marginLeft: 'auto' }}></div></td>
                  </tr>
                ))
              ) : paginatedMatriculas.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--color-outline)' }}>
                    <BookOpen size={48} strokeWidth={1.5} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>No se encontraron matrículas</p>
                    <p style={{ fontSize: '13px', margin: 0 }}>Modifica los filtros o agrega una nueva matrícula</p>
                  </td>
                </tr>
              ) : (
                paginatedMatriculas.map((matricula, i) => (
                  <MatriculaTableRow
                    key={matricula.matriculas_id || matricula.id || i}
                    index={i}
                    matricula={matricula} cursos={cursos} usuarios={usuarios}
                    onEdit={handleOpenEdit} onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', marginBottom: '24px' }}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ 
              padding: '8px 16px', borderRadius: '8px', 
              border: '1px solid var(--color-surface-variant)', 
              backgroundColor: currentPage === 1 ? 'var(--color-surface-variant)' : 'var(--color-surface)', 
              color: currentPage === 1 ? 'var(--color-outline)' : 'var(--color-on-surface)',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
            Página {currentPage} de {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ 
              padding: '8px 16px', borderRadius: '8px', 
              border: '1px solid var(--color-surface-variant)', 
              backgroundColor: currentPage === totalPages ? 'var(--color-surface-variant)' : 'var(--color-surface)', 
              color: currentPage === totalPages ? 'var(--color-outline)' : 'var(--color-on-surface)',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal Formulario Crear/Editar */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--color-surface)', borderRadius: '16px', width: '100%', maxWidth: '500px',
            boxShadow: 'var(--shadow-level-3)', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)' }}>
                {modalMode === 'create' ? 'Nueva Matrícula' : 'Editar Matrícula'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {modalMode === 'create' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Estudiante</label>
                      
                      <div style={{ position: 'relative' }} tabIndex={0} onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setIsStudentDropdownOpen(false);
                          setStudentSearchTerm('');
                        }
                      }}>
                        <div
                          onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                          style={{
                            padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)',
                            backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)',
                            fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                          }}
                        >
                          {(() => {
                            if (!selectedStudentId) return '-- Seleccionar Estudiante --';
                            const u = [...usuarios, ...searchedUsuarios].find(x => (x.usuarios_id || x.id).toString() === selectedStudentId.toString());
                            if (!u) return '-- Seleccionar Estudiante --';
                            const firstName = u.nombres || u.nombre || '';
                            const lastName = u.apellidos || u.apellido || '';
                            const mail = u.email || u.correo || '';
                            return `${firstName} ${lastName} (${mail})`.trim();
                          })()}
                          <span style={{ transform: isStudentDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                        </div>

                        {isStudentDropdownOpen && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                            backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-surface-variant)',
                            boxShadow: 'var(--shadow-level-2)', zIndex: 10, display: 'flex', flexDirection: 'column',
                            maxHeight: '250px'
                          }}>
                            <div style={{ padding: '8px', borderBottom: '1px solid var(--color-surface-variant)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '6px', padding: '6px 10px' }}>
                                <Search size={14} color="var(--color-outline)" />
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Buscar por nombre completo..."
                                  value={studentSearchTerm}
                                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '8px', width: '100%', fontSize: '13px', color: 'var(--color-on-surface)' }}
                                />
                              </div>
                            </div>
                            
                            <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
                              {isSearchingStudents ? (
                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-outline)', fontSize: '13px' }}>Buscando...</div>
                              ) : searchedUsuarios.length === 0 ? (
                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-outline)', fontSize: '13px' }}>No se encontraron estudiantes</div>
                              ) : (
                                searchedUsuarios.map(u => {
                                  const isSelected = (u.usuarios_id || u.id).toString() === (selectedStudentId || '').toString();
                                  return (
                                    <div
                                      key={u.usuarios_id || u.id}
                                      onClick={() => {
                                        setValue('usuarios_id', u.usuarios_id || u.id, { shouldValidate: true });
                                        setIsStudentDropdownOpen(false);
                                        setStudentSearchTerm('');
                                      }}
                                      style={{
                                        padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '2px',
                                        cursor: 'pointer', backgroundColor: isSelected ? 'var(--color-surface-variant)' : 'transparent',
                                        transition: 'background-color 0.2s', borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent'
                                      }}
                                      onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-surface-container-high)' }}
                                      onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                                    >
                                      <span style={{ fontSize: '14px', fontWeight: isSelected ? 600 : 500, color: 'var(--color-on-surface)' }}>
                                        {u.nombres || u.nombre} {u.apellidos || u.apellido}
                                      </span>
                                      <span style={{ fontSize: '12px', color: 'var(--color-outline)' }}>{u.email || u.correo}</span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <input type="hidden" {...register('usuarios_id', { required: 'Selecciona un estudiante' })} />
                      {errors.usuarios_id && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.usuarios_id.message}</span>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Curso</label>
                      <div style={{ position: 'relative' }} tabIndex={0} onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setIsCourseDropdownOpen(false);
                        }
                      }}>
                        <div
                          onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                          style={{
                            padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)',
                            backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)',
                            fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                          }}
                        >
                          {(() => {
                            if (!selectedCursoId) return '-- Seleccionar Curso --';
                            const c = cursos.find(x => (x.cursos_id || x.id).toString() === selectedCursoId.toString());
                            if (!c) return '-- Seleccionar Curso --';
                            
                            const orig = c.idioma_origen?.nombre || 'Desconocido';
                            const dest = c.idioma_destino?.nombre || 'Desconocido';
                            const origUrl = c.idioma_origen?.bandera ? (c.idioma_origen.bandera.startsWith('http') ? c.idioma_origen.bandera : `${BACKEND_HOST}${c.idioma_origen.bandera.startsWith('/') ? c.idioma_origen.bandera : '/' + c.idioma_origen.bandera}`) : null;
                            const destUrl = c.idioma_destino?.bandera ? (c.idioma_destino.bandera.startsWith('http') ? c.idioma_destino.bandera : `${BACKEND_HOST}${c.idioma_destino.bandera.startsWith('/') ? c.idioma_destino.bandera : '/' + c.idioma_destino.bandera}`) : null;

                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {origUrl && <img src={origUrl} alt={orig} style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />}
                                  <span>{orig}</span>
                                </div>
                                <span style={{ color: 'var(--color-outline)' }}>➔</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {destUrl && <img src={destUrl} alt={dest} style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />}
                                  <span>{dest}</span>
                                </div>
                              </div>
                            );
                          })()}
                          <span style={{ transform: isCourseDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                        </div>
                        {isCourseDropdownOpen && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                            backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-surface-variant)',
                            boxShadow: 'var(--shadow-level-2)', zIndex: 10, maxHeight: '200px', overflowY: 'auto'
                          }}>
                            {cursos.map(c => {
                              const orig = c.idioma_origen?.nombre || 'Desconocido';
                              const dest = c.idioma_destino?.nombre || 'Desconocido';
                              const origUrl = c.idioma_origen?.bandera ? (c.idioma_origen.bandera.startsWith('http') ? c.idioma_origen.bandera : `${BACKEND_HOST}${c.idioma_origen.bandera.startsWith('/') ? c.idioma_origen.bandera : '/' + c.idioma_origen.bandera}`) : null;
                              const destUrl = c.idioma_destino?.bandera ? (c.idioma_destino.bandera.startsWith('http') ? c.idioma_destino.bandera : `${BACKEND_HOST}${c.idioma_destino.bandera.startsWith('/') ? c.idioma_destino.bandera : '/' + c.idioma_destino.bandera}`) : null;
                              const isSelected = (c.cursos_id || c.id).toString() === (selectedCursoId || '').toString();

                              return (
                                <div
                                  key={c.cursos_id || c.id}
                                  onClick={() => {
                                    setValue('cursos_id', c.cursos_id || c.id, { shouldValidate: true });
                                    setIsCourseDropdownOpen(false);
                                  }}
                                  style={{
                                    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                                    cursor: 'pointer', backgroundColor: isSelected ? 'var(--color-surface-variant)' : 'transparent',
                                    transition: 'background-color 0.2s', borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent'
                                  }}
                                  onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-surface-container-high)' }}
                                  onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {origUrl && <img src={origUrl} alt={orig} style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />}
                                    <span style={{ fontSize: '14px', color: 'var(--color-on-surface)' }}>{orig}</span>
                                  </div>
                                  <span style={{ color: 'var(--color-outline)', fontSize: '14px' }}>➔</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {destUrl && <img src={destUrl} alt={dest} style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />}
                                    <span style={{ fontSize: '14px', color: 'var(--color-on-surface)' }}>{dest}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {/* Hidden input to register the value with react-hook-form */}
                      <input type="hidden" {...register('cursos_id', { required: 'Selecciona un curso' })} />
                      {errors.cursos_id && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.cursos_id.message}</span>}
                    </div>
                  </>
                )}

                {modalMode === 'edit' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Estado de la Matrícula</label>
                      <input type="hidden" {...register('estado', { required: 'Requerido' })} />
                      <RimaqSelect
                        value={String(selectedEstado || 'activo')}
                        onValueChange={(val) => setValue('estado', val, { shouldValidate: true })}
                        placeholder="Seleccione estado..."
                        options={[
                          { value: 'activo', label: 'Activo' },
                          { value: 'completado', label: 'Completado' },
                          { value: 'pausado', label: 'Pausado' },
                          { value: 'cancelado', label: 'Cancelado' }
                        ]}
                        className="rimaq-select--full-width"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Fecha de Finalización (Opcional)</label>
                      <input
                        type="date"
                        {...register('fecha_fin')}
                        style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '14px', outline: 'none' }}
                      />
                    </div>
                  </>
                )}

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', fontWeight: 600, cursor: 'pointer', borderRadius: '8px' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  {modalMode === 'create' ? 'Crear Matrícula' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar matrícula?" itemName={itemToDelete ? `Matrícula #${itemToDelete.matriculas_id || itemToDelete.id}` : ''} description={<>Se eliminará la inscripción del estudiante a este curso. Esta acción es irreversible.</>} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
};
