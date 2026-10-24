import { useEffect, useState } from 'react';
import { getLecciones, getLeccionById, createLeccion, updateLeccion, deleteLeccion, toggleEstadoLeccion, uploadAudioLeccion, uploadDocumentoLeccion } from '../../services/leccionService';
import { getSesiones } from '../../services/sesionService';
import { getUnidads } from '../../services/unidadService';
import { getCursos } from '../../services/cursoService';
import { getIdiomas } from '../../services/idiomaService';
import { getUsuarios } from '../../services/userService';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, X, Save, Layers, BookOpen, CheckCircle, XCircle, ChevronLeft, ChevronRight, PlayCircle, LoaderCircle, Check, FileText, CheckSquare, GripVertical, AlertCircle, FileVideo, ShieldCheck, Filter, ChevronDown, Eye, ListTree, Target, Award, Globe, LayoutList, AlignLeft, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { matchesSearch } from '../../utils/searchUtils';
import api from '../../services/api';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { WizardProgress } from '../../components/WizardProgress';
import { RimaqSelect } from '../../components/RimaqSelect';

const formatUserName = (usuario) => {
  if (!usuario) return 'Usuario';
  return `${usuario.nombres || usuario.nombre || ''} ${usuario.apellidos || usuario.apellido || ''}`.trim() || 'Usuario';
};

const LECCION_CONTEXT_DRAFT_KEY = 'rimaqmasi:leccion-contexto-borrador';

