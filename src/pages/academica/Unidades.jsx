import { useEffect, useState } from 'react';
import { getUnidads, getUnidadById, createUnidad, updateUnidad, deleteUnidad, toggleEstadoUnidad, uploadUnidadImage } from '../../services/unidadService';
import { getCursos } from '../../services/cursoService';
import { getIdiomas } from '../../services/idiomaService';
import { getUsuarios } from '../../services/userService';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, X, Save, Layers, BookOpen, CheckCircle, XCircle, ChevronLeft, ChevronRight, ShieldCheck, BookMarked, ListTree, Eye, ArrowRight, Filter, ChevronDown, ImageOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { WizardProgress } from '../../components/WizardProgress';
import { RimaqSelect } from '../../components/RimaqSelect';

const UnidadTableRow = ({ unidad, index, cursos, idiomas, getImageUrl, onView, onEdit, onDelete, onToggleEstado }) => {
  const isActive = unidad.estado === 'activo';
  const unidadId = unidad.unidad_id || unidad.unidads_id || unidad.id;
  const cursoId = unidad.curso_id || unidad.cursos_id;
  const unidadOrden = unidad.orden ?? unidad.orden_clasificacion;
  const unidadTitulo = unidad.nombre || unidad.titulo || `Unidad ${unidadOrden || unidadId}`;
  
  const curso = cursos.find(c => String(c.curso_id || c.cursos_id || c.id) === String(cursoId));
  const idiomaOrigenFull = idiomas.find(i => String(i.idioma_id || i.id) === String(curso?.idioma_origen_id || curso?.idioma_origen?.idioma_id || curso?.idiomaOrigen?.idioma_id));
  const idiomaDestinoFull = idiomas.find(i => String(i.idioma_id || i.id) === String(curso?.idioma_destino_id || curso?.idioma_destino?.idioma_id || curso?.idiomaDestino?.idioma_id));
  const idiomaOrigenNombre = idiomaOrigenFull?.nombres || idiomaOrigenFull?.nombre || curso?.idioma_origen?.nombres || curso?.idioma_origen?.nombre || curso?.idiomaOrigen?.nombres || curso?.idiomaOrigen?.nombre || 'Desconocido';
  const idiomaDestinoNombre = idiomaDestinoFull?.nombres || idiomaDestinoFull?.nombre || curso?.idioma_destino?.nombres || curso?.idioma_destino?.nombre || curso?.idiomaDestino?.nombres || curso?.idiomaDestino?.nombre || 'Desconocido';

  const flagOrigen = getImageUrl(idiomaOrigenFull?.url_icono_bandera);
  const flagDestino = getImageUrl(idiomaDestinoFull?.url_icono_bandera);

  const getNivelStyle = (nivel) => {
    const isBasico = nivel?.includes('A');
    const isIntermedio = nivel?.includes('B');
    const isAvanzado = nivel?.includes('C');

    if (isBasico) return { bg: 'rgba(14, 165, 233, 0.1)', text: '#0284c7', border: 'rgba(14, 165, 233, 0.2)' }; // Blue
    if (isIntermedio) return { bg: 'rgba(245, 158, 11, 0.1)', text: '#d97706', border: 'rgba(245, 158, 11, 0.2)' }; // Amber
    if (isAvanzado) return { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', border: 'rgba(16, 185, 129, 0.2)' }; // Emerald
    return { bg: 'var(--color-surface-variant)', text: 'var(--color-on-surface-variant)', border: 'var(--color-outline-variant)' };
  };
  const nivelStyle = getNivelStyle(curso?.nivel || 'A1');

  const bgRow = index % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-container-low)';
  const unidadImage = getImageUrl(unidad.url_imagen);
  const unidadColor = unidad.color || '#991b1b';

  return (
    <tr style={{ 
      borderBottom: '1px solid var(--color-surface-variant)', 
      backgroundColor: bgRow,
      transition: 'background-color 0.2s ease',
      opacity: isActive ? 1 : 0.75
    }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)'}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = bgRow}
    >
      {/* Orden */}
      <td style={{ padding: '16px' }}>
        <span style={{ backgroundColor: 'var(--color-surface-variant)', color: 'var(--color-error)', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', fontSize: '13px' }}>
          #{unidadOrden}
        </span>
      </td>

      {/* Unidad y Cód (ID) */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span title={`Color: ${unidadColor}`} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: unidadColor, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              {unidadTitulo}
            </span>
          </div>
        </div>
      </td>
      
      {/* Curso Asociado (Origen -> Destino) */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {flagOrigen && <img src={flagOrigen} alt="Origen" style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'cover' }} crossOrigin="anonymous" onError={(e) => e.target.style.display = 'none'} />}
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface)' }}>{idiomaOrigenNombre}</span>
          <ArrowRight size={14} color="var(--color-outline)" />
          {flagDestino && <img src={flagDestino} alt="Destino" style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'cover' }} crossOrigin="anonymous" onError={(e) => e.target.style.display = 'none'} />}
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>{idiomaDestinoNombre}</span>
        </div>
      </td>

      {/* Nivel */}
      <td style={{ padding: '16px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '4px 10px', borderRadius: '20px', 
          backgroundColor: nivelStyle.bg, border: `1px solid ${nivelStyle.border}`,
          boxShadow: `0 2px 4px rgba(0,0,0,0.02)`
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: nivelStyle.text, lineHeight: 1, paddingTop: '1px' }}>
            {curso?.nivel || 'A1'}
          </span>
        </div>
      </td>

      {/* Estado */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onToggleEstado(unidad)}
            style={{
              width: '36px', height: '20px',
              backgroundColor: isActive ? '#991b1b' : '#e5e7eb',
              borderRadius: '10px', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.3s ease', padding: 0
            }}
          >
            <div style={{ width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: isActive ? '18px' : '2px', transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
          </button>
          <span style={{
            fontSize: '12px', fontWeight: 600,
            color: isActive ? '#991b1b' : '#9ca3af'
          }}>
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </td>

      {/* Acciones */}
      <td style={{ padding: '16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={() => onView(unidad, curso)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: '0', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--color-secondary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-primary)'} title="Ver JSON">
            <Eye size={18} strokeWidth={2} />
          </button>
          <button onClick={() => onEdit(unidad)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: '0', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--color-secondary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-primary)'} title="Editar">
            <Edit2 size={18} strokeWidth={2} />
          </button>
          <button onClick={() => onDelete(unidad)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '0', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.7'} onMouseOut={e => e.currentTarget.style.opacity = '1'} title="Eliminar">
            <Trash2 size={18} strokeWidth={2} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const Unidades = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.usuarios_id || user?.usuario_id;

  const [unidads, setUnidads] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [idiomas, setIdiomas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const BACKEND_HOST = API_URL.replace('/api/v1', '');
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath.startsWith('/public') ? `${BACKEND_HOST}${cleanPath}` : `${BACKEND_HOST}/public${cleanPath}`;
  };
  const getUnidadId = (unidad) => unidad?.unidad_id || unidad?.unidads_id || unidad?.id;
  const getUnidadCursoId = (unidad) => unidad?.curso_id || unidad?.cursos_id;
  const getCursoId = (curso) => curso?.curso_id || curso?.cursos_id || curso?.id;
  const getUnidadOrden = (unidad) => unidad?.orden ?? unidad?.orden_clasificacion;
  const getUnidadTitulo = (unidad) => unidad?.nombre || unidad?.titulo || `Unidad ${getUnidadOrden(unidad) || getUnidadId(unidad) || ''}`;
  const getIdiomaName = (idiomaId, embeddedIdioma) => {
    const idioma = embeddedIdioma || idiomas.find(i => String(i.idioma_id || i.id) === String(idiomaId));
    return idioma?.nombres || idioma?.nombre || 'Desconocido';
  };
  const formatUserName = (usuario) => {
    if (!usuario) return 'Usuario';
    return `${usuario.nombres || usuario.nombre || ''} ${usuario.apellidos || usuario.apellido || ''}`.trim() || 'Usuario';
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentId, setCurrentId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [selectedUnidadView, setSelectedUnidadView] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [rememberCourse, setRememberCourse] = useState(false);

  const PREDEFINED_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
    '#b91c1c', '#c2410c', '#b45309', '#4d7c0f', '#15803d', '#047857', '#0f766e', '#0e7490', '#0369a1', '#1d4ed8', '#4338ca', '#6d28d9', '#7e22ce', '#a21caf', '#be185d', '#be123c',
    '#7f1d1d', '#7c2d12', '#78350f', '#365314', '#14532d', '#064e3b', '#134e4a', '#164e63', '#0c4a6e', '#1e3a8a', '#312e81', '#4c1d95', '#581c87', '#701a75', '#831843', '#881337'
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [cursoFilter, setCursoFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { register, handleSubmit, reset, setValue, watch, trigger, formState: { errors } } = useForm();
  const selectedCursoGroup = watch('curso_group');
  const selectedCursoId = watch('cursos_id');
  const currentColor = watch('color') || '#991b1b';

  const getNextUnidadOrder = (cursoId) => {
    if (!cursoId) return 1;
    const relatedUnidades = unidads.filter(unidad => String(getUnidadCursoId(unidad)) === String(cursoId));
    const maxOrder = relatedUnidades.reduce((max, unidad) => Math.max(max, Number(getUnidadOrden(unidad)) || 0), 0);
    return maxOrder + 1;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [unidadsRes, cursosRes, idiomasRes, usuariosRes] = await Promise.all([
        getUnidads(),
        getCursos(),
        getIdiomas(),
        getUsuarios()
      ]);
      const unidadsList = Array.isArray(unidadsRes) ? unidadsRes : (unidadsRes.data || []);
      const cursosList = Array.isArray(cursosRes) ? cursosRes : (cursosRes.data || []);
      const idiomasList = Array.isArray(idiomasRes) ? idiomasRes : (idiomasRes.data || []);
      const usuariosList = Array.isArray(usuariosRes) ? usuariosRes : (usuariosRes.data || []);
      
      unidadsList.sort((a, b) => (getUnidadOrden(a) || 0) - (getUnidadOrden(b) || 0));
      
      setUnidads(unidadsList);
      setCursos(cursosList);
      setIdiomas(idiomasList);
      setUsuarios(usuariosList);
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
    if (modalMode === 'create') {
      setValue('orden', getNextUnidadOrder(selectedCursoId), { shouldValidate: true });
    }
  }, [selectedCursoId, modalMode, unidads, setValue]);

  const getCursoName = (cursoId) => {
    const curso = cursos.find(c => String(getCursoId(c)) === String(cursoId));
    if (!curso) return 'Desconocido';
    const origen = getIdiomaName(curso.idioma_origen_id || curso.idioma_origen?.idioma_id || curso.idiomaOrigen?.idioma_id, curso.idioma_origen || curso.idiomaOrigen);
    const destino = getIdiomaName(curso.idioma_destino_id || curso.idioma_destino?.idioma_id || curso.idiomaDestino?.idioma_id, curso.idioma_destino || curso.idiomaDestino);
    return `${origen} → ${destino}`;
  };

  const getCursoFilterLabel = (curso) => `${getCursoName(getCursoId(curso))} · ${getCursoNivelLabel(curso)}`;

  const getCursoById = (cursoId) => cursos.find(c => String(getCursoId(c)) === String(cursoId));

  const getCursoGroupKey = (curso) => `${curso?.idioma_origen_id || curso?.idioma_origen?.idioma_id || curso?.idiomaOrigen?.idioma_id}-${curso?.idioma_destino_id || curso?.idioma_destino?.idioma_id || curso?.idiomaDestino?.idioma_id}`;
  const getCursoNivelLabel = (curso) => {
    const nivel = curso?.nivel || 'A1';
    if (nivel.startsWith('A')) return `${nivel} - Básico`;
    if (nivel.startsWith('B')) return `${nivel} - Intermedio`;
    if (nivel.startsWith('C')) return `${nivel} - Avanzado`;
    return nivel;
  };
  const cursoGroups = Object.values(cursos.reduce((groups, curso) => {
    const key = getCursoGroupKey(curso);
    if (!groups[key]) {
      groups[key] = { key, label: getCursoName(getCursoId(curso)), cursos: [] };
    }
    groups[key].cursos.push(curso);
    groups[key].cursos.sort((a, b) => String(a.nivel || 'A1').localeCompare(String(b.nivel || 'A1')));
    return groups;
  }, {}));
  const selectedGroupCursos = selectedCursoGroup
    ? cursos.filter(curso => getCursoGroupKey(curso) === selectedCursoGroup)
    : [];

  useEffect(() => {
    if (!isModalOpen || !selectedCursoGroup) return;
    const isSelectedInsideGroup = selectedGroupCursos.some(curso => String(getCursoId(curso)) === String(selectedCursoId));
    if (!isSelectedInsideGroup && selectedGroupCursos.length > 0) {
      setValue('cursos_id', getCursoId(selectedGroupCursos[0]), { shouldValidate: true });
    }
  }, [isModalOpen, selectedCursoGroup, selectedCursoId, cursos]);

  const getSavedDefaultCourse = () => {
    const savedCursoId = localStorage.getItem('unidad.defaultCursoId');
    return cursos.find(curso => String(getCursoId(curso)) === String(savedCursoId));
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setCurrentId(null);
    setImageFile(null);
    setImagePreview(null);
    const defaultCurso = getSavedDefaultCourse();
    reset({
      curso_group: defaultCurso ? getCursoGroupKey(defaultCurso) : '',
      cursos_id: defaultCurso ? getCursoId(defaultCurso) : '',
      nombre: '',
      orden: getNextUnidadOrder(defaultCurso ? getCursoId(defaultCurso) : null),
      color: '#991b1b',
      activo: true
    });
    setRememberCourse(Boolean(defaultCurso));
    setFormStep(defaultCurso ? 2 : 1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unidad) => {
    setModalMode('edit');
    setCurrentId(getUnidadId(unidad));
    setImageFile(null);
    setImagePreview(unidad.url_imagen ? getImageUrl(unidad.url_imagen) : null);
    const unidadCurso = cursos.find(curso => String(getCursoId(curso)) === String(getUnidadCursoId(unidad)));
    reset({
      curso_group: unidadCurso ? getCursoGroupKey(unidadCurso) : '',
      cursos_id: getUnidadCursoId(unidad),
      nombre: unidad.nombre || unidad.titulo || '',
      orden: getUnidadOrden(unidad) || '',
      color: unidad.color || '#991b1b',
      activo: unidad.estado ? unidad.estado === 'activo' : unidad.activo !== false
    });
    setRememberCourse(false);
    setFormStep(1);
    setIsModalOpen(true);
  };

  const handleNextFormStep = async () => {
    const isValid = await trigger(['curso_group', 'cursos_id']);
    if (!isValid) return;
    if (modalMode === 'create') setValue('orden', getNextUnidadOrder(selectedCursoId), { shouldValidate: true });
    setFormStep(2);
  };

  const handleRememberCourseToggle = async () => {
    if (rememberCourse) {
      setRememberCourse(false);
      localStorage.removeItem('unidad.defaultCursoId');
      toast.success('El curso ya no se reutilizará automáticamente.');
      return;
    }
    const isValid = await trigger(['curso_group', 'cursos_id']);
    if (!isValid) return;
    localStorage.setItem('unidad.defaultCursoId', String(selectedCursoId));
    setRememberCourse(true);
    toast.success('Curso guardado para reutilizarlo en nuevas unidades.');
  };

  const handleView = async (unidad, curso) => {
    try {
      const response = await getUnidadById(getUnidadId(unidad));
      let unidadData = response.data || response;
      if (!unidadData.creado_por && unidadData.creado_por_id) {
        unidadData.creado_por = usuarios.find(u => String(u.id || u.usuarios_id || u.usuario_id) === String(unidadData.creado_por_id));
      }
      if (!unidadData.actualizado_por && unidadData.actualizado_por_id) {
        unidadData.actualizado_por = usuarios.find(u => String(u.id || u.usuarios_id || u.usuario_id) === String(unidadData.actualizado_por_id));
      }
      setSelectedUnidadView({ ...unidadData, curso_asociado: curso });
    } catch (error) {
      toast.error('Error al obtener los detalles de la unidad');
      setSelectedUnidadView({ ...unidad, curso_asociado: curso });
    }
  };

  const handleDelete = (unidad) => {
    setItemToDelete(unidad);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const id = getUnidadId(itemToDelete);
    const toastId = toast.loading('Eliminando unidad...');
    try {
      await deleteUnidad(id);
      toast.success('Unidad eliminada exitosamente', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar la unidad', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleToggleEstado = async (unidad) => {
    const id = getUnidadId(unidad);
    const toastId = toast.loading(`${unidad.estado === 'activo' ? 'Desactivando' : 'Activando'} unidad...`);
    try {
      await toggleEstadoUnidad(id, {
        estado: unidad.estado === 'activo' ? 'inactivo' : 'activo',
        actualizado_por_id: currentUserId
      });
      toast.success(`Unidad ${unidad.estado === 'activo' ? 'desactivado' : 'activado'} exitosamente`, { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado', { id: toastId });
    }
  };

  const handlePreSubmit = (data) => {
    setConfirmData(data);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const confirmSubmit = async () => {
    if (!confirmData) return;
    const data = confirmData;

    // Validación frontend para evitar orden duplicado en el mismo curso
    const isDuplicateOrder = unidads.some(
      e => String(getUnidadCursoId(e)) === String(data.cursos_id) &&
           String(getUnidadOrden(e)) === String(data.orden) &&
           String(getUnidadId(e)) !== String(currentId)
    );

    if (isDuplicateOrder) {
      toast.error(`Ya existe una unidad con el orden ${data.orden} en este curso.`);
      setConfirmData(null);
      return;
    }

    const actionName = modalMode === 'create' ? 'Creando' : 'Actualizando';
    const toastId = toast.loading(`${actionName} unidad...`);
    try {
      let uploadedImageUrl = null;
      if (imageFile) {
        const uploadResult = await uploadUnidadImage(imageFile);
        uploadedImageUrl = uploadResult.url || uploadResult.data?.url;
      }

      const payload = {
        curso_id: parseInt(data.cursos_id),
        codigo: null,
        nombre: data.nombre,
        orden: parseInt(data.orden),
        color: data.color || null,
        estado: (data.activo !== undefined ? data.activo : true) ? 'activo' : 'inactivo'
      };

      if (uploadedImageUrl) {
        payload.url_imagen = uploadedImageUrl;
      }

      if (modalMode === 'create') {
        payload.creado_por_id = currentUserId;
        await createUnidad(payload);
        toast.success('Unidad creada exitosamente', { id: toastId });
      } else {
        payload.actualizado_por_id = currentUserId;
        await updateUnidad(currentId, payload);
        toast.success('Unidad actualizada exitosamente', { id: toastId });
      }
      setIsModalOpen(false);
      setConfirmData(null);
      setImageFile(null);
      setImagePreview(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} la unidad`, { id: toastId });
    }
  };

  const filteredUnidads = unidads.filter(unidad => {
    const curso = getCursoById(getUnidadCursoId(unidad));
    const searchMatched = matchesSearch(getUnidadTitulo(unidad), searchTerm) ||
      matchesSearch(getCursoName(getUnidadCursoId(unidad)), searchTerm) ||
      matchesSearch(getCursoNivelLabel(curso), searchTerm);
    const matchesCurso = cursoFilter === 'all' || String(getUnidadCursoId(unidad)) === cursoFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && unidad.estado === 'activo') || (statusFilter === 'inactive' && unidad.estado !== 'activo');
    return searchMatched && matchesCurso && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUnidads.length / itemsPerPage) || 1;
  const paginatedUnidads = filteredUnidads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).sort((a, b) => {
    const cursoA = getCursoById(getUnidadCursoId(a));
    const cursoB = getCursoById(getUnidadCursoId(b));
    const rutaA = getCursoName(getUnidadCursoId(a));
    const rutaB = getCursoName(getUnidadCursoId(b));

    if (rutaA !== rutaB) return rutaA.localeCompare(rutaB);
    if ((cursoA?.nivel || 'A1') !== (cursoB?.nivel || 'A1')) return String(cursoA?.nivel || 'A1').localeCompare(String(cursoB?.nivel || 'A1'));
    return Number(getUnidadOrden(a) || 0) - Number(getUnidadOrden(b) || 0);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, cursoFilter, statusFilter]);

  return (
    <div className="academic-modal-scroll" style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>

      <div className="flex-col-mobile" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div className="rq-page-heading">
            <div className="rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">Gestión de Unidades</h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Administra las unidades y progresión académica de los cursos.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            border: '2px solid var(--color-primary)',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Crear Unidad
        </button>
      </div>

      {/* Barra de Filtros Compacta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          
          {/* Buscar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Palabra clave</label>
            <div style={{
              display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface-container-low)',
              borderRadius: '12px', padding: '12px 16px',
              border: '1px solid var(--color-outline-variant)', transition: 'all 0.2s'
            }} onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--color-outline-variant)'}>
              <Search size={18} color="var(--color-outline)" strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Saludos, Quechua..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '14px', fontWeight: 500, color: 'var(--color-on-surface)' }}
              />
            </div>
          </div>
          
          {/* Curso y nivel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Curso y nivel</label>
            <RimaqSelect
              value={cursoFilter}
              onValueChange={setCursoFilter}
              options={[
                { value: 'all', label: 'Todos los cursos y niveles' },
                ...cursos.map(c => ({
                  value: String(getCursoId(c)),
                  label: getCursoFilterLabel(c)
                }))
              ]}
              style={{ minWidth: '220px' }}
            />
          </div>

          {/* Estado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Estado de unidad</label>
            <RimaqSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'active', label: 'Solo activos' },
                { value: 'inactive', label: 'Solo inactivos' }
              ]}
              style={{ minWidth: '160px' }}
            />
          </div>
        </div>

      {/* Tabla de Unidads */}
      <div style={{ 
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-surface-variant)',
        boxShadow: 'var(--shadow-level-1)',
        overflow: 'hidden',
        marginBottom: '32px'
      }}>
        <div className="table-responsive-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-surface-variant)' }}>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, width: '80px' }}>Orden</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Unidad</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Curso Asociado</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Nivel</th>

                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Estado</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-surface-variant)' }}>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '40px', height: '20px', borderRadius: '4px' }}></div></td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '180px', height: '32px', borderRadius: '8px' }}></div></td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: '12px' }}></div>
                        <div className="skeleton" style={{ width: '140px', height: '20px', borderRadius: '4px' }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '80px', height: '22px', borderRadius: '11px' }}></div></td>

                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '60px', height: '32px', borderRadius: '8px', marginLeft: 'auto' }}></div></td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '80px', height: '20px', borderRadius: '8px', marginLeft: 'auto' }}></div></td>
                  </tr>
                ))
              ) : paginatedUnidads.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--color-outline)' }}>
                    <ListTree size={48} strokeWidth={1.5} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>
                       {searchTerm || cursoFilter !== 'all' || statusFilter !== 'all' ? 'No se encontraron unidades con esos filtros' : 'Aún no hay unidades registradas'}
                    </p>
                    <p style={{ fontSize: '13px', margin: 0 }}>
                      {searchTerm || cursoFilter !== 'all' || statusFilter !== 'all' ? 'Intenta con otra búsqueda' : 'Crea la primera unidad haciendo clic en "Crear Unidad"'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUnidads.map((unidad, i) => (
                  <UnidadTableRow
                    key={getUnidadId(unidad) || i}
                    index={i}
                    unidad={unidad}
                    cursos={cursos}
                    idiomas={idiomas}
                    getImageUrl={getImageUrl}
                    onView={handleView}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onToggleEstado={handleToggleEstado}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease-out' }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', transform: 'scale(1)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                 <h2 style={{ margin: '0', fontSize: '24px', fontWeight: 800, color: 'var(--color-on-surface)', letterSpacing: '-0.01em' }}>
                    {modalMode === 'create' ? 'Crear Nueva Unidad' : 'Editar Unidad'}
                 </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'var(--color-surface-container-low)', border: 'none', color: 'var(--color-outline)', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.backgroundColor = 'var(--color-error)'; e.currentTarget.style.color = 'white'; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)'; e.currentTarget.style.color = 'var(--color-outline)'; }}>
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={(event) => { event.preventDefault(); if (formStep < 2) handleNextFormStep(); }} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="academic-modal-scroll" style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <WizardProgress
                  currentStep={formStep}
                  steps={[
                    { label: 'Curso asociado', description: 'Selecciona el curso y el nivel de la nueva unidad.' },
                    { label: 'Datos principales', description: 'Configura el nombre, orden, color e imagen.' }
                  ]}
                />
                
                {formStep === 1 && <>
                {/* Curso y Nivel */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Curso</label>
                    <input type="hidden" {...register('curso_group', { required: 'El curso es requerido' })} />
                    <RimaqSelect
                      value={String(selectedCursoGroup || '')}
                      onValueChange={(val) => {
                        setValue('curso_group', val, { shouldValidate: true });
                        setValue('cursos_id', '', { shouldValidate: true });
                      }}
                      placeholder="Seleccione una ruta"
                      options={cursoGroups.map(group => ({
                        value: group.key,
                        label: group.label
                      }))}
                      className="rimaq-select--full-width"
                    />
                    {errors.curso_group && <span style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 500 }}>{errors.curso_group.message}</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Nivel</label>
                    <input type="hidden" {...register('cursos_id', { required: 'El nivel es requerido' })} />
                    <RimaqSelect
                      value={String(selectedCursoId || '')}
                      onValueChange={(val) => setValue('cursos_id', val, { shouldValidate: true })}
                      placeholder="Seleccione nivel"
                      options={selectedGroupCursos.map(c => ({
                        value: String(getCursoId(c)),
                        label: getCursoNivelLabel(c)
                      }))}
                      disabled={!selectedCursoGroup}
                      className="rimaq-select--full-width"
                    />
                    {errors.cursos_id && <span style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 500 }}>{errors.cursos_id.message}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '12px 14px', borderRadius: '10px', background: 'var(--color-surface-container-low)' }}>
                  <div><strong style={{ display: 'block', color: 'var(--color-on-surface)', fontSize: '13px' }}>Guardar para reutilizar</strong><span style={{ display: 'block', marginTop: '3px', color: 'var(--color-on-surface-variant)', fontSize: '11px' }}>Recordar este curso en las próximas unidades.</span></div>
                  <button type="button" role="switch" aria-checked={rememberCourse} onClick={handleRememberCourseToggle} style={{ position: 'relative', flex: '0 0 auto', width: '44px', height: '24px', minHeight: '24px', padding: 0, border: 'none', borderRadius: '99px', cursor: 'pointer', backgroundColor: rememberCourse ? 'var(--color-primary)' : 'var(--color-surface-variant)', transition: 'background-color .2s' }}><span style={{ position: 'absolute', top: '3px', left: rememberCourse ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s' }} /></button>
                </div>
                </>}

                {formStep === 2 && <>
                {/* Orden y Nombre */}
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Orden</label>
                    <input type="number" min="1" {...register('orden', { required: 'El orden es requerido', min: { value: 1, message: 'Debe ser mayor a 0' } })} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--color-outline-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-primary)', outline: 'none', fontSize: '16px', fontWeight: 800, textAlign: 'center', transition: 'all 0.2s' }} placeholder="1" onFocus={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'} />
                    {errors.orden && <span style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 500 }}>{errors.orden.message}</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Nombre de unidad</label>
                    <input type="text" {...register('nombre', { required: 'El nombre es requerido' })} style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--color-outline-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', outline: 'none', fontSize: '15px', fontWeight: 500, transition: 'all 0.2s' }} placeholder="Saludos y presentación" onFocus={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'} />
                    {errors.nombre && <span style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 500 }}>{errors.nombre.message}</span>}
                  </div>
                </div>

                {/* Color e Imagen */}
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Color</label>
                    <div 
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      style={{ width: '100%', height: '52px', borderRadius: '12px', border: showColorPicker ? '2px solid var(--color-on-surface)' : '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: currentColor, transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)' }}
                    >
                      <input type="hidden" {...register('color')} />
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', textShadow: '0px 1px 3px rgba(0,0,0,0.4)', letterSpacing: '0.5px' }}>{currentColor}</span>
                    </div>
                    
                    {showColorPicker && (
                      <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, padding: '20px', backgroundColor: 'var(--color-surface)', borderRadius: '20px', boxShadow: '0 12px 40px -10px rgba(0,0,0,0.4)', border: '1px solid var(--color-surface-variant)', zIndex: 100, width: 'max-content', display: 'flex', flexDirection: 'column' }}>
                        <div className="academic-modal-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 28px)', gap: '8px', maxHeight: '136px', overflowY: 'auto', paddingRight: '4px' }}>
                          {PREDEFINED_COLORS.map(c => (
                            <div
                              key={c}
                              onClick={() => { setValue('color', c, { shouldDirty: true }); setShowColorPicker(false); }}
                              style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: c, cursor: 'pointer', border: currentColor === c ? '2px solid var(--color-on-surface)' : '1px solid rgba(0,0,0,0.1)', transform: currentColor === c ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s', position: 'relative', zIndex: currentColor === c ? 2 : 1 }}
                              onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.zIndex = 3; }}
                              onMouseOut={e => { e.currentTarget.style.transform = currentColor === c ? 'scale(1.15)' : 'scale(1)'; e.currentTarget.style.zIndex = currentColor === c ? 2 : 1; }}
                            />
                          ))}
                        </div>
                        <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-surface-variant)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-outline)' }}>HEX:</span>
                            <input type="text" value={currentColor} onChange={(e) => setValue('color', e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', fontSize: '12px', fontWeight: 700, outline: 'none', width: '80px', textTransform: 'uppercase', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }} />
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-outline)' }}>MÁS COLORES:</span>
                            <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-outline-variant)', cursor: 'pointer', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                              <input type="color" value={currentColor} onChange={(e) => setValue('color', e.target.value)} style={{ position: 'absolute', top: '-10px', left: '-10px', width: '60px', height: '60px', cursor: 'pointer' }} title="Elegir color personalizado" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Imagen de unidad</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '12px', border: '2px dashed var(--color-outline-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface-variant)', cursor: 'pointer', transition: 'all 0.2s', fontSize: '14px', fontWeight: 700 }} onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.backgroundColor = 'var(--color-surface)'; }} onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--color-outline-variant)'; e.currentTarget.style.color = 'var(--color-on-surface-variant)'; e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)'; }}>
                        <Plus size={18} strokeWidth={2.5} /> {imagePreview ? 'Cambiar Imagen' : 'Subir Imagen'}
                        <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                      </label>
                      {imagePreview && (
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <img src={imagePreview} alt="Vista previa" style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--color-outline-variant)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                          <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--color-error)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}><X size={12} strokeWidth={3} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {modalMode === 'edit' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '12px', border: '1px solid var(--color-outline-variant)', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', width: '100%' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input type="checkbox" {...register('activo')} style={{ width: '22px', height: '22px', accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-on-surface)' }}>Unidad activa</span>
                        <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', fontWeight: 500, marginTop: '2px' }}>Las unidades inactivas no son visibles para los alumnos</span>
                      </div>
                    </label>
                  </div>
                )}
                </>}
              </div>

              <div id="rq-step-form-actions" className="rq-form-actions rq-step-form-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 24px', background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', fontWeight: 700, cursor: 'pointer', borderRadius: '10px', transition: 'background 0.2s', fontSize: '14px' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  Cancelar
                </button>
                <div className="rq-step-form-actions__primary">
                  {formStep === 2 && <button type="button" onClick={() => setFormStep(1)} style={{ padding: '12px 20px', background: 'transparent', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Anterior</button>}
                  {formStep === 1 ? (
                    <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleNextFormStep(); }} style={{ padding: '12px 28px', backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Continuar</button>
                  ) : (
                    <button type="button" onClick={handleSubmit(handlePreSubmit)} style={{ padding: '12px 28px', backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(153, 27, 27, 0.2)' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(153, 27, 27, 0.3)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(153, 27, 27, 0.2)'; }}>
                      {modalMode === 'create' ? 'Crear Unidad' : 'Guardar cambios'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar unidad?" itemName={itemToDelete ? getUnidadTitulo(itemToDelete) : ''} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />

      {/* Modal Confirmación Guardar */}
      {confirmData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1060, backdropFilter: 'blur(4px)' }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', boxShadow: 'var(--shadow-level-3)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Save size={32} />
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--color-on-surface)' }}>{modalMode === 'create' ? '¿Crear esta unidad?' : '¿Guardar cambios?'}</h2>
            <p style={{ margin: '0 0 24px 0', color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: '1.5' }}>
              {modalMode === 'create' ? `Crearás la unidad "${confirmData.nombre}".` : `Se guardarán los cambios de la unidad "${confirmData.nombre}".`}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmData(null)} style={{ flex: 1, padding: '12px', background: 'var(--color-surface-container-high)', border: 'none', borderRadius: '8px', color: 'var(--color-on-surface)', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmSubmit} style={{ flex: 1, padding: '12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                {modalMode === 'create' ? 'Sí, crear' : 'Sí, guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalles */}
      {selectedUnidadView && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease-out' }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'transparent', width: '100%', maxWidth: '640px', transform: 'scale(1)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column', maxHeight: '95vh' }}>
            
            <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}>
              
              {/* Header con gradiente/color e imagen */}
              <div style={{ 
                position: 'relative', 
                padding: '28px 28px 44px 28px', 
                backgroundColor: selectedUnidadView.color || 'var(--color-primary)', 
                backgroundImage: selectedUnidadView.url_imagen ? `url(${getImageUrl(selectedUnidadView.url_imagen)})` : 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.15) 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                flexShrink: 0
              }}>
                {selectedUnidadView.url_imagen && (
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: selectedUnidadView.color || 'var(--color-primary)', opacity: 0.85, zIndex: 1 }}></div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '56px', height: '56px', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <BookOpen size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.85)', textTransform: 'uppercase', letterSpacing: '1px' }}>Detalles de la Unidad</span>
                      <h2 style={{ margin: '2px 0 0 0', fontSize: '24px', color: 'white', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.3)', lineHeight: 1.2 }}>
                        {getUnidadTitulo(selectedUnidadView)}
                      </h2>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUnidadView(null)} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', backdropFilter: 'blur(4px)', flexShrink: 0 }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.4)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)'}>
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              {/* Body */}
              <div className="academic-modal-scroll" style={{ padding: '0 28px 24px 28px', overflowY: 'auto', flex: 1, marginTop: '-24px', position: 'relative', zIndex: 3 }}>
                
                <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', border: '1px solid var(--color-surface-variant)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Info Principal Integrada */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    
                    {/* Curso */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-surface-variant)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '12px', color: 'var(--color-primary)', border: '1px solid var(--color-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <BookOpen size={22} strokeWidth={2.5} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>CURSO ASOCIADO</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-on-surface)', lineHeight: 1.2 }}>
                            {getCursoName(getUnidadCursoId(selectedUnidadView))}
                          </span>
                          <span style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--color-info-container)', color: 'var(--color-on-info-container)', fontSize: '11px', fontWeight: 800 }}>
                            {getCursoNivelLabel(getCursoById(getUnidadCursoId(selectedUnidadView)))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Orden */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-surface-variant)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '12px', color: 'var(--color-primary)', border: '1px solid var(--color-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ListTree size={22} strokeWidth={2.5} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>ORDEN DE UNIDAD</span>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-on-surface)', lineHeight: 1 }}>#{getUnidadOrden(selectedUnidadView)}</span>
                      </div>
                    </div>

                    {/* Sesiones */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-surface-variant)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '12px', color: 'var(--color-primary)', border: '1px solid var(--color-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Layers size={22} strokeWidth={2.5} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>TOTAL SESIONES</span>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-on-surface)', lineHeight: 1 }}>
                          {selectedUnidadView.sesiones ? selectedUnidadView.sesiones.length : 0}
                        </span>
                      </div>
                    </div>

                    {/* Imagen explícita */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-surface-variant)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      {selectedUnidadView.url_imagen ? (
                        <>
                          <img src={getImageUrl(selectedUnidadView.url_imagen)} alt="Imagen unidad" style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--color-surface-variant)', flexShrink: 0 }} crossOrigin="anonymous" onError={(e) => e.target.style.display = 'none'} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>IMAGEN</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)' }}>Configurada</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '12px', color: 'var(--color-outline)', border: '1px dashed var(--color-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <ImageOff size={22} strokeWidth={2.5} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>IMAGEN</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Por defecto</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Auditoría */}
                <div style={{ marginTop: '20px', backgroundColor: 'var(--color-surface-container-low)', padding: '20px', borderRadius: '20px', border: '1px solid var(--color-surface-variant)' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-on-surface-variant)', letterSpacing: '0.5px', display: 'block', marginBottom: '16px' }}>INFORMACIÓN DE REGISTRO</span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {selectedUnidadView.creado_por?.url_foto_perfil ? (
                        <img src={getImageUrl(selectedUnidadView.creado_por.url_foto_perfil)} alt="Creador" style={{ width: '32px', height: '32px', borderRadius: '10px', objectFit: 'cover' }} crossOrigin="anonymous" onError={(e) => e.target.style.display = 'none'} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'var(--color-info-container)', color: 'var(--color-on-info-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>
                          {formatUserName(selectedUnidadView.creado_por).charAt(0)}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>CREADO POR</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                          {formatUserName(selectedUnidadView.creado_por)}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>
                          {(selectedUnidadView.fecha_creacion || selectedUnidadView.creado_en) ? new Date(selectedUnidadView.fecha_creacion || selectedUnidadView.creado_en).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha desc.'}
                        </span>
                      </div>
                    </div>

                    {selectedUnidadView.actualizado_por_id && selectedUnidadView.actualizado_por_id !== 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {selectedUnidadView.actualizado_por?.url_foto_perfil ? (
                          <img src={getImageUrl(selectedUnidadView.actualizado_por.url_foto_perfil)} alt="Modificador" style={{ width: '32px', height: '32px', borderRadius: '10px', objectFit: 'cover' }} crossOrigin="anonymous" onError={(e) => e.target.style.display = 'none'} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'var(--color-surface-variant)', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>
                              {formatUserName(selectedUnidadView.actualizado_por).charAt(0)}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>MODIFICADO POR</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                            {formatUserName(selectedUnidadView.actualizado_por)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>
                            {(selectedUnidadView.fecha_actualizacion || selectedUnidadView.actualizado_en) ? new Date(selectedUnidadView.fecha_actualizacion || selectedUnidadView.actualizado_en).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha desc.'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--color-outline)', fontWeight: 500, fontStyle: 'italic' }}>Sin modificaciones recientes</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div style={{ padding: '16px 28px', borderTop: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--color-surface)', zIndex: 4, flexShrink: 0 }}>
                <button onClick={() => setSelectedUnidadView(null)} style={{ padding: '12px 28px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(153, 27, 27, 0.2)', fontSize: '14px' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(153, 27, 27, 0.3)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(153, 27, 27, 0.2)'; }}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
