import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import {
  Search, Edit2, Trash2, X, Save, Layers, BookOpen, CheckCircle, XCircle, PlayCircle, Eye, ListTree,
  Award, AlignLeft, ImagePlus, ZoomIn, Image as ImageIcon,
} from 'lucide-react';
import { getLecciones, getLeccionById, createLeccion, updateLeccion, deleteLeccion, toggleEstadoLeccion, uploadAudioLeccion, uploadDocumentoLeccion } from '../../services/leccionService';
import { getSesiones } from '../../services/sesionService';
import { getUnidads } from '../../services/unidadService';
import { getCursos } from '../../services/cursoService';
import { getIdiomas } from '../../services/idiomaService';
import { getUsuarios } from '../../services/userService';
import api, { resolveMediaUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { matchesSearch } from '../../utils/searchUtils';
import { getColorByOrder } from '../../utils/colorPalette';
import { DeleteConfirmationModal, ConfirmDialog } from '../../components/DeleteConfirmationModal';
import { WizardProgress } from '../../components/WizardProgress';
import { RimaqSelect } from '../../components/RimaqSelect';
import { ImageLightboxModal } from '../../components/ImageLightboxModal';
import { ColorPickerField } from '../../components/ColorPickerField';
import { PageHeader, EmptyState, Pagination, DetailStat, StatusSwitch, AuditPanel, SortHeader } from '../../components/PageKit';

const ITEMS_PER_PAGE = 5;
const DEFAULT_COLOR = '#B3262E';
const MB = 1024 * 1024;
const CONTEXT_KEY = 'rimaqmasi:leccion-contexto-borrador';
const STEPS = [
  { label: 'Ubicación', description: 'Selecciona el curso, la unidad y la sesión.' },
  { label: 'Datos generales', description: 'Configura el título, recompensas y apariencia.' },
  { label: 'Contenido', description: 'Agrega la lectura, el audio y los documentos.' },
];
const STEP_FIELDS = {
  1: ['form_curso_id', 'form_unidad_id', 'sesiones_id'],
  2: ['titulo', 'descripcion', 'xp_recompensa_base', 'orden_clasificacion', 'identificador_icono'],
};

const list = (r) => (Array.isArray(r) ? r : r?.data || []);
const leccionId = (l) => l?.leccion_id || l?.lecciones_id || l?.id;
const leccionSesionId = (l) => l?.sesion_id || l?.sesiones_id;
const sesionId = (s) => String(s?.sesion_id || s?.sesiones_id || s?.id);
const unidadId = (u) => String(u?.unidad_id || u?.unidads_id || u?.id);
const cursoId = (c) => c?.curso_id || c?.cursos_id || c?.id;
const unidadCursoId = (u) => String(u?.curso_id || u?.cursos_id);
const ordenOf = (x) => Number((x?.orden ?? x?.orden_clasificacion) || 0);
const iconOf = (l) => l?.url_icono || l?.identificador_icono;
const isUploadedIcon = (icon) => Boolean(icon && (icon.startsWith('/') || icon.startsWith('http')));
const xpOf = (l) => l?.xp_recompensa ?? l?.xp_recompensa_base ?? 10;
const nivelLabel = (c) => {
  const nivel = c?.nivel || 'A1';
  return { A: `${nivel} - Básico`, B: `${nivel} - Intermedio`, C: `${nivel} - Avanzado` }[nivel[0]] || nivel;
};

/** URL temporal para previsualizar un archivo local; se libera al cambiarlo. */
const useObjectUrl = (file) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) { setUrl(null); return undefined; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
};