const LeccionTableRow = ({ leccion, index, cursos, unidads, sesiones, idiomas, getImageUrl, onView, onEdit, onDelete, onToggleEstado }) => {
  const isActive = leccion.estado === 'activo';
  const leccionId = leccion.leccion_id || leccion.lecciones_id || leccion.id;
  const leccionOrden = leccion.orden ?? leccion.orden_clasificacion;
  const leccionColor = leccion.color || '#B3262E';
  const leccionIcono = leccion.url_icono || leccion.identificador_icono;
  const leccionXp = leccion.xp_recompensa ?? leccion.xp_recompensa_base ?? 10;
  
  const sesion = sesiones.find(s => String(s.sesion_id || s.sesiones_id || s.id) === String(leccion.sesion_id || leccion.sesiones_id));
  const unidad = unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(sesion?.unidad_id));
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
          #{leccionOrden}
        </span>
      </td>

      {/* Lección y Cód */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {leccionIcono ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--color-surface-variant)', border: `2px solid ${leccionColor}` }}>
               {leccionIcono.startsWith('/') || leccionIcono.startsWith('http') ? (
                 <img src={getImageUrl(leccionIcono)} alt="Icono" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} crossOrigin="anonymous" onError={(e) => e.currentTarget.style.display = 'none'} />
               ) : (
                 <img src={`https://api.iconify.design/${leccionIcono.replace(':', '/')}.svg?color=${encodeURIComponent(leccionColor)}`} alt="Icono" style={{ width: '18px', height: '18px' }} />
               )}
             </div>
          ) : (
             <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--color-neutral-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
               <ImageIcon size={16} color="#94a3b8" />
             </div>
          )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span title={`Color: ${leccionColor}`} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: leccionColor, border: '1px solid rgba(0,0,0,0.12)', flexShrink: 0 }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              {leccion.titulo}
            </span>
          </div>
          {leccion.descripcion && (
            <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {leccion.descripcion}
            </span>
          )}
        </div>
        </div>
      </td>
      
      {/* Contexto: Sesión -> Unidad -> Curso */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
            Sesión {(sesion?.orden ?? sesion?.orden_clasificacion) || '?'}: {sesion?.titulo || 'Sesión desconocida'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
            Unidad {(unidad?.orden ?? unidad?.orden_clasificacion) || '?'}: {unidad?.nombre || unidad?.titulo || '?'}
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

      {/* Recompensa XP */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Award size={16} color="var(--color-golden-yellow)" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface)' }}>{leccionXp} XP</span>
        </div>
      </td>

      {/* Estado */}
      <td style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onToggleEstado(leccion)}
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
          <button onClick={() => onView(leccion, sesion, unidad, curso)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '0' }} title="Ver Detalles">
            <Eye size={16} strokeWidth={2.5} />
          </button>
          <button onClick={() => onEdit(leccion, sesion?.unidad_id, unidad?.curso_id || unidad?.cursos_id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '0' }} title="Editar">
            <Edit2 size={16} strokeWidth={2.5} />
          </button>
          <button onClick={() => onDelete(leccion)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '0' }} title="Eliminar">
            <Trash2 size={16} strokeWidth={2.5} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const Lecciones = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.usuarios_id || user?.usuario_id;

  // Estado para la subida de imágenes
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      e.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande. El límite es 20 MB.');
      e.target.value = '';
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setValue('identificador_icono', res.data.url, { shouldValidate: true });
        toast.success('Imagen subida correctamente');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const [lecciones, setLecciones] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [unidads, setUnidads] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [idiomas, setIdiomas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [audioFile, setAudioFile] = useState(null);
  const [documentoFile, setDocumentoFile] = useState(null);

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
  const [selectedLeccionView, setSelectedLeccionView] = useState(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [rememberContext, setRememberContext] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [cursoFilter, setCursoFilter] = useState('all');
  const [unidadFilter, setUnidadFilter] = useState('all');
  const [sesionFilter, setSesionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'orden_clasificacion', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, cursoFilter, unidadFilter, sesionFilter, statusFilter, sortConfig]);

  const { register, handleSubmit, reset, watch, setValue, getValues, trigger, formState: { errors } } = useForm();
  
  const formCursoId = watch('form_curso_id');
  const formUnidadId = watch('form_unidad_id');
  const formSesionId = watch('sesiones_id');

  const getNextLeccionOrder = (sesionId) => {
    if (!sesionId) return 1;
    const relatedLecciones = lecciones.filter(leccion => String(leccion.sesion_id || leccion.sesiones_id) === String(sesionId));
    const maxOrder = relatedLecciones.reduce((max, leccion) => Math.max(max, Number(leccion.orden ?? leccion.orden_clasificacion) || 0), 0);
    return maxOrder + 1;
  };

  useEffect(() => {
    if (modalMode === 'create') {
      setValue('orden_clasificacion', getNextLeccionOrder(formSesionId), { shouldValidate: true });
    }
  }, [formSesionId, modalMode, lecciones, setValue]);

  const tiposLeccion = ['vocabulario', 'gramática', 'lectura', 'escucha', 'pronunciación', 'ejercicios'];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leccionesRes, sesionesRes, unidadsRes, cursosRes, idiomasRes, usuariosRes] = await Promise.all([
        getLecciones(),
        getSesiones(),
        getUnidads(),
        getCursos(),
        getIdiomas(),
        getUsuarios()
      ]);
      const leccionesList = Array.isArray(leccionesRes) ? leccionesRes : (leccionesRes.data || []);
      const sesionesList = Array.isArray(sesionesRes) ? sesionesRes : (sesionesRes.data || []);
      const unidadsList = Array.isArray(unidadsRes) ? unidadsRes : (unidadsRes.data || []);
      const cursosList = Array.isArray(cursosRes) ? cursosRes : (cursosRes.data || []);
      const idiomasList = Array.isArray(idiomasRes) ? idiomasRes : (idiomasRes.data || []);
      const usuariosList = Array.isArray(usuariosRes) ? usuariosRes : (usuariosRes.data || []);
      
      leccionesList.sort((a, b) => (a.orden ?? a.orden_clasificacion) - (b.orden ?? b.orden_clasificacion));
      
      setLecciones(leccionesList);
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

  const handleOpenCreate = () => {
    let savedContext = null;
    try {
      savedContext = JSON.parse(localStorage.getItem(LECCION_CONTEXT_DRAFT_KEY) || 'null');
    } catch {
      localStorage.removeItem(LECCION_CONTEXT_DRAFT_KEY);
    }
    setModalMode('create');
    setCurrentId(null);
    setAudioFile(null);
    setDocumentoFile(null);
    setIsPreviewMode(false);
    reset({ 
      form_curso_id: savedContext?.form_curso_id || '', 
      form_unidad_id: savedContext?.form_unidad_id || '', 
      sesiones_id: savedContext?.sesiones_id || '', 
      titulo: '', 
      descripcion: '',
      identificador_icono: '',
      color: '#B3262E',
      contenido_lectura: '',
      xp_recompensa_base: 100,
      orden_clasificacion: getNextLeccionOrder(savedContext?.sesiones_id || null), 
      activo: true 
    });
    setRememberContext(Boolean(savedContext?.form_curso_id && savedContext?.form_unidad_id && savedContext?.sesiones_id));
    setFormStep(savedContext?.form_curso_id && savedContext?.form_unidad_id && savedContext?.sesiones_id ? 2 : 1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (leccion, unidadId, cursoId) => {
    setModalMode('edit');
    setCurrentId(leccion.lecciones_id || leccion.id);
    setAudioFile(null);
    setDocumentoFile(null);
    setIsPreviewMode(false);
    setFormStep(1);
    setRememberContext(false);
    reset({
      form_curso_id: cursoId || '',
      form_unidad_id: unidadId || '',
      sesiones_id: leccion.sesion_id || leccion.sesiones_id,
      titulo: leccion.titulo,
      descripcion: leccion.descripcion || '',
      identificador_icono: leccion.url_icono || leccion.identificador_icono || '',
      contenido_lectura: leccion.contenido_lectura || '',
      url_lectura_audio: leccion.url_lectura_audio || '',
      url_documento_extra: leccion.url_documento_extra || '',
      xp_recompensa_base: leccion.xp_recompensa ?? leccion.xp_recompensa_base,
      orden_clasificacion: leccion.orden ?? leccion.orden_clasificacion,
      color: leccion.color || '#B3262E',
      activo: leccion.activo ?? leccion.estado === 'activo'
    });
    setIsModalOpen(true);
  };

  const saveContextDraft = () => {
    if (modalMode !== 'create') return;
    const { form_curso_id, form_unidad_id, sesiones_id } = getValues();
    if (!form_curso_id || !form_unidad_id || !sesiones_id) return;
    localStorage.setItem(LECCION_CONTEXT_DRAFT_KEY, JSON.stringify({
      form_curso_id,
      form_unidad_id,
      sesiones_id
    }));
  };

  const closeLessonModal = () => {
    setIsModalOpen(false);
  };

  const handleRememberContextToggle = async () => {
    if (rememberContext) {
      localStorage.removeItem(LECCION_CONTEXT_DRAFT_KEY);
      setRememberContext(false);
      toast.success('La ubicación ya no se reutilizará automáticamente.');
      return;
    }
    const isValid = await trigger(['form_curso_id', 'form_unidad_id', 'sesiones_id']);
    if (!isValid) return;
    saveContextDraft();
    setRememberContext(true);
    toast.success('Curso, unidad y sesión guardados para reutilizarlos en nuevas lecciones.');
  };

  const handleNextFormStep = async () => {
    if (formStep === 1) {
      const isValid = await trigger(['form_curso_id', 'form_unidad_id', 'sesiones_id']);
      if (!isValid) return;
      if (modalMode === 'create') setValue('orden_clasificacion', getNextLeccionOrder(formSesionId), { shouldValidate: true });
      setFormStep(2);
      return;
    }

    const isValid = await trigger([
      'titulo',
      'descripcion',
      'xp_recompensa_base',
      'orden_clasificacion',
      'identificador_icono'
    ]);
    if (isValid) setFormStep(3);
  };

  const handleView = async (leccion, sesion, unidad, curso) => {
    try {
      const response = await getLeccionById(leccion.leccion_id || leccion.lecciones_id || leccion.id);
      let leccionData = response.data || response;
      if (!leccionData.creado_por && leccionData.creado_por_id) {
        leccionData.creado_por = usuarios.find(u => String(u.usuario_id || u.id || u.usuarios_id) === String(leccionData.creado_por_id));
      }
      if (!leccionData.actualizado_por && leccionData.actualizado_por_id) {
        leccionData.actualizado_por = usuarios.find(u => String(u.usuario_id || u.id || u.usuarios_id) === String(leccionData.actualizado_por_id));
      }
      setSelectedLeccionView({ ...leccionData, sesion_asociada: sesion, unidad_asociada: unidad, curso_asociado: curso });
    } catch (error) {
      toast.error('Error al obtener los detalles de la lección');
      setSelectedLeccionView({ ...leccion, sesion_asociada: sesion, unidad_asociada: unidad, curso_asociado: curso });
    }
  };

  const handleDelete = (leccion) => {
    setItemToDelete(leccion);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete.leccion_id || itemToDelete.lecciones_id || itemToDelete.id;
    const toastId = toast.loading('Eliminando lección...');
    try {
      await deleteLeccion(id);
      toast.success('Lección eliminada exitosamente', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar la lección', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleToggleEstado = async (leccion) => {
    const id = leccion.leccion_id || leccion.lecciones_id || leccion.id;
    const toastId = toast.loading(`${leccion.estado === 'activo' ? 'Desactivando' : 'Activando'} lección...`);
    try {
      await toggleEstadoLeccion(id, {
        estado: leccion.estado === 'activo' ? 'inactivo' : 'activo',
        actualizado_por_id: currentUserId
      });
      toast.success(`Lección ${leccion.estado === 'activo' ? 'desactivado' : 'activado'} exitosamente`, { id: toastId });
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

    // Validación frontend para evitar orden_clasificacion duplicado en la misma sesión
    const isDuplicateOrder = lecciones.some(
      l => String(l.sesion_id || l.sesiones_id) === String(data.sesiones_id) &&
           String(l.orden ?? l.orden_clasificacion) === String(data.orden_clasificacion) &&
           String(l.leccion_id || l.lecciones_id || l.id) !== String(currentId)
    );

    if (isDuplicateOrder) {
      toast.error(`Ya existe una lección con el orden de clasificación ${data.orden_clasificacion} en esta sesión.`);
      setConfirmData(null);
      return;
    }

    const actionName = modalMode === 'create' ? 'Creando' : 'Actualizando';
    const toastId = toast.loading(`${actionName} lección...`);
    try {
      const payload = {
        sesion_id: parseInt(data.sesiones_id),
        titulo: data.titulo,
        descripcion: data.descripcion,
        contenido_lectura: data.contenido_lectura || null,
        orden: parseInt(data.orden_clasificacion),
        color: data.color || null,
        url_icono: data.url_icono || data.identificador_icono || null,
        xp_recompensa: parseInt(data.xp_recompensa_base || 10),
        estado: (data.activo !== undefined ? data.activo : true) ? 'activo' : 'inactivo'
      };

      let leccionIdCreatedOrUpdated = currentId;

      if (modalMode === 'create') {
        payload.creado_por_id = currentUserId;
        const result = await createLeccion(payload);
        leccionIdCreatedOrUpdated = result.data?.lecciones_id || result.data?.id || result.lecciones_id || result.id;
        toast.success('Lección creada exitosamente', { id: toastId });
      } else {
        payload.actualizado_por_id = currentUserId;
        await updateLeccion(currentId, payload);
        toast.success('Lección actualizada exitosamente', { id: toastId });
      }

      if (audioFile && leccionIdCreatedOrUpdated) {
        toast.loading('Subiendo audio...', { id: toastId });
        await uploadAudioLeccion(leccionIdCreatedOrUpdated, audioFile);
        toast.success('Audio subido exitosamente', { id: toastId });
      }

      if (documentoFile && leccionIdCreatedOrUpdated) {
        toast.loading('Subiendo documento...', { id: toastId });
        await uploadDocumentoLeccion(leccionIdCreatedOrUpdated, documentoFile);
        toast.success('Documento subido exitosamente', { id: toastId });
      }

      setIsModalOpen(false);
      setConfirmData(null);
      setAudioFile(null);
      setDocumentoFile(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} la lección`, { id: toastId });
    }
  };

  // Filtrados en cascada para el formulario
  const unidadsParaFormulario = formCursoId 
    ? unidads.filter(e => String(e.curso_id || e.cursos_id) === String(formCursoId)) 
    : [];
    
  const sesionesParaFormulario = formUnidadId 
    ? sesiones.filter(s => String(s.unidad_id) === String(formUnidadId)) 
    : [];

  const filteredUnidadOptions = unidads
    .filter(e => cursoFilter === 'all' || String(e.curso_id || e.cursos_id) === cursoFilter)
    .sort((a, b) => Number((a.orden ?? a.orden_clasificacion) || 0) - Number((b.orden ?? b.orden_clasificacion) || 0));

  const filteredSesionOptions = sesiones
    .filter(s => {
      const unidad = unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(s.unidad_id));
      const matchesUnidad = unidadFilter === 'all' || String(s.unidad_id) === unidadFilter;
      const matchesCurso = cursoFilter === 'all' || String(unidad?.curso_id || unidad?.cursos_id) === cursoFilter;
      return matchesUnidad && matchesCurso;
    })
    .sort((a, b) => Number((a.orden ?? a.orden_clasificacion) || 0) - Number((b.orden ?? b.orden_clasificacion) || 0));

  // Filtrado de la tabla
  const filteredLecciones = lecciones.filter(leccion => {
    const sesion = sesiones.find(s => String(s.sesion_id || s.sesiones_id || s.id) === String(leccion.sesion_id || leccion.sesiones_id));
    const unidad = unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(sesion?.unidad_id));
    const curso = cursos.find(c => String(c.curso_id || c.cursos_id || c.id) === String(unidad?.curso_id || unidad?.cursos_id));
    
    const unidadIdStr = sesion ? String(sesion.unidad_id) : '';
    const cursoIdStr = unidad ? String(unidad.curso_id || unidad.cursos_id) : '';
    
    const searchMatched = matchesSearch(leccion.titulo, searchTerm) ||
      matchesSearch(leccion.descripcion, searchTerm) ||
      matchesSearch(sesion?.titulo, searchTerm) ||
      matchesSearch(unidad?.nombre || unidad?.titulo, searchTerm) ||
      matchesSearch(getCursoName(cursoIdStr), searchTerm) ||
      matchesSearch(curso?.nivel || 'A1', searchTerm);
    const matchesCurso = cursoFilter === 'all' || cursoIdStr === cursoFilter;
    const matchesUnidad = unidadFilter === 'all' || unidadIdStr === unidadFilter;
    const matchesSesion = sesionFilter === 'all' || String(leccion.sesion_id || leccion.sesiones_id) === sesionFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && leccion.estado === 'activo') || (statusFilter === 'inactive' && leccion.estado !== 'activo');
    
    return searchMatched && matchesCurso && matchesUnidad && matchesSesion && matchesStatus;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const finalLecciones = [...filteredLecciones].sort((a, b) => {
    if (sortConfig.key === 'ubicacion') {
      const sesionA = sesiones.find(s => String(s.sesion_id || s.sesiones_id || s.id) === String(a.sesion_id || a.sesiones_id))?.titulo || '';
      const sesionB = sesiones.find(s => String(s.sesion_id || s.sesiones_id || s.id) === String(b.sesion_id || b.sesiones_id))?.titulo || '';
      if (sesionA < sesionB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (sesionA > sesionB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    }
    
    if (sortConfig.key === 'orden_clasificacion') {
      const sesionA = sesiones.find(s => String(s.sesion_id || s.sesiones_id || s.id) === String(a.sesion_id || a.sesiones_id));
      const sesionB = sesiones.find(s => String(s.sesion_id || s.sesiones_id || s.id) === String(b.sesion_id || b.sesiones_id));
      const unidadA = unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(sesionA?.unidad_id));
      const unidadB = unidads.find(e => String(e.unidad_id || e.unidads_id || e.id) === String(sesionB?.unidad_id));
      
      const ordenUnidadA = Number((unidadA?.orden ?? unidadA?.orden_clasificacion) || 0);
      const ordenUnidadB = Number((unidadB?.orden ?? unidadB?.orden_clasificacion) || 0);
      
      if (ordenUnidadA !== ordenUnidadB) {
        return sortConfig.direction === 'asc' ? ordenUnidadA - ordenUnidadB : ordenUnidadB - ordenUnidadA;
      }

      const ordenSesionA = Number((sesionA?.orden ?? sesionA?.orden_clasificacion) || 0);
      const ordenSesionB = Number((sesionB?.orden ?? sesionB?.orden_clasificacion) || 0);

      if (ordenSesionA !== ordenSesionB) {
        return sortConfig.direction === 'asc' ? ordenSesionA - ordenSesionB : ordenSesionB - ordenSesionA;
      }
      
      const ordenLeccionA = Number((a.orden ?? a.orden_clasificacion) || 0);
      const ordenLeccionB = Number((b.orden ?? b.orden_clasificacion) || 0);
      
      return sortConfig.direction === 'asc' ? ordenLeccionA - ordenLeccionB : ordenLeccionB - ordenLeccionA;
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

  const totalPages = Math.ceil(finalLecciones.length / itemsPerPage) || 1;
  const paginatedLecciones = finalLecciones.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="academic-modal-scroll" style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>

      <div className="flex-col-mobile" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div className="rq-page-heading">
            <div className="rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">Gestión de Lecciones</h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Administra las lecciones específicas dentro de cada sesión.
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
          Crear Lección
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
                placeholder="Lección, sesión, unidad..."
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
              onValueChange={(val) => { setCursoFilter(val); setUnidadFilter('all'); setSesionFilter('all'); }}
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
              onValueChange={(val) => { setUnidadFilter(val); setSesionFilter('all'); }}
              disabled={cursoFilter === 'all'}
              placeholder="Todas las unidades"
              options={[
                { value: 'all', label: 'Todas las unidades' },
                ...filteredUnidadOptions.map(e => ({
                  value: String(e.unidad_id || e.unidads_id || e.id),
                  label: `Unidad ${(e.orden ?? e.orden_clasificacion) || '?'} · ${e.nombre || e.titulo}`
                }))
              ]}
              style={{ minWidth: '200px' }}
            />
          </div>

          {/* Sesión */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>3. Sesión</label>
            <RimaqSelect
              value={sesionFilter}
              onValueChange={setSesionFilter}
              disabled={unidadFilter === 'all'}
              placeholder="Todas las sesiones"
              options={[
                { value: 'all', label: 'Todas las sesiones' },
                ...filteredSesionOptions.map(e => ({
                  value: String(e.sesion_id || e.sesiones_id || e.id),
                  label: `Sesión ${(e.orden ?? e.orden_clasificacion) || '?'} · ${e.nombre || e.titulo}`
                }))
              ]}
              style={{ minWidth: '200px' }}
            />
          </div>

          {/* Estado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Estado de lección</label>
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

      {/* Tabla de Lecciones */}
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
                <th 
                  style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, width: '80px', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('orden_clasificacion')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Orden
                    {sortConfig.key === 'orden_clasificacion' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} opacity={0.3} />}
                  </div>
                </th>
                <th 
                  style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('titulo')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Lección
                    {sortConfig.key === 'titulo' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} opacity={0.3} />}
                  </div>
                </th>
                <th 
                  style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('ubicacion')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Ubicación
                    {sortConfig.key === 'ubicacion' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronsUpDown size={14} opacity={0.3} />}
                  </div>
                </th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Recompensa</th>
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
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: '8px' }}></div></td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '60px', height: '32px', borderRadius: '8px' }}></div></td>
                    <td style={{ padding: '16px' }}><div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '8px', marginLeft: 'auto' }}></div></td>
                  </tr>
                ))
              ) : filteredLecciones.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--color-outline)' }}>
                    <PlayCircle size={48} strokeWidth={1.5} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>
                      {searchTerm || cursoFilter !== 'all' || unidadFilter !== 'all' || sesionFilter !== 'all' || statusFilter !== 'all' ? 'No se encontraron lecciones con esos filtros' : 'Aún no hay lecciones registradas'}
                    </p>
                    <p style={{ fontSize: '13px', margin: 0 }}>
                      {searchTerm || cursoFilter !== 'all' || unidadFilter !== 'all' || sesionFilter !== 'all' || statusFilter !== 'all' ? 'Intenta con otra búsqueda' : 'Crea la primera lección haciendo clic en "Crear Lección"'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLecciones.map((leccion, i) => (
                  <LeccionTableRow
                    key={leccion.leccion_id || leccion.lecciones_id || leccion.id || i}
                    index={i}
                    leccion={leccion}
                    cursos={cursos}
                    unidads={unidads}
                    sesiones={sesiones}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="modal-content-responsive lesson-form-modal" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '540px', maxHeight: '90vh' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)' }}>
              <div>
                <h2 style={{ margin: '0', fontSize: '24px', fontWeight: 800, color: 'var(--color-on-surface)', letterSpacing: '-0.01em' }}>{modalMode === 'create' ? 'Crear Nueva Lección' : 'Editar Lección'}</h2>
              </div>
              <button onClick={closeLessonModal} style={{ background: 'var(--color-surface-container-low)', border: 'none', color: 'var(--color-outline)', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>

            <form onSubmit={(event) => { event.preventDefault(); if (formStep < 3) handleNextFormStep(); }} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="lesson-form-scroll" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <WizardProgress
                  currentStep={formStep}
                  steps={[
                    { label: 'Ubicación', description: 'Selecciona el curso, la unidad y la sesión.' },
                    { label: 'Datos generales', description: 'Configura el título, recompensas y apariencia.' },
                    { label: 'Contenido', description: 'Agrega la lectura, el audio y los documentos.' }
                  ]}
                />
                
                {formStep === 1 && <>
                <div className="flex-col-mobile" style={{ gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Curso Asociado</label>
                    <input type="hidden" {...register('form_curso_id', { required: 'El curso es requerido' })} />
                    <RimaqSelect
                      value={String(formCursoId || '')}
                      onValueChange={(val) => {
                        setValue('form_curso_id', val, { shouldValidate: true });
                        setValue('form_unidad_id', '', { shouldValidate: true });
                        setValue('sesiones_id', '', { shouldValidate: true });
                      }}
                      placeholder="Seleccione un curso"
                      options={cursos.map(c => ({
                        value: String(c.curso_id || c.cursos_id || c.id),
                        label: getCursoName(c.curso_id || c.cursos_id || c.id)
                      }))}
                      className="rimaq-select--full-width"
                    />
                    {errors.form_curso_id && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.form_curso_id.message}</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Unidad Asociada</label>
                    <input type="hidden" {...register('form_unidad_id', { required: 'La unidad es requerida' })} />
                    <RimaqSelect
                      value={String(formUnidadId || '')}
                      onValueChange={(val) => {
                        setValue('form_unidad_id', val, { shouldValidate: true });
                        setValue('sesiones_id', '', { shouldValidate: true });
                      }}
                      placeholder="Seleccione una unidad"
                      options={unidadsParaFormulario.map(e => ({
                        value: String(e.unidad_id || e.unidads_id || e.id),
                        label: e.nombre || e.titulo
                      }))}
                      disabled={!formCursoId}
                      className="rimaq-select--full-width"
                    />
                    {errors.form_unidad_id && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.form_unidad_id.message}</span>}
                  </div>
                </div>

                <div className="flex-col-mobile" style={{ gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Sesión Asociada</label>
                    <input type="hidden" {...register('sesiones_id', { required: 'La sesión es requerida' })} />
                    <RimaqSelect
                      value={String(formSesionId || '')}
                      onValueChange={(val) => setValue('sesiones_id', val, { shouldValidate: true })}
                      placeholder="Seleccione una sesión"
                      options={sesionesParaFormulario.map(s => ({
                        value: String(s.sesion_id || s.sesiones_id || s.id),
                        label: s.titulo
                      }))}
                      disabled={!formUnidadId}
                      className="rimaq-select--full-width"
                    />
                    {errors.sesiones_id && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.sesiones_id.message}</span>}
                  </div>


                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '12px 14px', borderRadius: '10px', background: 'var(--color-surface-container-low)' }}>
                  <div><strong style={{ display: 'block', color: 'var(--color-on-surface)', fontSize: '13px' }}>Guardar para reutilizar</strong><span style={{ display: 'block', marginTop: '3px', color: 'var(--color-on-surface-variant)', fontSize: '11px' }}>Recordar este curso, unidad y sesión en las próximas lecciones.</span></div>
                  <button type="button" role="switch" aria-checked={rememberContext} onClick={handleRememberContextToggle} style={{ position: 'relative', flex: '0 0 auto', width: '44px', height: '24px', minHeight: '24px', padding: 0, border: 'none', borderRadius: '99px', cursor: 'pointer', backgroundColor: rememberContext ? 'var(--color-primary)' : 'var(--color-surface-variant)', transition: 'background-color .2s' }}><span style={{ position: 'absolute', top: '3px', left: rememberContext ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s' }} /></button>
                </div>
                </>}

                {formStep === 2 && <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Título de la Lección</label>
                  <input type="text" {...register('titulo', { required: 'El título es requerido' })} placeholder="Vocabulario de la familia" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', outline: 'none', fontSize: '14px' }} />
                  {errors.titulo && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.titulo.message}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Descripción</label>
                  <textarea {...register('descripcion', { required: 'La descripción es requerida' })} placeholder="Breve descripción de la lección..." rows={2} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', outline: 'none', fontSize: '14px', resize: 'none' }} />
                  {errors.descripcion && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.descripcion.message}</span>}
                </div>

                <div className="flex-col-mobile" style={{ gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Puntos XP</label>
                    <input type="number" min="0" step="5" {...register('xp_recompensa_base', { required: 'Requerido' })} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', outline: 'none', fontSize: '14px' }} />
                    {errors.xp_recompensa_base && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.xp_recompensa_base.message}</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Orden</label>
                    <input type="number" min="1" {...register('orden_clasificacion', { required: 'Requerido', min: { value: 1, message: 'Debe ser mayor a 0' } })} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--color-outline-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-primary)', outline: 'none', fontSize: '16px', fontWeight: 800, textAlign: 'center', transition: 'all 0.2s' }} placeholder="1" onFocus={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'var(--color-outline-variant)'} />
                    {errors.orden_clasificacion && <span style={{ color: 'var(--color-error)', fontSize: '12px', fontWeight: 500 }}>{errors.orden_clasificacion.message}</span>}
                  </div>

                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Color</label>
                    <label style={{ position: 'relative', height: '52px', borderRadius: '12px', backgroundColor: watch('color') || '#B3262E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, cursor: 'pointer', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.08)' }}>
                      {(watch('color') || '#B3262E').toUpperCase()}
                      <input type="color" {...register('color')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                    </label>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Imagen de lección</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <label style={{ minWidth: 0, flex: 1, height: '52px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '2px dashed var(--color-outline-variant)', borderRadius: '12px', cursor: uploadingImage ? 'wait' : 'pointer', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface-variant)', fontWeight: 700, fontSize: '14px' }}>
                        <Plus size={18} /> {uploadingImage ? 'Subiendo...' : 'Subir Imagen'}
                        <input type="file" accept="image/*" disabled={uploadingImage} style={{ display: 'none' }} onChange={handleImageUpload} />
                      </label>
                      {watch('identificador_icono')?.startsWith('/') && (
                        <img src={getImageUrl(watch('identificador_icono'))} style={{ width: '52px', height: '52px', flexShrink: 0, objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--color-outline-variant)' }} alt="Vista previa de la lección" />
                      )}
                    </div>
                    <input type="hidden" {...register('identificador_icono', { required: 'Sube una imagen para la lección' })} />
                    {errors.identificador_icono && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.identificador_icono.message}</span>}
                  </div>
                </div>
                </>}

                {formStep === 3 && <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Contenido de Lectura (Markdown)</label>
                    <button
                      type="button"
                      onClick={() => setIsPreviewMode(!isPreviewMode)}
                      style={{ 
                        background: 'transparent', border: '1px solid var(--color-outline-variant)', borderRadius: '6px',
                        padding: '4px 8px', fontSize: '12px', cursor: 'pointer', color: 'var(--color-on-surface)',
                        fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {isPreviewMode ? <Edit2 size={12} /> : <Eye size={12} />}
                      {isPreviewMode ? 'Editar' : 'Previsualizar'}
                    </button>
                  </div>
                  {isPreviewMode ? (
                    <div style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', fontSize: '14px', minHeight: '135px', maxHeight: '300px', overflowY: 'auto' }}>
                      <ReactMarkdown>{watch('contenido_lectura') || '*Sin contenido*'}</ReactMarkdown>
                    </div>
                  ) : (
                    <textarea {...register('contenido_lectura')} placeholder="Escribe el contenido en formato Markdown..." rows={6} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', outline: 'none', fontSize: '14px', resize: 'vertical' }} />
                  )}
                </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Audio de Lectura (.mp3, .wav)</label>
                      <input 
                        type="file" 
                        accept=".mp3, .wav"
                        id="audio-upload"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('El audio es demasiado grande. El límite es 10MB.');
                              e.target.value = '';
                              return;
                            }
                            setAudioFile(file);
                          } else {
                            setAudioFile(null);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <label 
                        htmlFor="audio-upload"
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', 
                          padding: '10px 16px', borderRadius: '8px', 
                          border: '1px dashed var(--color-outline-variant)', 
                          backgroundColor: 'var(--color-surface-container-low)', 
                          cursor: 'pointer', transition: 'all 0.2s',
                          width: '100%', boxSizing: 'border-box'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)', flexShrink: 0 }}>
                          <PlayCircle size={16} />
                        </div>
                        <span style={{ fontSize: '13px', color: audioFile ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)', fontWeight: audioFile ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {audioFile ? audioFile.name : 'Subir audio...'}
                        </span>
                      </label>
                      {audioFile && (
                        <div style={{ marginTop: '8px' }}>
                          <audio controls src={URL.createObjectURL(audioFile)} style={{ width: '100%', height: '36px', outline: 'none' }} />
                        </div>
                      )}
                      {modalMode === 'edit' && watch('url_lectura_audio') && !audioFile && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface-variant)', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>Audio actual configurado</span>
                          <audio controls src={getImageUrl(watch('url_lectura_audio'))} style={{ height: '36px', width: '200px', outline: 'none' }} />
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Documento Extra (.pdf, .doc)</label>
                      <input 
                        type="file" 
                        accept=".pdf, .doc, .docx, .md"
                        id="document-upload"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 20 * 1024 * 1024) {
                              toast.error('El documento es demasiado grande. El límite es 20MB.');
                              e.target.value = '';
                              return;
                            }
                            setDocumentoFile(file);
                          } else {
                            setDocumentoFile(null);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <label 
                        htmlFor="document-upload"
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', 
                          padding: '10px 16px', borderRadius: '8px', 
                          border: '1px dashed var(--color-outline-variant)', 
                          backgroundColor: 'var(--color-surface-container-low)', 
                          cursor: 'pointer', transition: 'all 0.2s',
                          width: '100%', boxSizing: 'border-box'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)', flexShrink: 0 }}>
                          <BookOpen size={16} />
                        </div>
                        <span style={{ fontSize: '13px', color: documentoFile ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)', fontWeight: documentoFile ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {documentoFile ? documentoFile.name : 'Subir documento...'}
                        </span>
                      </label>
                      {documentoFile && (
                        <div style={{ marginTop: '8px' }}>
                          {documentoFile.type === 'application/pdf' ? (
                            <iframe 
                              src={URL.createObjectURL(documentoFile)} 
                              style={{ width: '100%', height: '300px', border: '1px solid var(--color-surface-variant)', borderRadius: '8px' }} 
                              title="Previsualización del documento" 
                            />
                          ) : (
                            <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-variant)', borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                              La previsualización solo está disponible para archivos PDF.
                            </div>
                          )}
                        </div>
                      )}
                      {modalMode === 'edit' && watch('url_documento_extra') && !documentoFile && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--color-surface-variant)', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>Documento actual</span>
                          <a href={getImageUrl(watch('url_documento_extra'))} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                            Ver archivo
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                {modalMode === 'edit' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--color-surface-container-low)', borderRadius: '8px', marginTop: '8px' }}>
                    <input type="checkbox" {...register('activo')} id="activo" style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                    <label htmlFor="activo" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-on-surface)', cursor: 'pointer' }}>Lección activa</label>
                  </div>
                )}
                </>}
              </div>

              <div id="rq-step-form-actions" className="rq-form-actions rq-step-form-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button type="button" onClick={closeLessonModal} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', fontWeight: 600, cursor: 'pointer', borderRadius: '8px' }}>Cancelar</button>
                <div className="rq-step-form-actions__primary">
                  {formStep > 1 && (
                    <button type="button" onClick={() => setFormStep((step) => step - 1)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', fontWeight: 600, cursor: 'pointer', borderRadius: '8px' }}>
                      Anterior
                    </button>
                  )}
                  {formStep < 3 ? (
                    <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleNextFormStep(); }} style={{ padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                      Continuar
                    </button>
                  ) : (
                    <button type="button" onClick={handleSubmit(handlePreSubmit)} style={{ padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                      {modalMode === 'create' ? 'Crear Lección' : 'Guardar cambios'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar lección?" itemName={itemToDelete?.titulo} description={itemToDelete ? <>Se eliminará <strong>“{itemToDelete.titulo}”</strong> junto con sus preguntas asociadas. Esta acción es irreversible.</> : null} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />

      {/* Modal Confirmación Guardar */}
      {confirmData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1060, backdropFilter: 'blur(4px)' }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', boxShadow: 'var(--shadow-level-3)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Save size={32} />
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--color-on-surface)' }}>{modalMode === 'create' ? '¿Crear lección?' : '¿Guardar cambios?'}</h2>
            <p style={{ margin: '0 0 24px 0', color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: '1.5' }}>
              {modalMode === 'create' ? `Crearás la lección "${confirmData.titulo}".` : `Se guardarán los cambios de "${confirmData.titulo}".`}
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
      {selectedLeccionView && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)', padding: '20px' }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', boxShadow: '0 24px 60px rgba(0,0,0,0.28)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '32px 28px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: selectedLeccionView.color || '#B3262E', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                <div style={{ width: '56px', height: '56px', flexShrink: 0, borderRadius: '16px', background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={28} /></div>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,.86)', textTransform: 'uppercase', letterSpacing: '1px' }}>Detalles de la Lección</span>
                  <h2 style={{ margin: '3px 0 0', fontSize: '23px', lineHeight: 1.2, color: 'white', fontWeight: 800 }}>{selectedLeccionView.titulo}</h2>
                </div>
              </div>
              <button onClick={() => setSelectedLeccionView(null)} style={{ background: 'rgba(0,0,0,.2)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>
            
            <div className="academic-modal-scroll" style={{ padding: '20px', margin: '-24px 28px 24px', borderRadius: '20px', backgroundColor: 'var(--color-surface)', boxShadow: '0 8px 30px rgba(0,0,0,.08)', border: '1px solid var(--color-surface-variant)', overflowY: 'auto', flex: 1, position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Título Principal */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '10px', backgroundColor: 'var(--color-info-container)', borderRadius: '12px', color: 'var(--color-on-info-container)' }}>
                    <PlayCircle size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-outline)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descripción</span>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: '1.5' }}>
                      {selectedLeccionView.descripcion}
                    </p>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-surface-variant)', margin: '0' }} />

                {/* Grid de Detalles 2 Columnas */}
                <div className="responsive-grid lesson-detail-grid" style={{ gap: '20px' }}>
                  
                  {/* XP */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#d97706' }}>
                      <Award size={18} />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>XP RECOMPENSA</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)' }}>{selectedLeccionView.xp_recompensa ?? selectedLeccionView.xp_recompensa_base ?? 10} XP</span>
                    </div>
                  </div>

                  {/* Sesión Asignada */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', gridColumn: '1 / -1' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-neutral-container)', borderRadius: '8px', color: 'var(--color-on-surface-variant)' }}>
                      <Layers size={18} />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>SESIÓN ASOCIADA</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                        Sesión {(selectedLeccionView.sesion_asociada?.orden ?? selectedLeccionView.sesion_asociada?.orden_clasificacion) || '?'}: {selectedLeccionView.sesion_asociada?.titulo || 'Desconocida'}
                      </span>
                      <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>
                          <strong>Unidad {(selectedLeccionView.unidad_asociada?.orden ?? selectedLeccionView.unidad_asociada?.orden_clasificacion) || '?'}:</strong> {selectedLeccionView.unidad_asociada?.nombre || selectedLeccionView.unidad_asociada?.titulo || 'Desconocida'}
                        </span>
                        <span>
                          <strong>Curso:</strong> {selectedLeccionView.curso_asociado?.idioma_origen?.nombre || '?'} → {selectedLeccionView.curso_asociado?.idioma_destino?.nombre || '?'} ({selectedLeccionView.curso_asociado?.nivel || 'A1'})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Imagen */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', flexShrink: 0, backgroundColor: 'var(--color-neutral-container)', borderRadius: '12px', color: 'var(--color-on-surface-variant)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(selectedLeccionView.url_icono || selectedLeccionView.identificador_icono)?.startsWith('/') || (selectedLeccionView.url_icono || selectedLeccionView.identificador_icono)?.startsWith('http') ? (
                        <img src={getImageUrl(selectedLeccionView.url_icono || selectedLeccionView.identificador_icono)} alt="Imagen de la lección" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                      ) : (
                        <ImageIcon size={22} />
                      )}
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>IMAGEN</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                        {(selectedLeccionView.url_icono || selectedLeccionView.identificador_icono)?.startsWith('/') || (selectedLeccionView.url_icono || selectedLeccionView.identificador_icono)?.startsWith('http') ? 'Personalizada' : 'Por defecto'}
                      </span>
                    </div>
                  </div>

                  {/* Orden */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-neutral-container)', borderRadius: '8px', color: 'var(--color-on-surface-variant)' }}>
                      <ListTree size={18} />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>ORDEN (#)</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-error)' }}>#{selectedLeccionView.orden ?? selectedLeccionView.orden_clasificacion}</span>
                    </div>
                  </div>

                  {/* Estado */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: selectedLeccionView.estado === 'activo' ? 'var(--color-success-container)' : 'var(--color-neutral-container)', borderRadius: '8px', color: selectedLeccionView.estado === 'activo' ? 'var(--color-on-success-container)' : 'var(--color-on-neutral-container)' }}>
                      {selectedLeccionView.estado === 'activo' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>ESTADO</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: selectedLeccionView.estado === 'activo' ? 'var(--color-on-success-container)' : 'var(--color-on-neutral-container)' }}>
                        {selectedLeccionView.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Preguntas */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-neutral-container)', borderRadius: '8px', color: 'var(--color-on-surface-variant)' }}>
                      <AlignLeft size={18} />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>PREGUNTAS CREADAS</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                        {selectedLeccionView.preguntas ? selectedLeccionView.preguntas.length : 0} preguntas
                      </span>
                    </div>
                  </div>

                  {/* Audio */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', gridColumn: '1 / -1' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-neutral-container)', borderRadius: '8px', color: 'var(--color-on-surface-variant)' }}>
                      <PlayCircle size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>AUDIO DE LECTURA</span>
                      <div style={{ marginTop: '4px' }}>
                        {selectedLeccionView.url_lectura_audio ? (
                          <audio controls src={getImageUrl(selectedLeccionView.url_lectura_audio)} style={{ height: '36px', width: '100%', maxWidth: '300px', outline: 'none' }} />
                        ) : (
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Sin audio</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Documento Extra */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-neutral-container)', borderRadius: '8px', color: 'var(--color-on-surface-variant)' }}>
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>DOCUMENTO EXTRA</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: selectedLeccionView.url_documento_extra ? 'var(--color-primary)' : 'var(--color-on-surface-variant)' }}>
                        {selectedLeccionView.url_documento_extra ? (
                          <a href={getImageUrl(selectedLeccionView.url_documento_extra)} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Ver Documento</a>
                        ) : 'Sin documento'}
                      </span>
                    </div>
                  </div>

                  {/* Contenido de Lectura */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', gridColumn: '1 / -1', marginTop: '8px' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-neutral-container)', borderRadius: '8px', color: 'var(--color-on-surface-variant)' }}>
                      <AlignLeft size={18} />
                    </div>
                    <div style={{ width: '100%' }}>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)', marginBottom: '8px' }}>CONTENIDO DE LECTURA (MARKDOWN)</span>
                      <div className="markdown-preview" style={{ backgroundColor: 'var(--color-surface-container-low)', padding: '12px', borderRadius: '8px', fontSize: '13px', color: 'var(--color-on-surface)', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--color-surface-variant)' }}>
                        {selectedLeccionView.contenido_lectura ? (
                          <ReactMarkdown>{selectedLeccionView.contenido_lectura}</ReactMarkdown>
                        ) : (
                          <span style={{ color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>Sin contenido de lectura.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--color-surface-container-low)', padding: '20px', borderRadius: '20px', border: '1px solid var(--color-surface-variant)' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-on-surface-variant)', letterSpacing: '0.5px', display: 'block', marginBottom: '16px' }}>INFORMACIÓN DE REGISTRO</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {selectedLeccionView.creado_por?.url_foto_perfil ? (
                        <img src={getImageUrl(selectedLeccionView.creado_por.url_foto_perfil)} alt="Creador" style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '10px', objectFit: 'cover' }} crossOrigin="anonymous" />
                      ) : (
                        <div style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '10px', backgroundColor: 'var(--color-info-container)', color: 'var(--color-on-info-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>{formatUserName(selectedLeccionView.creado_por).charAt(0)}</div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>CREADO POR</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatUserName(selectedLeccionView.creado_por)}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>{(selectedLeccionView.fecha_creacion || selectedLeccionView.creado_en) ? new Date(selectedLeccionView.fecha_creacion || selectedLeccionView.creado_en).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha desconocida'}</span>
                      </div>
                    </div>

                    {selectedLeccionView.actualizado_por_id && selectedLeccionView.actualizado_por_id !== 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        {selectedLeccionView.actualizado_por?.url_foto_perfil ? (
                          <img src={getImageUrl(selectedLeccionView.actualizado_por.url_foto_perfil)} alt="Modificador" style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '10px', objectFit: 'cover' }} crossOrigin="anonymous" />
                        ) : (
                          <div style={{ width: '32px', height: '32px', flexShrink: 0, borderRadius: '10px', backgroundColor: 'var(--color-surface-variant)', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>{formatUserName(selectedLeccionView.actualizado_por).charAt(0)}</div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--color-outline)', letterSpacing: '0.5px' }}>MODIFICADO POR</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatUserName(selectedLeccionView.actualizado_por)}</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>{(selectedLeccionView.fecha_actualizacion || selectedLeccionView.actualizado_en) ? new Date(selectedLeccionView.fecha_actualizacion || selectedLeccionView.actualizado_en).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Fecha desconocida'}</span>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--color-outline)', fontWeight: 500, fontStyle: 'italic' }}>Sin modificaciones recientes</span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--color-surface)', flexShrink: 0 }}>
              <button onClick={() => setSelectedLeccionView(null)} style={{ padding: '12px 28px', background: selectedLeccionView.color || 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,.16)', fontSize: '14px' }}>Entendido</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
