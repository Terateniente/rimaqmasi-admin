import { useEffect, useState, useRef } from 'react';
import { getSesiones, getSesionById, createSesion, updateSesion, deleteSesion, toggleEstadoSesion, uploadSesionImage } from '../../services/sesionService';
import { getUnidads } from '../../services/unidadService';
import { getCursos } from '../../services/cursoService';
import { getIdiomas } from '../../services/idiomaService';
import { getUsuarios } from '../../services/userService';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, X, Save, Layers, BookOpen, CheckCircle, XCircle, FileVideo, Mic, FileText, Layout, Eye, MessageSquare, ArrowRight, Video, FileAudio, FileBadge, Link as LinkIcon, Download, ListTree, MousePointerClick, PlayCircle, LoaderCircle, Check, Filter, ChevronDown, ChevronUp, ChevronsUpDown, Image as ImageIcon, AlignLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { WizardProgress } from '../../components/WizardProgress';
import { RimaqSelect } from '../../components/RimaqSelect';

// --- Componente removido, pasado a Lecciones ---
const SesionTableRow = ({ sesion, index, cursos, unidads, idiomas, getImageUrl, onView, onEdit, onDelete, onToggleEstado }) => {
  const isActive = sesion.estado === 'activo';
  const sesionOrden = sesion.orden ?? sesion.orden_clasificacion;
  const sesionColor = sesion.color || '#B3262E';
  const sesionImage = getImageUrl(sesion.url_imagen);
  
  const unidad = unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(sesion.unidad_id));
  const curso = cursos.find(c => String(c.curso_id || c.cursos_id || c.id) === String(unidad?.curso_id || unidad?.cursos_id));
  const idiomaOrigenFull = idiomas.find(i => String(i.idioma_id || i.id) === String(curso?.idioma_origen_id || curso?.idioma_origen?.idioma_id || curso?.idiomaOrigen?.idioma_id));
  const idiomaDestinoFull = idiomas.find(i => String(i.idioma_id || i.id) === String(curso?.idioma_destino_id || curso?.idioma_destino?.idioma_id || curso?.idiomaDestino?.idioma_id));
  const idiomaOrigenNombre = idiomaOrigenFull?.nombres || idiomaOrigenFull?.nombre || curso?.idioma_origen?.nombre || curso?.idiomaOrigen?.nombre || 'Desconocido';
  const idiomaDestinoNombre = idiomaDestinoFull?.nombres || idiomaDestinoFull?.nombre || curso?.idioma_destino?.nombre || curso?.idiomaDestino?.nombre || 'Desconocido';
  const nivelCurso = curso?.nivel || 'A1';
  const nivelLabel = nivelCurso.startsWith('A') ? `${nivelCurso} - Básico` : nivelCurso.startsWith('B') ? `${nivelCurso} - Intermedio` : nivelCurso.startsWith('C') ? `${nivelCurso} - Avanzado` : nivelCurso;

  const flagOrigen = getImageUrl(idiomaOrigenFull?.url_icono_bandera);
  const flagDestino = getImageUrl(idiomaDestinoFull?.url_icono_bandera);

  const bgRow = index % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-container-low)';

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
          #{sesionOrden}
        </span>
      </td>

      {/* Sesión y Cód (ID) */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {sesionImage ? (
            <img src={sesionImage} alt={sesion.titulo} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--color-surface-variant)' }} crossOrigin="anonymous" onError={(e) => e.currentTarget.style.display = 'none'} />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--color-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ImageIcon size={16} color="var(--color-outline)" />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span title={`Color: ${sesionColor}`} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: sesionColor, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-on-surface)', letterSpacing: '-0.3px' }}>
                {sesion.titulo}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>{sesionImage ? 'Imagen configurada' : 'Sin imagen'}</span>
          </div>
        </div>
      </td>
      
      {/* Unidad y Curso Asociado */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
            Unidad {(unidad?.orden ?? unidad?.orden_clasificacion) || '?'}: {unidad?.nombre || unidad?.titulo || 'Unidad desconocida'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            {flagOrigen && <img src={flagOrigen} alt="Origen" style={{ width: '12px', height: '12px', borderRadius: '2px', objectFit: 'cover' }} crossOrigin="anonymous" onError={(e) => e.target.style.display = 'none'} />}
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-secondary)' }}>{idiomaOrigenNombre}</span>
            <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>→</span>
            {flagDestino && <img src={flagDestino} alt="Destino" style={{ width: '12px', height: '12px', borderRadius: '2px', objectFit: 'cover' }} crossOrigin="anonymous" onError={(e) => e.target.style.display = 'none'} />}
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-secondary)' }}>{idiomaDestinoNombre}</span>
            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-on-surface)', backgroundColor: 'var(--color-surface-variant)', padding: '2px 6px', borderRadius: '10px', marginLeft: '4px' }}>{nivelLabel}</span>
          </div>
        </div>
      </td>

      {/* Estado */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onToggleEstado(sesion)}
            style={{
              width: '36px', height: '20px',
              backgroundColor: isActive ? '#991b1b' : 'var(--color-surface-variant)',
              borderRadius: '10px', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.3s ease', padding: 0
            }}
          >
            <div style={{ width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: isActive ? '18px' : '2px', transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
          </button>
          <span style={{
            fontSize: '12px', fontWeight: 600,
            color: isActive ? '#991b1b' : 'var(--color-on-surface-variant)'
          }}>
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </td>

      {/* Acciones */}
      <td style={{ padding: '16px', textAlign: 'right' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={() => onView(sesion, unidad, curso)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: '0', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--color-secondary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-primary)'} title="Ver detalles">
            <Eye size={18} strokeWidth={2} />
          </button>
          <button onClick={() => onEdit(sesion, unidad?.curso_id || unidad?.cursos_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: '0', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--color-secondary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-primary)'} title="Editar">
            <Edit2 size={18} strokeWidth={2} />
          </button>
          <button onClick={() => onDelete(sesion)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '0', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.7'} onMouseOut={e => e.currentTarget.style.opacity = '1'} title="Eliminar">
            <Trash2 size={18} strokeWidth={2} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const Sesiones = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.usuarios_id || user?.usuario_id;

  const [sesiones, setSesiones] = useState([]);
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentId, setCurrentId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [selectedSesionView, setSelectedSesionView] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formStep, setFormStep] = useState(1);
  const [rememberLocation, setRememberLocation] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const PREDEFINED_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
    '#b91c1c', '#c2410c', '#b45309', '#4d7c0f', '#15803d', '#047857', '#0f766e', '#0e7490', '#0369a1', '#1d4ed8', '#4338ca', '#6d28d9', '#7e22ce', '#a21caf', '#be185d', '#be123c',
    '#7f1d1d', '#7c2d12', '#78350f', '#365314', '#14532d', '#064e3b', '#134e4a', '#164e63', '#0c4a6e', '#1e3a8a', '#312e81', '#4c1d95', '#581c87', '#701a75', '#831843', '#881337'
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [cursoFilter, setCursoFilter] = useState('all');
  const [unidadFilter, setUnidadFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'orden_clasificacion', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, cursoFilter, unidadFilter, statusFilter, sortConfig]);

  useEffect(() => () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors }, trigger } = useForm();
  
  const formCursoId = watch('form_curso_id');
  const formUnidadsId = watch('unidad_id');

  const getNextSesionOrder = (unidadId) => {
    if (!unidadId) return 1;
    const relatedSesiones = sesiones.filter(sesion => String(sesion.unidad_id) === String(unidadId));
    const maxOrder = relatedSesiones.reduce((max, sesion) => Math.max(max, Number(sesion.orden ?? sesion.orden_clasificacion) || 0), 0);
    return maxOrder + 1;
  };

  useEffect(() => {
    if (modalMode === 'create') {
      setValue('orden_clasificacion', getNextSesionOrder(formUnidadsId), { shouldValidate: true });
    }
  }, [formUnidadsId, modalMode, sesiones, setValue]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sesionesRes, unidadsRes, cursosRes, idiomasRes, usuariosRes] = await Promise.all([
        getSesiones(),
        getUnidads(),
        getCursos(),
        getIdiomas(),
        getUsuarios()
      ]);
      const sesionesList = Array.isArray(sesionesRes) ? sesionesRes : (sesionesRes.data || []);
      const unidadsList = Array.isArray(unidadsRes) ? unidadsRes : (unidadsRes.data || []);
      const cursosList = Array.isArray(cursosRes) ? cursosRes : (cursosRes.data || []);
      const idiomasList = Array.isArray(idiomasRes) ? idiomasRes : (idiomasRes.data || []);
      const usuariosList = Array.isArray(usuariosRes) ? usuariosRes : (usuariosRes.data || []);
      
      sesionesList.sort((a, b) => a.orden_clasificacion - b.orden_clasificacion);
      
      setSesiones(sesionesList);
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

  const getCursoName = (cursoId) => {
    const curso = cursos.find(c => String(c.curso_id || c.cursos_id || c.id) === String(cursoId));
    if (!curso) return 'Desconocido';
    const idiomaOrigen = idiomas.find(i => String(i.idioma_id || i.id) === String(curso.idioma_origen_id || curso.idioma_origen?.idioma_id || curso.idiomaOrigen?.idioma_id));
    const idiomaDestino = idiomas.find(i => String(i.idioma_id || i.id) === String(curso.idioma_destino_id || curso.idioma_destino?.idioma_id || curso.idiomaDestino?.idioma_id));
    const origen = idiomaOrigen?.nombres || idiomaOrigen?.nombre || curso.idioma_origen?.nombre || curso.idiomaOrigen?.nombre || 'Origen';
    const destino = idiomaDestino?.nombres || idiomaDestino?.nombre || curso.idioma_destino?.nombre || curso.idiomaDestino?.nombre || 'Destino';
    const nivel = curso.nivel || 'A1';
    return `${origen} → ${destino} (${nivel})`;
  };

  const getUnidadId = (u) => String(u.unidad_id || u.unidads_id || u.id);
  const getUnidadCursoId = (u) => String(u.curso_id || u.cursos_id);

  const handleOpenCreate = () => {
    setModalMode('create');
    setCurrentId(null);
    const savedCursoId = localStorage.getItem('sesion.defaultCursoId') || '';
    const savedUnidadId = localStorage.getItem('sesion.defaultUnidadId') || '';
    const hasSavedLocation = Boolean(savedCursoId && savedUnidadId);
    reset({
      form_curso_id: savedCursoId,
      unidad_id: savedUnidadId,
      titulo: '',
      orden_clasificacion: getNextSesionOrder(savedUnidadId || null),
      color: '#B3262E',
      url_imagen: '',
      activo: true
    });
    setImageFile(null);
    setImagePreview(null);
    setRememberLocation(hasSavedLocation);
    setFormStep(hasSavedLocation ? 2 : 1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sesion, cursoId) => {
    setModalMode('edit');
    setCurrentId(sesion.sesion_id || sesion.sesiones_id || sesion.id);
    reset({
      form_curso_id: cursoId || '',
      unidad_id: getUnidadId(sesion) || '',
      titulo: sesion.titulo,
      orden_clasificacion: sesion.orden_clasificacion,
      color: sesion.color || '#B3262E',
      url_imagen: sesion.url_imagen || '',
      activo: sesion.activo !== 0 && sesion.activo !== false
    });
    setImageFile(null);
    setImagePreview(sesion.url_imagen ? getImageUrl(sesion.url_imagen) : null);
    setRememberLocation(false);
    setFormStep(1);
    setIsModalOpen(true);
  };

  const handleNextFormStep = async () => {
    const isValid = await trigger(['form_curso_id', 'unidad_id']);
    if (!isValid) return;
    if (modalMode === 'create' && rememberLocation) {
      localStorage.setItem('sesion.defaultCursoId', String(formCursoId));
      localStorage.setItem('sesion.defaultUnidadId', String(formUnidadsId));
    }
    if (modalMode === 'create') setValue('orden_clasificacion', getNextSesionOrder(formUnidadsId), { shouldValidate: true });
    setFormStep(2);
  };

  const handleRememberLocationToggle = async () => {
    if (rememberLocation) {
      setRememberLocation(false);
      localStorage.removeItem('sesion.defaultCursoId');
      localStorage.removeItem('sesion.defaultUnidadId');
      toast.success('El curso y la unidad ya no se reutilizarán automáticamente.');
      return;
    }
    const isValid = await trigger(['form_curso_id', 'unidad_id']);
    if (!isValid) return;
    localStorage.setItem('sesion.defaultCursoId', String(formCursoId));
    localStorage.setItem('sesion.defaultUnidadId', String(formUnidadsId));
    setRememberLocation(true);
    toast.success('Curso y unidad guardados para reutilizarlos en nuevas sesiones.');
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar los 5 MB');
      event.target.value = '';
      return;
    }
    setImageFile(file);
    setImagePreview((currentPreview) => {
      if (currentPreview?.startsWith('blob:')) URL.revokeObjectURL(currentPreview);
      return URL.createObjectURL(file);
    });
  };

  const handleView = async (sesion, unidad, curso) => {
    try {
      const response = await getSesionById(sesion.sesion_id || sesion.sesiones_id || sesion.id);
      let sesionData = response.data || response;
      if (!sesionData.creado_por && sesionData.creado_por_id) {
        sesionData.creado_por = usuarios.find(u => String(u.usuario_id || u.id || u.usuarios_id) === String(sesionData.creado_por_id));
      }
      if (!sesionData.actualizado_por && sesionData.actualizado_por_id) {
        sesionData.actualizado_por = usuarios.find(u => String(u.usuario_id || u.id || u.usuarios_id) === String(sesionData.actualizado_por_id));
      }
      const unidadId = sesionData.unidad_id || sesionData.unidads_id || sesion.unidad_id || sesion.unidads_id;
      const unidadAsociada = unidads.find(item => getUnidadId(item) === String(unidadId)) || unidad;
      const cursoId = unidadAsociada?.curso_id || unidadAsociada?.cursos_id;
      const cursoAsociado = cursos.find(item => String(item.curso_id || item.cursos_id || item.id) === String(cursoId)) || curso;
      setSelectedSesionView({ ...sesionData, unidad_asociada: unidadAsociada, curso_asociado: cursoAsociado });
    } catch (error) {
      toast.error('Error al obtener los detalles de la sesión');
      const unidadId = sesion.unidad_id || sesion.unidads_id;
      const unidadAsociada = unidads.find(item => getUnidadId(item) === String(unidadId)) || unidad;
      const cursoId = unidadAsociada?.curso_id || unidadAsociada?.cursos_id;
      const cursoAsociado = cursos.find(item => String(item.curso_id || item.cursos_id || item.id) === String(cursoId)) || curso;
      setSelectedSesionView({ ...sesion, unidad_asociada: unidadAsociada, curso_asociado: cursoAsociado });
    }
  };

  const handleDelete = (sesion) => {
    setItemToDelete(sesion);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete.sesion_id || itemToDelete.sesiones_id || itemToDelete.id;
    const toastId = toast.loading('Eliminando sesión...');
    try {
      await deleteSesion(id);
      toast.success('Sesión eliminada exitosamente', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar la sesión', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleToggleEstado = async (sesion) => {
    const id = sesion.sesion_id || sesion.sesiones_id || sesion.id;
    const toastId = toast.loading(`${sesion.estado === 'activo' ? 'Desactivando' : 'Activando'} sesión...`);
    try {
      await toggleEstadoSesion(id, {
        estado: sesion.estado === 'activo' ? 'inactivo' : 'activo',
        actualizado_por_id: currentUserId
      });
      toast.success(`Sesión ${sesion.estado === 'activo' ? 'desactivado' : 'activado'} exitosamente`, { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado', { id: toastId });
    }
  };

  const handlePreSubmit = (data) => {
    setConfirmData(data);
  };

  const confirmSubmit = async () => {
    if (!confirmData) return;
    const data = confirmData;

    // Validación de frontend para orden_clasificacion duplicado en la misma unidad
    const isDuplicateOrder = sesiones.some(
      s => String(s.unidad_id) === String(data.unidad_id) && 
           String(s.orden ?? s.orden_clasificacion) === String(data.orden_clasificacion) &&
           String(s.sesion_id || s.sesiones_id || s.id) !== String(currentId)
    );

    if (isDuplicateOrder) {
      toast.error(`Ya existe una sesión con el orden de clasificación ${data.orden_clasificacion} en esta unidad.`);
      setConfirmData(null);
      return;
    }

    const actionName = modalMode === 'create' ? 'Creando' : 'Actualizando';
    const toastId = toast.loading(`${actionName} sesión...`);
    try {
      let imageUrl = data.url_imagen || null;
      if (imageFile) {
        const uploadResult = await uploadSesionImage(imageFile);
        imageUrl = uploadResult.url;
      }
      const payload = {
        unidad_id: parseInt(data.unidad_id),
        titulo: data.titulo,
        orden: parseInt(data.orden_clasificacion),
        color: data.color || null,
        url_imagen: imageUrl,
        estado: (data.activo !== undefined ? data.activo : true) ? 'activo' : 'inactivo'
      };

      if (modalMode === 'create') {
        payload.creado_por_id = currentUserId;
        await createSesion(payload);
        toast.success('Sesión creada exitosamente', { id: toastId });
      } else {
        payload.actualizado_por_id = currentUserId;
        await updateSesion(currentId, payload);
        toast.success('Sesión actualizada exitosamente', { id: toastId });
      }
      setIsModalOpen(false);
      setConfirmData(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} la sesión`, { id: toastId });
    }
  };

  // Filtrado de unidads para el formulario basado en el curso seleccionado
  const unidadsParaFormulario = formCursoId 
    ? unidads.filter(e => String(e.curso_id || e.cursos_id) === String(formCursoId)) 
    : [];

  const filteredSesiones = sesiones.filter(sesion => {
    const unidad = unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(sesion.unidad_id));
    const curso = cursos.find(c => String(c.curso_id || c.cursos_id || c.id) === String(unidad?.curso_id || unidad?.cursos_id));
    const cursoIdStr = unidad ? String(unidad.curso_id || unidad.cursos_id) : '';
    
    const searchMatched = matchesSearch(sesion.titulo, searchTerm) ||
      matchesSearch(unidad?.nombre || unidad?.titulo, searchTerm) ||
      matchesSearch(getCursoName(cursoIdStr), searchTerm) ||
      matchesSearch(curso?.nivel || 'A1', searchTerm);
    const matchesCurso = cursoFilter === 'all' || cursoIdStr === cursoFilter;
    const matchesUnidad = unidadFilter === 'all' || String(sesion.unidad_id) === unidadFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && sesion.estado === 'activo') || (statusFilter === 'inactive' && sesion.estado !== 'activo');
    
    return searchMatched && matchesCurso && matchesUnidad && matchesStatus;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const finalSesiones = [...filteredSesiones].sort((a, b) => {
    if (sortConfig.key === 'unidad') {
      const unidadA = unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(a.unidad_id))?.nombre || unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(a.unidad_id))?.titulo || '';
      const unidadB = unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(b.unidad_id))?.nombre || unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(b.unidad_id))?.titulo || '';
      if (unidadA < unidadB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (unidadA > unidadB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    }
    
    if (sortConfig.key === 'orden_clasificacion') {
      const unidadA = unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(a.unidad_id));
      const unidadB = unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(b.unidad_id));
      
      const ordenUnidadA = Number(unidadA?.orden_clasificacion || 0);
      const ordenUnidadB = Number(unidadB?.orden_clasificacion || 0);
      
      if (ordenUnidadA !== ordenUnidadB) {
        return sortConfig.direction === 'asc' ? ordenUnidadA - ordenUnidadB : ordenUnidadB - ordenUnidadA;
      }
      
      const ordenSesionA = Number((a.orden ?? a.orden_clasificacion) || 0);
      const ordenSesionB = Number((b.orden ?? b.orden_clasificacion) || 0);
      
      return sortConfig.direction === 'asc' ? ordenSesionA - ordenSesionB : ordenSesionB - ordenSesionA;
    }
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    if (sortConfig.key === 'titulo') {
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(finalSesiones.length / itemsPerPage) || 1;
  const paginatedSesiones = finalSesiones.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="academic-modal-scroll" style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>

      <div className="flex-col-mobile" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div className="rq-page-heading">
            <div className="rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">Gestión de Sesiones</h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Administra las sesiones dentro de las unidades de los cursos.
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
          Crear Sesión
        </button>
      </div>

      {/* Barra de Filtros Compacta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          
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
                placeholder="Sesión, unidad o curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '14px', fontWeight: 500, color: 'var(--color-on-surface)' }}
              />
            </div>
          </div>
          
          {/* Curso y nivel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>1. Curso y nivel</label>
            <RimaqSelect
              value={cursoFilter}
              onValueChange={(val) => { setCursoFilter(val); setUnidadFilter('all'); }}
              options={[
                { value: 'all', label: 'Todos los cursos' },
                ...cursos.map(c => ({
                  value: String(c.curso_id || c.cursos_id || c.id),
                  label: getCursoName(c.curso_id || c.cursos_id || c.id)
                }))
              ]}
              style={{ minWidth: '220px' }}
            />
          </div>

          {/* Unidad */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>2. Unidad</label>
            <RimaqSelect
              value={unidadFilter}
              onValueChange={setUnidadFilter}
              disabled={cursoFilter === 'all'}
              placeholder="Todas las unidades"
              options={[
                { value: 'all', label: 'Todas las unidades' },
                ...unidads
                  .filter(u => String(getUnidadCursoId(u)) === String(cursoFilter))
                  .map(u => ({
                    value: String(getUnidadId(u)),
                    label: u.nombre || u.titulo
                  }))
              ]}
              style={{ minWidth: '200px' }}
            />
          </div>

          {/* Estado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Estado de sesión</label>
            <RimaqSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'active', label: 'Activos' },
                { value: 'inactive', label: 'Inactivos' }
              ]}
              style={{ minWidth: '160px' }}
            />
          </div>
        </div>

      {/* Tabla de Sesiones */}
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
                <th onClick={() => handleSort('orden_clasificacion')} style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, width: '80px', cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Orden
                    {sortConfig.key === 'orden_clasificacion' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} opacity={0.5} />}
                  </div>
                </th>
                <th onClick={() => handleSort('titulo')} style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Sesión
                    {sortConfig.key === 'titulo' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} opacity={0.5} />}
                  </div>
                </th>
                <th onClick={() => handleSort('unidad')} style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Unidad y Curso
                    {sortConfig.key === 'unidad' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} opacity={0.5} />}
                  </div>
                </th>
                <th onClick={() => handleSort('activo')} style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Estado
                    {sortConfig.key === 'activo' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} opacity={0.5} />}
                  </div>
                </th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-surface-variant)' }}>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '40px', height: '20px', borderRadius: '4px' }}></div></td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="skeleton" style={{ width: '180px', height: '20px', borderRadius: '8px' }}></div>
                        <div className="skeleton" style={{ width: '100px', height: '14px', borderRadius: '4px' }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="skeleton" style={{ width: '140px', height: '20px', borderRadius: '12px' }}></div>
                        <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }}></div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '60px', height: '32px', borderRadius: '8px' }}></div></td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '8px', marginLeft: 'auto' }}></div></td>
                  </tr>
                ))
              ) : finalSesiones.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--color-outline)' }}>
                    <ListTree size={48} strokeWidth={1.5} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>
                      {searchTerm || cursoFilter !== 'all' || unidadFilter !== 'all' || statusFilter !== 'all' ? 'No se encontraron sesiones con esos filtros' : 'Aún no hay sesiones registradas'}
                    </p>
                    <p style={{ fontSize: '13px', margin: 0 }}>
                      {searchTerm || cursoFilter !== 'all' || unidadFilter !== 'all' || statusFilter !== 'all' ? 'Intenta con otra búsqueda' : 'Crea la primera sesión haciendo clic en "Crear Sesión"'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSesiones.map((sesion, i) => (
                  <SesionTableRow
                    key={sesion.sesion_id || sesion.sesiones_id || sesion.id || i}
                    index={i}
                    sesion={sesion}
                    cursos={cursos}
                    unidads={unidads}
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
                <div>
                  <h2 style={{ margin: '0', fontSize: '24px', fontWeight: 800, color: 'var(--color-on-surface)', letterSpacing: '-0.01em' }}>
                    {modalMode === 'create' ? 'Crear Nueva Sesión' : 'Editar Sesión'}
                  </h2>
                </div>
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
                    { label: 'Ubicación', description: 'Selecciona el curso y la unidad de la sesión.' },
                    { label: 'Datos principales', description: 'Configura el título, orden, color e imagen.' }
                  ]}
                />

                {formStep === 1 && <>
                {/* Curso y Unidad */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Curso Asociado</label>
                    <input type="hidden" {...register('form_curso_id', { required: 'El curso es requerido' })} />
                    <RimaqSelect
                      value={String(formCursoId || '')}
                      onValueChange={(val) => {
                        setValue('form_curso_id', val, { shouldValidate: true });
                        setValue('unidad_id', '', { shouldValidate: true });
                      }}
                      placeholder="Seleccione un curso"
                      options={cursos.map(c => ({
                        value: String(c.curso_id || c.cursos_id || c.id),
                        label: getCursoName(c.curso_id || c.cursos_id || c.id)
                      }))}
                      className="rimaq-select--full-width"
                    />
                    {errors.form_curso_id && <span style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 500 }}>{errors.form_curso_id.message}</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Unidad Asociada</label>
                    <input type="hidden" {...register('unidad_id', { required: 'La unidad es requerida' })} />
                    <RimaqSelect
                      value={String(formUnidadsId || '')}
                      onValueChange={(val) => setValue('unidad_id', val, { shouldValidate: true })}
                      placeholder="Seleccione una unidad"
                      options={unidadsParaFormulario.map(e => ({
                        value: String(e.unidad_id || e.unidads_id || e.id),
                        label: e.nombre || e.titulo
                      }))}
                      disabled={!formCursoId}
                      className="rimaq-select--full-width"
                    />
                    {errors.unidad_id && <span style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 500 }}>{errors.unidad_id.message}</span>}
                  </div>
                </div>

                {modalMode === 'create' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '12px 14px', borderRadius: '10px', background: 'var(--color-surface-container-low)' }}>
                    <div><strong style={{ display: 'block', color: 'var(--color-on-surface)', fontSize: '13px' }}>Guardar para reutilizar</strong><span style={{ display: 'block', marginTop: '3px', color: 'var(--color-on-surface-variant)', fontSize: '11px' }}>Recordar este curso y unidad en las próximas sesiones.</span></div>
                    <button type="button" role="switch" aria-checked={rememberLocation} onClick={handleRememberLocationToggle} style={{ position: 'relative', flex: '0 0 auto', width: '44px', height: '24px', minHeight: '24px', padding: 0, border: 'none', borderRadius: '99px', cursor: 'pointer', backgroundColor: rememberLocation ? 'var(--color-primary)' : 'var(--color-surface-variant)', transition: 'background-color .2s' }}><span style={{ position: 'absolute', top: '3px', left: rememberLocation ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s' }} /></button>
                  </div>
                )}
                </>}

                {formStep === 2 && <>
                {/* Orden y Título */}
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Orden</label>
                    <input type="number" min="1" {...register('orden_clasificacion', { required: 'El orden es requerido', min: { value: 1, message: 'Debe ser mayor a 0' } })} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--color-outline-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-primary)', outline: 'none', fontSize: '16px', fontWeight: 800, textAlign: 'center', transition: 'all 0.2s' }} placeholder="1" onFocus={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'} />
                    {errors.orden_clasificacion && <span style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 500 }}>{errors.orden_clasificacion.message}</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Título de la sesión</label>
                    <input type="text" {...register('titulo', { required: 'El título es requerido' })} style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--color-outline-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', outline: 'none', fontSize: '15px', fontWeight: 500, transition: 'all 0.2s' }} placeholder="Saludos básicos" onFocus={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'} />
                    {errors.titulo && <span style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 500 }}>{errors.titulo.message}</span>}
                  </div>
                </div>

                {/* Color e Imagen */}
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Color</label>
                    <div 
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      style={{ width: '100%', height: '52px', borderRadius: '12px', border: showColorPicker ? '2px solid var(--color-on-surface)' : '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: watch('color') || '#B3262E', transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)' }}
                    >
                      <input type="hidden" {...register('color')} />
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', textShadow: '0px 1px 3px rgba(0,0,0,0.4)', letterSpacing: '0.5px' }}>{watch('color') || '#B3262E'}</span>
                    </div>
                    
                    {showColorPicker && (
                      <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, padding: '20px', backgroundColor: 'var(--color-surface)', borderRadius: '20px', boxShadow: '0 12px 40px -10px rgba(0,0,0,0.4)', border: '1px solid var(--color-surface-variant)', zIndex: 100, width: 'max-content', display: 'flex', flexDirection: 'column' }}>
                        <div className="academic-modal-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 28px)', gap: '8px', maxHeight: '136px', overflowY: 'auto', paddingRight: '4px' }}>
                          {PREDEFINED_COLORS.map(c => (
                            <div
                              key={c}
                              onClick={() => { setValue('color', c, { shouldDirty: true }); setShowColorPicker(false); }}
                              style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: c, cursor: 'pointer', border: (watch('color') || '#B3262E') === c ? '2px solid var(--color-on-surface)' : '1px solid rgba(0,0,0,0.1)', transform: (watch('color') || '#B3262E') === c ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s', position: 'relative', zIndex: (watch('color') || '#B3262E') === c ? 2 : 1 }}
                              onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.zIndex = 3; }}
                              onMouseOut={e => { e.currentTarget.style.transform = (watch('color') || '#B3262E') === c ? 'scale(1.15)' : 'scale(1)'; e.currentTarget.style.zIndex = (watch('color') || '#B3262E') === c ? 2 : 1; }}
                            />
                          ))}
                        </div>
                        <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-surface-variant)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-outline)' }}>HEX:</span>
                            <input type="text" value={watch('color') || '#B3262E'} onChange={(e) => setValue('color', e.target.value)} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', fontSize: '12px', fontWeight: 700, outline: 'none', width: '80px', textTransform: 'uppercase', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }} />
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-outline)' }}>MÁS:</span>
                            <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-outline-variant)', cursor: 'pointer', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                              <input type="color" value={watch('color') || '#B3262E'} onChange={(e) => setValue('color', e.target.value)} style={{ position: 'absolute', top: '-10px', left: '-10px', width: '60px', height: '60px', cursor: 'pointer' }} title="Color personalizado" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Imagen de sesión</label>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '12px', marginTop: '8px', border: '1px solid var(--color-outline-variant)' }}>
                    <input type="checkbox" {...register('activo')} id="activo" style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
                    <label htmlFor="activo" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-on-surface)', cursor: 'pointer' }}>Sesión activa y visible para estudiantes</label>
                  </div>
                )}
                </>}
              </div>

              <div id="rq-step-form-actions" className="rq-form-actions rq-step-form-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '14px 28px', background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', fontWeight: 800, cursor: 'pointer', borderRadius: '12px', transition: 'all 0.2s', fontSize: '14px' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  Cancelar
                </button>
                <div className="rq-step-form-actions__primary">
                  {formStep > 1 && <button type="button" onClick={() => setFormStep(step => step - 1)}>Anterior</button>}
                  {formStep < 2 ? (
                    <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleNextFormStep(); }}>Continuar</button>
                  ) : (
                    <button type="button" onClick={handleSubmit(handlePreSubmit)}>{modalMode === 'create' ? 'Crear Sesión' : 'Guardar cambios'}</button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar sesión?" itemName={itemToDelete?.titulo} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />

      {/* Modal Confirmación Guardar */}
      {confirmData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1060, backdropFilter: 'blur(4px)' }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', boxShadow: 'var(--shadow-level-3)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Save size={32} />
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--color-on-surface)' }}>{modalMode === 'create' ? '¿Crear esta sesión?' : '¿Guardar cambios?'}</h2>
            <p style={{ margin: '0 0 24px 0', color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: '1.5' }}>
              {modalMode === 'create' ? `Crearás la nueva sesión "${confirmData.titulo}".` : `Se guardarán los cambios de la sesión "${confirmData.titulo}".`}
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
      {selectedSesionView && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 24px 60px rgba(0,0,0,0.28)', animation: 'modalSlideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            
            {/* Header Colored */}
            <div style={{ backgroundColor: selectedSesionView.color || '#B3262E', padding: '32px 28px 48px 28px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)', pointerEvents: 'none' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', backgroundColor: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(4px)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <BookOpen size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.85)', textTransform: 'uppercase', letterSpacing: '1px' }}>Detalles de Sesión</span>
                    <h2 style={{ margin: '2px 0 0 0', fontSize: '24px', color: 'white', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.3)', lineHeight: 1.2 }}>
                      {selectedSesionView.titulo}
                    </h2>
                  </div>
                </div>
                <button onClick={() => setSelectedSesionView(null)} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', backdropFilter: 'blur(4px)', flexShrink: 0 }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.4)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)'}>
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="academic-modal-scroll" style={{ padding: '0 28px 24px 28px', overflowY: 'auto', flex: 1, marginTop: '-24px', position: 'relative', zIndex: 3 }}>
              
              <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', border: '1px solid var(--color-surface-variant)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Info Principal Integrada */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                  
                  {/* Unidad */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-surface-variant)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '12px', color: 'var(--color-primary)', border: '1px solid var(--color-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Layers size={22} strokeWidth={2.5} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>UNIDAD ASOCIADA</span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-on-surface)', lineHeight: 1.2 }}>
                        {selectedSesionView.unidad_asociada?.nombre || selectedSesionView.unidad_asociada?.titulo || 'Desconocida'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Curso */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-surface-variant)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '12px', color: 'var(--color-primary)', border: '1px solid var(--color-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={22} strokeWidth={2.5} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>CURSO ASOCIADO</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-on-surface)', lineHeight: 1.2 }}>
                          {getCursoName(selectedSesionView.curso_asociado?.curso_id || selectedSesionView.curso_asociado?.cursos_id || selectedSesionView.curso_asociado?.id)}
                        </span>
                        <span style={{ padding: '2px 8px', backgroundColor: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>
                          {selectedSesionView.curso_asociado?.nivel || 'A1'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Orden */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-surface-variant)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '12px', color: 'var(--color-primary)', border: '1px solid var(--color-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ListTree size={22} strokeWidth={2.5} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>ORDEN DE SESIÓN</span>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-on-surface)', lineHeight: 1 }}>
                        #{selectedSesionView.orden ?? selectedSesionView.orden_clasificacion}
                      </span>
                    </div>
                  </div>

                  {/* Lecciones */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-surface-variant)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '12px', color: 'var(--color-primary)', border: '1px solid var(--color-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AlignLeft size={22} strokeWidth={2.5} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>TOTAL LECCIONES</span>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-on-surface)', lineHeight: 1 }}>
                        {selectedSesionView.lecciones ? selectedSesionView.lecciones.length : 0}
                      </span>
                    </div>
                  </div>

                  {/* Imagen */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '16px', border: '1px solid var(--color-surface-variant)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', gridColumn: '1 / -1' }}>
                    <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '12px', color: 'var(--color-primary)', border: '1px dashed var(--color-outline)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {selectedSesionView.url_imagen ? (
                        <img src={getImageUrl(selectedSesionView.url_imagen)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                      ) : (
                        <ImageIcon size={22} strokeWidth={1.5} color="var(--color-outline)" />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>IMAGEN</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                        {selectedSesionView.url_imagen ? 'Personalizada' : 'Por defecto'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
              </div>

              <div style={{ padding: '16px 28px', borderTop: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--color-surface)', zIndex: 4, flexShrink: 0, borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
                <button onClick={() => setSelectedSesionView(null)} style={{ padding: '12px 28px', backgroundColor: selectedSesionView.color || 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 4px 12px ${selectedSesionView.color ? selectedSesionView.color + '40' : 'rgba(153, 27, 27, 0.2)'}`, fontSize: '14px' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 16px ${selectedSesionView.color ? selectedSesionView.color + '60' : 'rgba(153, 27, 27, 0.3)'}`; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 12px ${selectedSesionView.color ? selectedSesionView.color + '40' : 'rgba(153, 27, 27, 0.2)'}`; }}>
                  Entendido
                </button>
              </div>
          </div>
        </div>
      )}

    </div>
  );
};