const LessonIcon = ({ icon, color }) => {
  if (!icon) return <span className="rq-tile rq-tile--sm" aria-hidden="true" style={{ width: 32, height: 32 }}><ImageIcon size={16} /></span>;
  return (
    <span className="rq-tile rq-tile--sm" aria-hidden="true" style={{ width: 32, height: 32, border: `2px solid ${color}` }}>
      {isUploadedIcon(icon)
        ? <img src={resolveMediaUrl(icon)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
        : <img src={`https://api.iconify.design/${icon.replace(':', '/')}.svg?color=${encodeURIComponent(color)}`} alt="" width={18} height={18} />}
    </span>
  );
};

const FilePicker = ({ id, icon: Icon, accept, file, placeholder, maxBytes, tooBig, onPick }) => (
  <>
    <input
      type="file"
      id={id}
      accept={accept}
      hidden
      onChange={(e) => {
        const next = e.target.files[0] || null;
        if (next && next.size > maxBytes) {
          toast.error(tooBig);
          e.target.value = '';
          return;
        }
        onPick(next);
      }}
    />
    <label htmlFor={id} className="rq-file-drop">
      <span className="rq-file-drop__icon"><Icon size={16} /></span>
      <span className={`rq-file-drop__name${file ? ' is-set' : ''}`}>{file ? file.name : placeholder}</span>
    </label>
  </>
);

export const Lecciones = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.usuarios_id || user?.usuario_id;

  const [lecciones, setLecciones] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [unidads, setUnidads] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [idiomas, setIdiomas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nueva, lección = edición
  const [formStep, setFormStep] = useState(1);
  const [rememberContext, setRememberContext] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [documentoFile, setDocumentoFile] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cursoFilter, setCursoFilter] = useState('all');
  const [unidadFilter, setUnidadFilter] = useState('all');
  const [sesionFilter, setSesionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'orden', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const audioUrl = useObjectUrl(audioFile);
  const documentoUrl = useObjectUrl(documentoFile);

  const { register, handleSubmit, reset, watch, setValue, getValues, trigger, formState: { errors } } = useForm();
  const formCursoId = watch('form_curso_id');
  const formUnidadId = watch('form_unidad_id');
  const formSesionId = watch('sesiones_id');
  const formIcon = watch('identificador_icono');
  const isCreate = editing && !leccionId(editing);

  const findSesion = (id) => sesiones.find((s) => sesionId(s) === String(id));
  const findUnidad = (id) => unidads.find((u) => unidadId(u) === String(id));
  const findCurso = (id) => cursos.find((c) => String(cursoId(c)) === String(id));
  const findIdioma = (id) => idiomas.find((i) => String(i.idioma_id || i.id) === String(id));
  const route = (curso) => {
    const origen = findIdioma(curso?.idioma_origen_id || curso?.idioma_origen?.idioma_id || curso?.idiomaOrigen?.idioma_id);
    const destino = findIdioma(curso?.idioma_destino_id || curso?.idioma_destino?.idioma_id || curso?.idiomaDestino?.idioma_id);
    return {
      origen: origen?.nombres || origen?.nombre || curso?.idioma_origen?.nombre || curso?.idiomaOrigen?.nombre || 'Origen',
      destino: destino?.nombres || destino?.nombre || curso?.idioma_destino?.nombre || curso?.idiomaDestino?.nombre || 'Destino',
      flagOrigen: resolveMediaUrl(origen?.url_icono_bandera),
      flagDestino: resolveMediaUrl(destino?.url_icono_bandera),
    };
  };
  const cursoName = (id) => {
    const c = findCurso(id);
    if (!c) return 'Desconocido';
    const r = route(c);
    return `${r.origen} → ${r.destino} (${c.nivel || 'A1'})`;
  };
  const contextOf = (leccion) => {
    const sesion = findSesion(leccionSesionId(leccion));
    const unidad = findUnidad(sesion?.unidad_id);
    return { sesion, unidad, curso: findCurso(unidad?.curso_id || unidad?.cursos_id) };
  };
  const nextOrder = (sid) => (sid ? lecciones.filter((l) => String(leccionSesionId(l)) === String(sid)).reduce((m, l) => Math.max(m, ordenOf(l)), 0) + 1 : 1);
  const parentColor = (sid) => findSesion(sid)?.color || DEFAULT_COLOR;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [l, s, u, c, i, us] = await Promise.all([getLecciones(), getSesiones(), getUnidads(), getCursos(), getIdiomas(), getUsuarios()]);
      setLecciones(list(l));
      setSesiones(list(s));
      setUnidads(list(u));
      setCursos(list(c));
      setIdiomas(list(i));
      setUsuarios(list(us));
    } catch {
      toast.error('No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, cursoFilter, unidadFilter, sesionFilter, statusFilter, sort]);

  // Al crear: orden y color siguen a la sesión elegida.
  useEffect(() => {
    if (!isCreate) return;
    const order = nextOrder(formSesionId);
    setValue('orden_clasificacion', order, { shouldValidate: true });
    setValue('color', getColorByOrder(parentColor(formSesionId), order), { shouldDirty: false });
  }, [formSesionId, isCreate, lecciones, sesiones]);

  const readSavedContext = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(CONTEXT_KEY) || 'null');
      return saved?.form_curso_id && saved?.form_unidad_id && saved?.sesiones_id ? saved : null;
    } catch {
      localStorage.removeItem(CONTEXT_KEY);
      return null;
    }
  };

  const openForm = (leccion = {}) => {
    const isNew = !leccionId(leccion);
    const saved = isNew ? readSavedContext() : null;
    const { sesion, unidad } = contextOf(leccion);
    const sid = isNew ? saved?.sesiones_id : leccionSesionId(leccion);
    const order = isNew ? nextOrder(sid) : (leccion.orden ?? leccion.orden_clasificacion);
    reset({
      form_curso_id: isNew ? saved?.form_curso_id || '' : (unidad ? unidadCursoId(unidad) : ''),
      form_unidad_id: isNew ? saved?.form_unidad_id || '' : (sesion ? String(sesion.unidad_id) : ''),
      sesiones_id: sid || '',
      titulo: leccion.titulo || '',
      descripcion: leccion.descripcion || '',
      identificador_icono: iconOf(leccion) || '',
      contenido_lectura: leccion.contenido_lectura || '',
      url_lectura_audio: leccion.url_lectura_audio || '',
      url_documento_extra: leccion.url_documento_extra || '',
      xp_recompensa_base: isNew ? 100 : xpOf(leccion),
      orden_clasificacion: order,
      color: isNew ? getColorByOrder(parentColor(sid), order) : (leccion.color || DEFAULT_COLOR),
      activo: isNew ? true : (leccion.activo ?? leccion.estado === 'activo'),
    });
    setAudioFile(null);
    setDocumentoFile(null);
    setIsPreviewMode(false);
    setRememberContext(Boolean(saved));
    setFormStep(saved ? 2 : 1);
    setEditing(leccion);
  };

  const saveContext = () => {
    const { form_curso_id, form_unidad_id, sesiones_id } = getValues();
    if (form_curso_id && form_unidad_id && sesiones_id) {
      localStorage.setItem(CONTEXT_KEY, JSON.stringify({ form_curso_id, form_unidad_id, sesiones_id }));
    }
  };

  const toggleRemember = async () => {
    if (rememberContext) {
      localStorage.removeItem(CONTEXT_KEY);
      setRememberContext(false);
      toast.success('La ubicación ya no se reutilizará automáticamente.');
      return;
    }
    if (!(await trigger(STEP_FIELDS[1]))) return;
    saveContext();
    setRememberContext(true);
    toast.success('Curso, unidad y sesión guardados para reutilizarlos en nuevas lecciones.');
  };

  const handleNextStep = async () => {
    if (!(await trigger(STEP_FIELDS[formStep]))) return;
    if (formStep === 1 && isCreate) setValue('orden_clasificacion', nextOrder(formSesionId), { shouldValidate: true });
    setFormStep((s) => s + 1);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 20 * MB) {
      toast.error(file.type.startsWith('image/') ? 'La imagen es demasiado grande. El límite es 20 MB.' : 'Selecciona un archivo de imagen válido');
      e.target.value = '';
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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

  const findUser = (id) => usuarios.find((u) => String(u.usuario_id || u.id || u.usuarios_id) === String(id));
  const handleView = async (leccion) => {
    let data = leccion;
    try {
      const response = await getLeccionById(leccionId(leccion));
      data = response.data || response;
      data.creado_por ??= data.creado_por_id ? findUser(data.creado_por_id) : undefined;
      data.actualizado_por ??= data.actualizado_por_id ? findUser(data.actualizado_por_id) : undefined;
    } catch {
      toast.error('Error al obtener los detalles de la lección');
    }
    setViewing({ ...data, ...contextOf(leccion) });
  };

  const confirmDelete = async () => {
    const toastId = toast.loading('Eliminando lección...');
    try {
      await deleteLeccion(leccionId(itemToDelete));
      toast.success('Lección eliminada exitosamente', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar la lección', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleToggleEstado = async (leccion) => {
    const isActive = leccion.estado === 'activo';
    const toastId = toast.loading(`${isActive ? 'Desactivando' : 'Activando'} lección...`);
    try {
      await toggleEstadoLeccion(leccionId(leccion), { estado: isActive ? 'inactivo' : 'activo', actualizado_por_id: currentUserId });
      toast.success(`Lección ${isActive ? 'desactivada' : 'activada'} exitosamente`, { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado', { id: toastId });
    }
  };

  const confirmSubmit = async () => {
    const data = confirmData;
    const duplicate = lecciones.some((l) => String(leccionSesionId(l)) === String(data.sesiones_id)
      && String(l.orden ?? l.orden_clasificacion) === String(data.orden_clasificacion)
      && String(leccionId(l)) !== String(leccionId(editing)));
    if (duplicate) {
      toast.error(`Ya existe una lección con el orden de clasificación ${data.orden_clasificacion} en esta sesión.`);
      setConfirmData(null);
      return;
    }

    const toastId = toast.loading(`${isCreate ? 'Creando' : 'Actualizando'} lección...`);
    try {
      const payload = {
        sesion_id: parseInt(data.sesiones_id, 10),
        titulo: data.titulo,
        descripcion: data.descripcion,
        contenido_lectura: data.contenido_lectura || null,
        orden: parseInt(data.orden_clasificacion, 10),
        color: data.color || null,
        url_icono: data.url_icono || data.identificador_icono || null,
        xp_recompensa: parseInt(data.xp_recompensa_base || 10, 10),
        estado: (data.activo ?? true) ? 'activo' : 'inactivo',
      };
      let savedId = leccionId(editing);
      if (isCreate) {
        const result = await createLeccion({ ...payload, creado_por_id: currentUserId });
        savedId = leccionId(result.data) || leccionId(result);
        toast.success('Lección creada exitosamente', { id: toastId });
      } else {
        await updateLeccion(savedId, { ...payload, actualizado_por_id: currentUserId });
        toast.success('Lección actualizada exitosamente', { id: toastId });
      }
      if (audioFile && savedId) {
        toast.loading('Subiendo audio...', { id: toastId });
        await uploadAudioLeccion(savedId, audioFile);
        toast.success('Audio subido exitosamente', { id: toastId });
      }
      if (documentoFile && savedId) {
        toast.loading('Subiendo documento...', { id: toastId });
        await uploadDocumentoLeccion(savedId, documentoFile);
        toast.success('Documento subido exitosamente', { id: toastId });
      }
      if (isCreate && rememberContext) saveContext();
      setEditing(null);
      setConfirmData(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${isCreate ? 'crear' : 'actualizar'} la lección`, { id: toastId });
    }
  };

  const onSort = (key) => setSort((s) => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }));
  const sortValue = {
    orden: (l) => {
      const { sesion, unidad } = contextOf(l);
      return ordenOf(unidad) * 1e6 + ordenOf(sesion) * 1e3 + ordenOf(l);
    },
    titulo: (l) => String(l.titulo || '').toLowerCase(),
    ubicacion: (l) => String(contextOf(l).sesion?.titulo || '').toLowerCase(),
  }[sort.key];

  const filtered = lecciones
    .filter((l) => {
      const { sesion, unidad, curso } = contextOf(l);
      const cid = unidad ? unidadCursoId(unidad) : '';
      const textOk = [l.titulo, l.descripcion, sesion?.titulo, unidad?.nombre || unidad?.titulo, cursoName(cid), curso?.nivel || 'A1']
        .some((t) => matchesSearch(t, searchTerm));
      return textOk
        && (cursoFilter === 'all' || cid === cursoFilter)
        && (unidadFilter === 'all' || String(sesion?.unidad_id) === unidadFilter)
        && (sesionFilter === 'all' || String(leccionSesionId(l)) === sesionFilter)
        && (statusFilter === 'all' || (statusFilter === 'active') === (l.estado === 'activo'));
    })
    .sort((a, b) => {
      const [x, y] = [sortValue(a), sortValue(b)];
      return (x < y ? -1 : x > y ? 1 : 0) * (sort.direction === 'asc' ? 1 : -1);
    });
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const visible = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasFilters = Boolean(searchTerm) || [cursoFilter, unidadFilter, sesionFilter, statusFilter].some((f) => f !== 'all');
  const byOrder = (a, b) => ordenOf(a) - ordenOf(b);
  const cursoOptions = cursos.map((c) => ({ value: String(cursoId(c)), label: cursoName(cursoId(c)) }));
  const unidadFilterOptions = unidads.filter((u) => cursoFilter === 'all' || unidadCursoId(u) === cursoFilter).sort(byOrder);
  const sesionFilterOptions = sesiones.filter((s) => {
    const u = findUnidad(s.unidad_id);
    return (unidadFilter === 'all' || String(s.unidad_id) === unidadFilter) && (cursoFilter === 'all' || unidadCursoId(u) === cursoFilter);
  }).sort(byOrder);
  const viewingRoute = viewing ? route(viewing.curso) : null;
  const viewingIcon = viewing ? iconOf(viewing) : null;

  return (
    <div>
      <PageHeader
        title="Gestión de Lecciones"
        description="Administra las lecciones específicas dentro de cada sesión."
        actions={<button type="button" className="rq-button rq-button--primary" onClick={() => openForm()}>Crear Lección</button>}
      />

      <div className="rq-toolbar" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="rq-filter">
          <label htmlFor="leccion-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input id="leccion-search" type="search" placeholder="Lección, sesión, unidad..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="rq-filter">
          <label>1. Curso y nivel</label>
          <RimaqSelect
            ariaLabel="Curso y nivel"
            value={cursoFilter}
            onValueChange={(val) => { setCursoFilter(val); setUnidadFilter('all'); setSesionFilter('all'); }}
            options={[{ value: 'all', label: 'Todos los cursos' }, ...cursoOptions]}
          />
        </div>
        <div className="rq-filter">
          <label>2. Unidad</label>
          <RimaqSelect
            ariaLabel="Unidad"
            value={unidadFilter}
            onValueChange={(val) => { setUnidadFilter(val); setSesionFilter('all'); }}
            disabled={cursoFilter === 'all'}
            placeholder="Todas las unidades"
            options={[
              { value: 'all', label: 'Todas las unidades' },
              ...unidadFilterOptions.map((u) => ({ value: unidadId(u), label: `Unidad ${ordenOf(u) || '?'} · ${u.nombre || u.titulo}` })),
            ]}
          />
        </div>
        <div className="rq-filter">
          <label>3. Sesión</label>
          <RimaqSelect
            ariaLabel="Sesión"
            value={sesionFilter}
            onValueChange={setSesionFilter}
            disabled={unidadFilter === 'all'}
            placeholder="Todas las sesiones"
            options={[
              { value: 'all', label: 'Todas las sesiones' },
              ...sesionFilterOptions.map((s) => ({ value: sesionId(s), label: `Sesión ${ordenOf(s) || '?'} · ${s.nombre || s.titulo}` })),
            ]}
          />
        </div>
        <div className="rq-filter">
          <label>Estado de lección</label>
          <RimaqSelect
            ariaLabel="Estado de lección"
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: 'all', label: 'Todos los estados' },
              { value: 'active', label: 'Activos' },
              { value: 'inactive', label: 'Inactivos' },
            ]}
          />
        </div>
      </div>

      <div className="rq-table-card">
        <div className="table-responsive-container">
          <table className="rq-table" aria-busy={loading}>
            <thead>
              <tr>
                <SortHeader label="Orden" sortKey="orden" sort={sort} onSort={onSort} style={{ width: 80 }} />
                <SortHeader label="Lección" sortKey="titulo" sort={sort} onSort={onSort} />
                <SortHeader label="Ubicación" sortKey="ubicacion" sort={sort} onSort={onSort} />
                <th>Recompensa</th>
                <th>Estado</th>
                <th className="rq-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} aria-hidden="true">
                    {[40, 200, 180, 60, 90, 90].map((w, j) => (
                      <td key={j}><div className="skeleton" style={{ width: w, height: 20, borderRadius: 6 }} /></td>
                    ))}
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan="6" className="rq-empty-cell">
                    <EmptyState
                      icon={PlayCircle}
                      title={hasFilters ? 'No se encontraron lecciones con esos filtros' : 'Aún no hay lecciones registradas'}
                      hint={hasFilters ? 'Intenta con otra búsqueda' : 'Crea la primera lección haciendo clic en "Crear Lección"'}
                    />
                  </td>
                </tr>
              ) : (
                visible.map((leccion, i) => {
                  const { sesion, unidad, curso } = contextOf(leccion);
                  const r = route(curso);
                  const color = leccion.color || DEFAULT_COLOR;
                  const isActive = leccion.estado === 'activo';
                  return (
                    <tr key={leccionId(leccion) || i} className={isActive ? '' : 'is-muted'}>
                      <td><span className="rq-badge">#{leccion.orden ?? leccion.orden_clasificacion}</span></td>
                      <td>
                        <div className="rq-inline" style={{ gap: 12 }}>
                          <LessonIcon icon={iconOf(leccion)} color={color} />
                          <div className="rq-cell-stack">
                            <span className="rq-inline rq-strong">
                              <span className="rq-dot" style={{ backgroundColor: color }} title={`Color: ${color}`} />
                              {leccion.titulo}
                            </span>
                            {leccion.descripcion && <span className="rq-muted rq-truncate" style={{ maxWidth: 250 }}>{leccion.descripcion}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rq-cell-stack">
                          <span className="rq-strong" style={{ fontWeight: 600 }}>Sesión {ordenOf(sesion) || '?'}: {sesion?.titulo || 'Sesión desconocida'}</span>
                          <span className="rq-muted">Unidad {ordenOf(unidad) || '?'}: {unidad?.nombre || unidad?.titulo || '?'}</span>
                          <span className="rq-route" style={{ fontSize: 11 }}>
                            {r.origen} → {r.destino}
                            <span className="rq-badge">{nivelLabel(curso)}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="rq-inline rq-strong">
                          <Award size={16} color="var(--color-tertiary-text)" aria-hidden="true" /> {xpOf(leccion)} XP
                        </span>
                      </td>
                      <td><StatusSwitch active={isActive} name={leccion.titulo} onToggle={() => handleToggleEstado(leccion)} /></td>
                      <td className="rq-col-actions">
                        <div>
                          <button type="button" className="rq-icon-btn" onClick={() => handleView(leccion)} title="Ver detalles" aria-label={`Ver detalles de ${leccion.titulo}`}><Eye size={17} /></button>
                          <button type="button" className="rq-icon-btn" onClick={() => openForm(leccion)} title="Editar" aria-label={`Editar ${leccion.titulo}`}><Edit2 size={17} /></button>
                          <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => setItemToDelete(leccion)} title="Eliminar" aria-label={`Eliminar ${leccion.titulo}`}><Trash2 size={17} /></button>
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

      <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />

      {editing && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="leccion-modal-title">
          <div className="modal-content-responsive rq-modal-dialog rq-modal-dialog--wizard lesson-form-modal">
            <div className="rq-modal-header">
              <h2 id="leccion-modal-title" className="rq-modal-header__title">{isCreate ? 'Crear Nueva Lección' : 'Editar Lección'}</h2>
              <button type="button" className="rq-icon-close" onClick={() => setEditing(null)} aria-label="Cerrar modal"><X size={18} /></button>
            </div>

            <form className="rq-wizard-form" onSubmit={(e) => { e.preventDefault(); if (formStep < 3) handleNextStep(); }}>
              <div className="academic-modal-scroll rq-modal-body">
                <WizardProgress currentStep={formStep} steps={STEPS} />

                {formStep === 1 && (
                  <div className="rq-step">
                    <div className="rq-form-grid-2">
                      <div className="rq-field">
                        <label className="rq-field__label">Curso Asociado</label>
                        <input type="hidden" {...register('form_curso_id', { required: 'El curso es requerido' })} />
                        <RimaqSelect
                          ariaLabel="Curso asociado"
                          value={String(formCursoId || '')}
                          onValueChange={(val) => {
                            setValue('form_curso_id', val, { shouldValidate: true });
                            setValue('form_unidad_id', '', { shouldValidate: true });
                            setValue('sesiones_id', '', { shouldValidate: true });
                          }}
                          placeholder="Seleccione un curso"
                          options={cursoOptions}
                          className="rimaq-select--full-width"
                        />
                        {errors.form_curso_id && <span className="rq-field__error">{errors.form_curso_id.message}</span>}
                      </div>
                      <div className="rq-field">
                        <label className="rq-field__label">Unidad Asociada</label>
                        <input type="hidden" {...register('form_unidad_id', { required: 'La unidad es requerida' })} />
                        <RimaqSelect
                          ariaLabel="Unidad asociada"
                          value={String(formUnidadId || '')}
                          onValueChange={(val) => {
                            setValue('form_unidad_id', val, { shouldValidate: true });
                            setValue('sesiones_id', '', { shouldValidate: true });
                          }}
                          placeholder="Seleccione una unidad"
                          options={unidads.filter((u) => unidadCursoId(u) === String(formCursoId)).map((u) => ({ value: unidadId(u), label: u.nombre || u.titulo }))}
                          disabled={!formCursoId}
                          className="rimaq-select--full-width"
                        />
                        {errors.form_unidad_id && <span className="rq-field__error">{errors.form_unidad_id.message}</span>}
                      </div>
                    </div>

                    <div className="rq-field">
                      <label className="rq-field__label">Sesión Asociada</label>
                      <input type="hidden" {...register('sesiones_id', { required: 'La sesión es requerida' })} />
                      <RimaqSelect
                        ariaLabel="Sesión asociada"
                        value={String(formSesionId || '')}
                        onValueChange={(val) => setValue('sesiones_id', val, { shouldValidate: true })}
                        placeholder="Seleccione una sesión"
                        options={sesiones.filter((s) => String(s.unidad_id) === String(formUnidadId)).map((s) => ({ value: sesionId(s), label: s.titulo }))}
                        disabled={!formUnidadId}
                        className="rimaq-select--full-width"
                      />
                      {errors.sesiones_id && <span className="rq-field__error">{errors.sesiones_id.message}</span>}
                    </div>

                    <div className="rq-setting-row">
                      <div>
                        <strong>Guardar para reutilizar</strong>
                        <span>Recordar este curso, unidad y sesión en las próximas lecciones.</span>
                      </div>
                      <button type="button" role="switch" className="rq-switch" aria-checked={rememberContext} aria-label="Guardar ubicación para reutilizar" onClick={toggleRemember} />
                    </div>
                  </div>
                )}

                {formStep === 2 && (
                  <div className="rq-step">
                    <div className="rq-field">
                      <label htmlFor="leccion-titulo" className="rq-field__label">Título de la Lección</label>
                      <input id="leccion-titulo" {...register('titulo', { required: 'El título es requerido' })} placeholder="Vocabulario de la familia" className={`rq-field__input${errors.titulo ? ' rq-field__input--error' : ''}`} />
                      {errors.titulo && <span className="rq-field__error">{errors.titulo.message}</span>}
                    </div>

                    <div className="rq-field">
                      <label htmlFor="leccion-descripcion" className="rq-field__label">Descripción</label>
                      <textarea id="leccion-descripcion" rows={2} {...register('descripcion', { required: 'La descripción es requerida' })} placeholder="Breve descripción de la lección..." className={`rq-field__input rq-textarea${errors.descripcion ? ' rq-field__input--error' : ''}`} style={{ resize: 'none' }} />
                      {errors.descripcion && <span className="rq-field__error">{errors.descripcion.message}</span>}
                    </div>

                    <div className="rq-form-grid-2">
                      <div className="rq-field">
                        <label htmlFor="leccion-xp" className="rq-field__label">Puntos XP</label>
                        <input id="leccion-xp" type="number" min="0" step="5" {...register('xp_recompensa_base', { required: 'Requerido' })} className={`rq-field__input rq-input-number${errors.xp_recompensa_base ? ' rq-field__input--error' : ''}`} />
                        {errors.xp_recompensa_base && <span className="rq-field__error">{errors.xp_recompensa_base.message}</span>}
                      </div>
                      <div className="rq-field">
                        <label htmlFor="leccion-orden-input" className="rq-field__label">Orden</label>
                        <input id="leccion-orden-input" type="number" min="1" {...register('orden_clasificacion', { required: 'Requerido', min: { value: 1, message: 'Debe ser mayor a 0' } })} className={`rq-field__input rq-input-number${errors.orden_clasificacion ? ' rq-field__input--error' : ''}`} placeholder="1" />
                        {errors.orden_clasificacion && <span className="rq-field__error">{errors.orden_clasificacion.message}</span>}
                      </div>
                    </div>

                    <div className="rq-form-row" style={{ gridTemplateColumns: '124px minmax(0, 1fr)' }}>
                      <input type="hidden" {...register('color')} />
                      <ColorPickerField value={watch('color')} onChange={(c) => setValue('color', c, { shouldDirty: true })} fallback={DEFAULT_COLOR} />
                      <div className="rq-field">
                        <label htmlFor="leccion-image-upload" className="rq-field__label">Imagen de lección</label>
                        <div className="rq-inline">
                          <input id="leccion-image-upload" type="file" accept="image/*" disabled={uploadingImage} hidden onChange={handleImageUpload} />
                          <label htmlFor="leccion-image-upload" className="rq-upload-pill" style={{ flex: 1, minWidth: 0, cursor: uploadingImage ? 'wait' : 'pointer' }}>
                            <span className="rq-upload-pill__icon"><ImagePlus size={15} /></span>
                            <span className={`rq-upload-pill__name${formIcon?.startsWith('/') ? ' rq-upload-pill__name--active' : ''}`}>
                              {uploadingImage ? 'Subiendo...' : (formIcon?.startsWith('/') ? 'Imagen cargada' : 'Seleccionar imagen...')}
                            </span>
                            <span className="rq-upload-pill__badge">{formIcon?.startsWith('/') ? 'Cambiar' : 'Subir'}</span>
                          </label>
                          {formIcon?.startsWith('/') && (
                            <button
                              type="button"
                              className="rq-thumb-zoom rq-tile"
                              onClick={() => setLightboxImage({ src: resolveMediaUrl(formIcon), alt: watch('titulo') || 'Vista previa de la lección' })}
                              aria-label="Ampliar imagen de la lección"
                            >
                              <img src={resolveMediaUrl(formIcon)} alt="" />
                              <span className="rq-thumb-zoom__hint"><ZoomIn size={15} /></span>
                            </button>
                          )}
                        </div>
                        <input type="hidden" {...register('identificador_icono', { required: 'Sube una imagen para la lección' })} />
                        {errors.identificador_icono && <span className="rq-field__error">{errors.identificador_icono.message}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {formStep === 3 && (
                  <div className="rq-step">
                    <div className="rq-field">
                      <div className="rq-inline" style={{ justifyContent: 'space-between' }}>
                        <label htmlFor="leccion-lectura" className="rq-field__label">Contenido de Lectura (Markdown)</label>
                        <button type="button" className="rq-button rq-button--ghost rq-button--sm" onClick={() => setIsPreviewMode(!isPreviewMode)}>
                          {isPreviewMode ? <Edit2 size={12} /> : <Eye size={12} />}
                          {isPreviewMode ? 'Editar' : 'Previsualizar'}
                        </button>
                      </div>
                      {isPreviewMode ? (
                        <div className="rq-markdown" style={{ minHeight: 135, maxHeight: 300 }}>
                          <ReactMarkdown>{watch('contenido_lectura') || '*Sin contenido*'}</ReactMarkdown>
                        </div>
                      ) : (
                        <textarea id="leccion-lectura" rows={6} {...register('contenido_lectura')} placeholder="Escribe el contenido en formato Markdown..." className="rq-field__input rq-textarea" />
                      )}
                    </div>

                    <div className="rq-field">
                      <span className="rq-field__label">Audio de Lectura (.mp3, .wav)</span>
                      <FilePicker id="audio-upload" icon={PlayCircle} accept=".mp3, .wav" file={audioFile} placeholder="Subir audio..." maxBytes={10 * MB} tooBig="El audio es demasiado grande. El límite es 10MB." onPick={setAudioFile} />
                      {audioUrl && <audio controls src={audioUrl} className="rq-audio" />}
                      {!isCreate && watch('url_lectura_audio') && !audioFile && (
                        <div className="rq-setting-row">
                          <span className="rq-muted">Audio actual configurado</span>
                          <audio controls src={resolveMediaUrl(watch('url_lectura_audio'))} className="rq-audio" style={{ width: 200 }} />
                        </div>
                      )}
                    </div>

                    <div className="rq-field">
                      <span className="rq-field__label">Documento Extra (.pdf, .doc)</span>
                      <FilePicker id="document-upload" icon={BookOpen} accept=".pdf, .doc, .docx, .md" file={documentoFile} placeholder="Subir documento..." maxBytes={20 * MB} tooBig="El documento es demasiado grande. El límite es 20MB." onPick={setDocumentoFile} />
                      {documentoUrl && (documentoFile.type === 'application/pdf'
                        ? <iframe src={documentoUrl} title="Previsualización del documento" className="rq-doc-preview" />
                        : <p className="rq-setting-row rq-muted" style={{ justifyContent: 'center' }}>La previsualización solo está disponible para archivos PDF.</p>)}
                      {!isCreate && watch('url_documento_extra') && !documentoFile && (
                        <div className="rq-setting-row">
                          <span className="rq-muted">Documento actual</span>
                          <a href={resolveMediaUrl(watch('url_documento_extra'))} target="_blank" rel="noopener noreferrer" className="rq-text-btn">Ver archivo</a>
                        </div>
                      )}
                    </div>

                    {!isCreate && (
                      <label htmlFor="leccion-activo" className="rq-check-card">
                        <input type="checkbox" id="leccion-activo" {...register('activo')} />
                        <strong className="rq-stat__value">Lección activa</strong>
                      </label>
                    )}
                  </div>
                )}
              </div>

              <div id="rq-step-form-actions" className="rq-form-actions rq-step-form-actions">
                <button type="button" onClick={() => setEditing(null)}>Cancelar</button>
                <div className="rq-step-form-actions__primary">
                  {formStep > 1 && <button type="button" onClick={() => setFormStep((s) => s - 1)}>Anterior</button>}
                  {formStep < 3
                    ? <button type="button" onClick={handleNextStep}>Continuar</button>
                    : <button type="button" onClick={handleSubmit(setConfirmData)}>{isCreate ? 'Crear Lección' : 'Guardar cambios'}</button>}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        open={Boolean(itemToDelete)}
        title="¿Eliminar lección?"
        itemName={itemToDelete?.titulo}
        description={itemToDelete ? <>Se eliminará <strong>“{itemToDelete.titulo}”</strong> junto con sus preguntas asociadas. Esta acción es irreversible.</> : null}
        onCancel={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={Boolean(confirmData)}
        icon={Save}
        title={isCreate ? '¿Crear lección?' : '¿Guardar cambios?'}
        description={isCreate ? `Crearás la lección "${confirmData?.titulo}".` : `Se guardarán los cambios de "${confirmData?.titulo}".`}
        confirmLabel={isCreate ? 'Sí, crear' : 'Sí, guardar'}
        onCancel={() => setConfirmData(null)}
        onConfirm={confirmSubmit}
      />

      {viewing && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="leccion-view-title">
          <div className="modal-content-responsive rq-modal-dialog rq-modal-dialog--wizard" style={{ width: 'min(640px, 100%)', maxWidth: 640 }}>
            <div className="rq-detail-banner" style={{ '--banner': viewing.color || DEFAULT_COLOR }}>
              <div className="rq-detail-banner__row">
                <div className="rq-inline" style={{ gap: 16, minWidth: 0 }}>
                  <span className="rq-detail-banner__icon" aria-hidden="true"><BookOpen size={28} /></span>
                  <div style={{ minWidth: 0 }}>
                    <span className="rq-overline">Detalles de la Lección</span>
                    <h2 id="leccion-view-title">{viewing.titulo}</h2>
                  </div>
                </div>
                <button type="button" className="rq-icon-close--on-color" onClick={() => setViewing(null)} aria-label="Cerrar detalles de lección"><X size={20} strokeWidth={2.5} /></button>
              </div>
            </div>

            <div className="academic-modal-scroll" style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              <div className="rq-detail-sheet rq-stack" style={{ gap: 20 }}>
                {viewing.descripcion && (
                  <div className="rq-detail-hero">
                    <span className="rq-icon-chip rq-icon-chip--lg rq-icon-chip--info" aria-hidden="true"><PlayCircle size={24} /></span>
                    <div>
                      <span className="rq-overline">Descripción</span>
                      <p className="rq-muted" style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.5 }}>{viewing.descripcion}</p>
                    </div>
                  </div>
                )}

                <div className="rq-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <div className="rq-stat-card" style={{ gridColumn: '1 / -1' }}>
                    <DetailStat
                      icon={Layers}
                      label="Sesión asociada"
                      value={(
                        <>
                          Sesión {ordenOf(viewing.sesion) || '?'}: {viewing.sesion?.titulo || 'Desconocida'}
                          <span className="rq-muted" style={{ display: 'block', marginTop: 4, fontWeight: 500 }}>
                            Unidad {ordenOf(viewing.unidad) || '?'}: {viewing.unidad?.nombre || viewing.unidad?.titulo || 'Desconocida'} · {viewingRoute.origen} → {viewingRoute.destino} ({viewing.curso?.nivel || 'A1'})
                          </span>
                        </>
                      )}
                    />
                  </div>
                  <div className="rq-stat-card"><DetailStat icon={Award} tone="warning" label="XP recompensa" value={`${xpOf(viewing)} XP`} /></div>
                  <div className="rq-stat-card"><DetailStat icon={ListTree} label="Orden" value={`#${viewing.orden ?? viewing.orden_clasificacion}`} /></div>
                  <div className="rq-stat-card">
                    <DetailStat
                      icon={viewing.estado === 'activo' ? CheckCircle : XCircle}
                      tone={viewing.estado === 'activo' ? 'success' : undefined}
                      label="Estado"
                      value={viewing.estado === 'activo' ? 'Activo' : 'Inactivo'}
                    />
                  </div>
                  <div className="rq-stat-card"><DetailStat icon={AlignLeft} label="Preguntas creadas" value={`${viewing.preguntas?.length || 0} preguntas`} /></div>
                  <div className="rq-stat-card">
                    {isUploadedIcon(viewingIcon) ? (
                      <div className="rq-stat">
                        <button
                          type="button"
                          className="rq-thumb-zoom rq-tile"
                          style={{ width: 44, height: 44 }}
                          onClick={() => setLightboxImage({ src: resolveMediaUrl(viewingIcon), alt: viewing.titulo })}
                          aria-label={`Ampliar imagen de ${viewing.titulo}`}
                        >
                          <img src={resolveMediaUrl(viewingIcon)} alt="" crossOrigin="anonymous" />
                          <span className="rq-thumb-zoom__hint"><ZoomIn size={14} /></span>
                        </button>
                        <div><span className="rq-overline">Imagen</span><span className="rq-stat__value">Personalizada</span></div>
                      </div>
                    ) : (
                      <DetailStat icon={ImageIcon} label="Imagen" value="Por defecto" />
                    )}
                  </div>
                  <div className="rq-stat-card">
                    <DetailStat
                      icon={BookOpen}
                      label="Documento extra"
                      value={viewing.url_documento_extra
                        ? <a href={resolveMediaUrl(viewing.url_documento_extra)} target="_blank" rel="noreferrer" className="rq-link">Ver documento</a>
                        : 'Sin documento'}
                    />
                  </div>
                  <div className="rq-stat-card" style={{ gridColumn: '1 / -1' }}>
                    <span className="rq-overline">Audio de lectura</span>
                    {viewing.url_lectura_audio
                      ? <audio controls src={resolveMediaUrl(viewing.url_lectura_audio)} className="rq-audio" style={{ marginTop: 8 }} />
                      : <p className="rq-stat__value" style={{ margin: '4px 0 0' }}>Sin audio</p>}
                  </div>
                </div>

                <div>
                  <span className="rq-overline">Contenido de lectura (Markdown)</span>
                  <div className="rq-markdown" style={{ marginTop: 8, maxHeight: 180 }}>
                    {viewing.contenido_lectura
                      ? <ReactMarkdown>{viewing.contenido_lectura}</ReactMarkdown>
                      : <span className="rq-muted" style={{ fontStyle: 'italic' }}>Sin contenido de lectura.</span>}
                  </div>
                </div>

                <AuditPanel record={viewing} />
              </div>
            </div>

            <div className="rq-modal-footer">
              <button type="button" className="rq-button rq-button--primary" onClick={() => setViewing(null)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      <ImageLightboxModal src={lightboxImage?.src} alt={lightboxImage?.alt} title={lightboxImage?.alt} onClose={() => setLightboxImage(null)} />
    </div>
  );
};
