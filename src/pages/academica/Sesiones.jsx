import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Search, Edit2, Trash2, X, Save, Layers, BookOpen, Eye, ListTree, Image as ImageIcon, ImageOff, ImagePlus, ZoomIn } from 'lucide-react';
import { getSesiones, getSesionById, createSesion, updateSesion, deleteSesion, toggleEstadoSesion, uploadSesionImage } from '../../services/sesionService';
import { getUnidads } from '../../services/unidadService';
import { getCursos } from '../../services/cursoService';
import { getIdiomas } from '../../services/idiomaService';
import { getUsuarios } from '../../services/userService';
import { resolveMediaUrl } from '../../services/api';
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
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const REMEMBER_CURSO = 'sesion.defaultCursoId';
const REMEMBER_UNIDAD = 'sesion.defaultUnidadId';
const STEPS = [
  { label: 'Ubicación', description: 'Selecciona el curso y la unidad de la sesión.' },
  { label: 'Datos principales', description: 'Configura el título, orden, color e imagen.' },
];

const list = (r) => (Array.isArray(r) ? r : r?.data || []);
const sesionId = (s) => s?.sesion_id || s?.sesiones_id || s?.id;
const unidadId = (u) => String(u?.unidad_id || u?.unidads_id || u?.id);
const cursoId = (c) => c?.curso_id || c?.cursos_id || c?.id;
const unidadCursoId = (u) => String(u?.curso_id || u?.cursos_id);
const ordenOf = (x) => Number((x?.orden ?? x?.orden_clasificacion) || 0);
const unidadName = (u) => u?.nombre || u?.titulo || '';
const nivelLabel = (c) => {
  const nivel = c?.nivel || 'A1';
  return { A: `${nivel} - Básico`, B: `${nivel} - Intermedio`, C: `${nivel} - Avanzado` }[nivel[0]] || nivel;
};

const Flag = ({ src }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return <img src={src} alt="" className="rq-flag" style={{ width: 12, height: 12, borderRadius: 2 }} crossOrigin="anonymous" onError={() => setFailed(true)} />;
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
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nueva, sesión = edición
  const [formStep, setFormStep] = useState(1);
  const [rememberLocation, setRememberLocation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cursoFilter, setCursoFilter] = useState('all');
  const [unidadFilter, setUnidadFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'orden', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const imageInputRef = useRef(null);

  const { register, handleSubmit, reset, watch, setValue, trigger, formState: { errors } } = useForm();
  const formCursoId = watch('form_curso_id');
  const formUnidadId = watch('unidad_id');
  const isCreate = editing && !sesionId(editing);

  const findUnidad = (id) => unidads.find((u) => unidadId(u) === String(id));
  const findCurso = (id) => cursos.find((c) => String(cursoId(c)) === String(id));
  const findIdioma = (id) => idiomas.find((i) => String(i.idioma_id || i.id) === String(id));
  const idiomaName = (i, fallback) => i?.nombres || i?.nombre || fallback;
  const route = (curso) => {
    const origen = findIdioma(curso?.idioma_origen_id || curso?.idioma_origen?.idioma_id || curso?.idiomaOrigen?.idioma_id);
    const destino = findIdioma(curso?.idioma_destino_id || curso?.idioma_destino?.idioma_id || curso?.idiomaDestino?.idioma_id);
    return {
      origen: idiomaName(origen, idiomaName(curso?.idioma_origen || curso?.idiomaOrigen, 'Origen')),
      destino: idiomaName(destino, idiomaName(curso?.idioma_destino || curso?.idiomaDestino, 'Destino')),
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
  const contextOf = (sesion) => {
    const unidad = findUnidad(sesion.unidad_id);
    return { unidad, curso: findCurso(unidad?.curso_id || unidad?.cursos_id) };
  };
  const nextOrder = (uid) => (uid ? sesiones.filter((s) => String(s.unidad_id) === String(uid)).reduce((m, s) => Math.max(m, ordenOf(s)), 0) + 1 : 1);
  const parentColor = (uid) => findUnidad(uid)?.color || DEFAULT_COLOR;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [s, u, c, i, us] = await Promise.all([getSesiones(), getUnidads(), getCursos(), getIdiomas(), getUsuarios()]);
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
  useEffect(() => { setCurrentPage(1); }, [searchTerm, cursoFilter, unidadFilter, statusFilter, sort]);
  useEffect(() => () => { if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  // Al crear: orden y color siguen a la unidad elegida.
  useEffect(() => {
    if (!isCreate) return;
    const order = nextOrder(formUnidadId);
    setValue('orden_clasificacion', order, { shouldValidate: true });
    setValue('color', getColorByOrder(parentColor(formUnidadId), order), { shouldDirty: false });
  }, [formUnidadId, isCreate, sesiones, unidads]);

  const openForm = (sesion = {}) => {
    const isNew = !sesionId(sesion);
    const savedCurso = isNew ? localStorage.getItem(REMEMBER_CURSO) || '' : '';
    const savedUnidad = isNew ? localStorage.getItem(REMEMBER_UNIDAD) || '' : '';
    const hasSaved = Boolean(savedCurso && savedUnidad);
    const order = isNew ? nextOrder(savedUnidad) : sesion.orden ?? sesion.orden_clasificacion;
    reset({
      form_curso_id: isNew ? savedCurso : String(cursoId(contextOf(sesion).curso) || ''),
      unidad_id: isNew ? savedUnidad : String(sesion.unidad_id || ''),
      titulo: sesion.titulo || '',
      orden_clasificacion: order,
      color: isNew ? getColorByOrder(parentColor(savedUnidad), order) : (sesion.color || DEFAULT_COLOR),
      url_imagen: sesion.url_imagen || '',
      activo: sesion.estado ? sesion.estado === 'activo' : sesion.activo !== 0 && sesion.activo !== false,
    });
    setImageFile(null);
    setImagePreview(sesion.url_imagen ? resolveMediaUrl(sesion.url_imagen) : null);
    setRememberLocation(hasSaved);
    setFormStep(hasSaved ? 2 : 1);
    setEditing(sesion);
  };

  const saveLocation = () => {
    localStorage.setItem(REMEMBER_CURSO, String(formCursoId));
    localStorage.setItem(REMEMBER_UNIDAD, String(formUnidadId));
  };

  const handleNextStep = async () => {
    if (!(await trigger(['form_curso_id', 'unidad_id']))) return;
    if (isCreate && rememberLocation) saveLocation();
    if (isCreate) setValue('orden_clasificacion', nextOrder(formUnidadId), { shouldValidate: true });
    setFormStep(2);
  };

  const toggleRemember = async () => {
    if (rememberLocation) {
      setRememberLocation(false);
      localStorage.removeItem(REMEMBER_CURSO);
      localStorage.removeItem(REMEMBER_UNIDAD);
      toast.success('El curso y la unidad ya no se reutilizarán automáticamente.');
      return;
    }
    if (!(await trigger(['form_curso_id', 'unidad_id']))) return;
    saveLocation();
    setRememberLocation(true);
    toast.success('Curso y unidad guardados para reutilizarlos en nuevas sesiones.');
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) {
      toast.error(file.type.startsWith('image/') ? 'La imagen no puede superar los 5 MB' : 'Selecciona un archivo de imagen válido');
      e.target.value = '';
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const findUser = (id) => usuarios.find((u) => String(u.usuario_id || u.id || u.usuarios_id) === String(id));
  const handleView = async (sesion) => {
    let data = sesion;
    try {
      const response = await getSesionById(sesionId(sesion));
      data = response.data || response;
      data.creado_por ??= data.creado_por_id ? findUser(data.creado_por_id) : undefined;
      data.actualizado_por ??= data.actualizado_por_id ? findUser(data.actualizado_por_id) : undefined;
    } catch {
      toast.error('Error al obtener los detalles de la sesión');
    }
    setViewing({ ...data, ...contextOf({ unidad_id: data.unidad_id || data.unidads_id || sesion.unidad_id }) });
  };

  const confirmDelete = async () => {
    const toastId = toast.loading('Eliminando sesión...');
    try {
      await deleteSesion(sesionId(itemToDelete));
      toast.success('Sesión eliminada exitosamente', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar la sesión', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleToggleEstado = async (sesion) => {
    const isActive = sesion.estado === 'activo';
    const toastId = toast.loading(`${isActive ? 'Desactivando' : 'Activando'} sesión...`);
    try {
      await toggleEstadoSesion(sesionId(sesion), { estado: isActive ? 'inactivo' : 'activo', actualizado_por_id: currentUserId });
      toast.success(`Sesión ${isActive ? 'desactivada' : 'activada'} exitosamente`, { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado', { id: toastId });
    }
  };

  const confirmSubmit = async () => {
    const data = confirmData;
    const duplicate = sesiones.some((s) => String(s.unidad_id) === String(data.unidad_id)
      && String(s.orden ?? s.orden_clasificacion) === String(data.orden_clasificacion)
      && String(sesionId(s)) !== String(sesionId(editing)));
    if (duplicate) {
      toast.error(`Ya existe una sesión con el orden de clasificación ${data.orden_clasificacion} en esta unidad.`);
      setConfirmData(null);
      return;
    }

    const toastId = toast.loading(`${isCreate ? 'Creando' : 'Actualizando'} sesión...`);
    try {
      // Sin vista previa = el usuario quitó la imagen; se envía null para borrarla.
      const url = imageFile ? (await uploadSesionImage(imageFile)).url : (imagePreview ? data.url_imagen || null : null);
      const payload = {
        unidad_id: parseInt(data.unidad_id, 10),
        titulo: data.titulo,
        orden: parseInt(data.orden_clasificacion, 10),
        color: data.color || null,
        url_imagen: url,
        estado: (data.activo ?? true) ? 'activo' : 'inactivo',
      };
      if (isCreate) await createSesion({ ...payload, creado_por_id: currentUserId });
      else await updateSesion(sesionId(editing), { ...payload, actualizado_por_id: currentUserId });
      toast.success(`Sesión ${isCreate ? 'creada' : 'actualizada'} exitosamente`, { id: toastId });
      setEditing(null);
      setConfirmData(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${isCreate ? 'crear' : 'actualizar'} la sesión`, { id: toastId });
    }
  };

  const onSort = (key) => setSort((s) => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }));
  const sortValue = {
    orden: (s) => ordenOf(findUnidad(s.unidad_id)) * 10000 + ordenOf(s),
    titulo: (s) => String(s.titulo || '').toLowerCase(),
    unidad: (s) => unidadName(findUnidad(s.unidad_id)).toLowerCase(),
    estado: (s) => s.estado || '',
  }[sort.key];

  const filtered = sesiones
    .filter((s) => {
      const { unidad, curso } = contextOf(s);
      const cid = unidad ? unidadCursoId(unidad) : '';
      const textOk = [s.titulo, unidadName(unidad), cursoName(cid), curso?.nivel || 'A1'].some((t) => matchesSearch(t, searchTerm));
      return textOk
        && (cursoFilter === 'all' || cid === cursoFilter)
        && (unidadFilter === 'all' || String(s.unidad_id) === unidadFilter)
        && (statusFilter === 'all' || (statusFilter === 'active') === (s.estado === 'activo'));
    })
    .sort((a, b) => {
      const [x, y] = [sortValue(a), sortValue(b)];
      return (x < y ? -1 : x > y ? 1 : 0) * (sort.direction === 'asc' ? 1 : -1);
    });
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const visible = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasFilters = Boolean(searchTerm) || cursoFilter !== 'all' || unidadFilter !== 'all' || statusFilter !== 'all';
  const cursoOptions = cursos.map((c) => ({ value: String(cursoId(c)), label: cursoName(cursoId(c)) }));
  const viewingRoute = viewing ? route(viewing.curso) : null;

  return (
    <div>
      <PageHeader
        title="Gestión de Sesiones"
        description="Administra las sesiones dentro de las unidades de los cursos."
        actions={<button type="button" className="rq-button rq-button--primary" onClick={() => openForm()}>Crear Sesión</button>}
      />

      <div className="rq-toolbar" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="rq-filter">
          <label htmlFor="sesion-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input id="sesion-search" type="search" placeholder="Sesión, unidad o curso..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="rq-filter">
          <label>1. Curso y nivel</label>
          <RimaqSelect
            ariaLabel="Curso y nivel"
            value={cursoFilter}
            onValueChange={(val) => { setCursoFilter(val); setUnidadFilter('all'); }}
            options={[{ value: 'all', label: 'Todos los cursos' }, ...cursoOptions]}
          />
        </div>
        <div className="rq-filter">
          <label>2. Unidad</label>
          <RimaqSelect
            ariaLabel="Unidad"
            value={unidadFilter}
            onValueChange={setUnidadFilter}
            disabled={cursoFilter === 'all'}
            placeholder="Todas las unidades"
            options={[
              { value: 'all', label: 'Todas las unidades' },
              ...unidads.filter((u) => unidadCursoId(u) === cursoFilter).map((u) => ({ value: unidadId(u), label: unidadName(u) })),
            ]}
          />
        </div>
        <div className="rq-filter">
          <label>Estado de sesión</label>
          <RimaqSelect
            ariaLabel="Estado de sesión"
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
                <SortHeader label="Sesión" sortKey="titulo" sort={sort} onSort={onSort} />
                <SortHeader label="Unidad y Curso" sortKey="unidad" sort={sort} onSort={onSort} />
                <SortHeader label="Estado" sortKey="estado" sort={sort} onSort={onSort} />
                <th className="rq-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} aria-hidden="true">
                    {[40, 200, 180, 90, 90].map((w, j) => (
                      <td key={j}><div className="skeleton" style={{ width: w, height: 20, borderRadius: 6 }} /></td>
                    ))}
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan="5" className="rq-empty-cell">
                    <EmptyState
                      icon={ListTree}
                      title={hasFilters ? 'No se encontraron sesiones con esos filtros' : 'Aún no hay sesiones registradas'}
                      hint={hasFilters ? 'Intenta con otra búsqueda' : 'Crea la primera sesión haciendo clic en "Crear Sesión"'}
                    />
                  </td>
                </tr>
              ) : (
                visible.map((sesion, i) => {
                  const { unidad, curso } = contextOf(sesion);
                  const r = route(curso);
                  const image = resolveMediaUrl(sesion.url_imagen);
                  const isActive = sesion.estado === 'activo';
                  const color = sesion.color || DEFAULT_COLOR;
                  return (
                    <tr key={sesionId(sesion) || i} className={isActive ? '' : 'is-muted'}>
                      <td><span className="rq-badge">#{sesion.orden ?? sesion.orden_clasificacion}</span></td>
                      <td>
                        <div className="rq-inline" style={{ gap: 12 }}>
                          {image ? (
                            <button type="button" className="rq-thumb-zoom rq-tile rq-tile--sm" onClick={() => setLightboxImage({ src: image, alt: sesion.titulo })} aria-label={`Ampliar imagen de ${sesion.titulo}`}>
                              <img src={image} alt="" crossOrigin="anonymous" />
                              <span className="rq-thumb-zoom__hint"><ZoomIn size={14} /></span>
                            </button>
                          ) : (
                            <span className="rq-tile rq-tile--sm" aria-hidden="true"><ImageIcon size={16} /></span>
                          )}
                          <div className="rq-cell-stack">
                            <span className="rq-inline rq-strong">
                              <span className="rq-dot" style={{ backgroundColor: color }} title={`Color: ${color}`} />
                              {sesion.titulo}
                            </span>
                            <span className="rq-muted">{image ? 'Imagen configurada' : 'Sin imagen'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rq-cell-stack">
                          <span className="rq-strong" style={{ fontWeight: 600 }}>
                            Unidad {(unidad?.orden ?? unidad?.orden_clasificacion) || '?'}: {unidadName(unidad) || 'Unidad desconocida'}
                          </span>
                          <span className="rq-route" style={{ fontSize: 11 }}>
                            <Flag src={r.flagOrigen} />{r.origen} → <Flag src={r.flagDestino} />{r.destino}
                            <span className="rq-badge">{nivelLabel(curso)}</span>
                          </span>
                        </div>
                      </td>
                      <td><StatusSwitch active={isActive} name={sesion.titulo} onToggle={() => handleToggleEstado(sesion)} /></td>
                      <td className="rq-col-actions">
                        <div>
                          <button type="button" className="rq-icon-btn" onClick={() => handleView(sesion)} title="Ver detalles" aria-label={`Ver detalles de ${sesion.titulo}`}><Eye size={17} /></button>
                          <button type="button" className="rq-icon-btn" onClick={() => openForm(sesion)} title="Editar" aria-label={`Editar ${sesion.titulo}`}><Edit2 size={17} /></button>
                          <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => setItemToDelete(sesion)} title="Eliminar" aria-label={`Eliminar ${sesion.titulo}`}><Trash2 size={17} /></button>
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
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="sesion-modal-title">
          <div className="modal-content-responsive rq-modal-dialog rq-modal-dialog--wizard">
            <div className="rq-modal-header">
              <h2 id="sesion-modal-title" className="rq-modal-header__title">{isCreate ? 'Crear Nueva Sesión' : 'Editar Sesión'}</h2>
              <button type="button" className="rq-icon-close" onClick={() => setEditing(null)} aria-label="Cerrar modal"><X size={18} /></button>
            </div>

            <form className="rq-wizard-form" onSubmit={(e) => { e.preventDefault(); if (formStep < 2) handleNextStep(); }}>
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
                            setValue('unidad_id', '', { shouldValidate: true });
                          }}
                          placeholder="Seleccione un curso"
                          options={cursoOptions}
                          className="rimaq-select--full-width"
                        />
                        {errors.form_curso_id && <span className="rq-field__error">{errors.form_curso_id.message}</span>}
                      </div>
                      <div className="rq-field">
                        <label className="rq-field__label">Unidad Asociada</label>
                        <input type="hidden" {...register('unidad_id', { required: 'La unidad es requerida' })} />
                        <RimaqSelect
                          ariaLabel="Unidad asociada"
                          value={String(formUnidadId || '')}
                          onValueChange={(val) => setValue('unidad_id', val, { shouldValidate: true })}
                          placeholder="Seleccione una unidad"
                          options={unidads.filter((u) => unidadCursoId(u) === String(formCursoId)).map((u) => ({ value: unidadId(u), label: unidadName(u) }))}
                          disabled={!formCursoId}
                          className="rimaq-select--full-width"
                        />
                        {errors.unidad_id && <span className="rq-field__error">{errors.unidad_id.message}</span>}
                      </div>
                    </div>

                    {isCreate && (
                      <div className="rq-setting-row">
                        <div>
                          <strong>Guardar para reutilizar</strong>
                          <span>Recordar este curso y unidad en las próximas sesiones.</span>
                        </div>
                        <button type="button" role="switch" className="rq-switch" aria-checked={rememberLocation} aria-label="Guardar curso y unidad para reutilizar" onClick={toggleRemember} />
                      </div>
                    )}
                  </div>
                )}

                {formStep === 2 && (
                  <div className="rq-step">
                    <div className="rq-form-row" style={{ gridTemplateColumns: '96px minmax(0, 1fr)' }}>
                      <div className="rq-field">
                        <label htmlFor="sesion-orden-input" className="rq-field__label">Orden</label>
                        <input
                          id="sesion-orden-input"
                          type="number"
                          min="1"
                          {...register('orden_clasificacion', { required: 'El orden es requerido', min: { value: 1, message: 'Debe ser mayor a 0' } })}
                          className={`rq-field__input rq-input-number${errors.orden_clasificacion ? ' rq-field__input--error' : ''}`}
                          placeholder="1"
                        />
                        {errors.orden_clasificacion && <span className="rq-field__error">{errors.orden_clasificacion.message}</span>}
                      </div>
                      <div className="rq-field">
                        <label htmlFor="sesion-titulo-input" className="rq-field__label">Título de la sesión</label>
                        <input
                          id="sesion-titulo-input"
                          {...register('titulo', { required: 'El título es requerido' })}
                          className={`rq-field__input${errors.titulo ? ' rq-field__input--error' : ''}`}
                          placeholder="Saludos básicos"
                        />
                        {errors.titulo && <span className="rq-field__error">{errors.titulo.message}</span>}
                      </div>
                    </div>

                    <div className="rq-form-row" style={{ gridTemplateColumns: '124px minmax(0, 1fr)' }}>
                      <input type="hidden" {...register('color')} />
                      <ColorPickerField value={watch('color')} onChange={(c) => setValue('color', c, { shouldDirty: true })} fallback={DEFAULT_COLOR} />
                      <div className="rq-field">
                        <label htmlFor="sesion-image-upload" className="rq-field__label">Imagen de sesión</label>
                        <div className="rq-inline">
                          <input ref={imageInputRef} id="sesion-image-upload" type="file" accept="image/*" onChange={onPickImage} hidden />
                          <label htmlFor="sesion-image-upload" className="rq-upload-pill" style={{ flex: 1, minWidth: 0 }}>
                            <span className="rq-upload-pill__icon"><ImagePlus size={15} /></span>
                            <span className={`rq-upload-pill__name${imagePreview ? ' rq-upload-pill__name--active' : ''}`}>
                              {imageFile ? imageFile.name : (imagePreview ? 'Imagen cargada' : 'Seleccionar imagen...')}
                            </span>
                            <span className="rq-upload-pill__badge">{imagePreview ? 'Cambiar' : 'Subir'}</span>
                          </label>
                          {imagePreview && (
                            <>
                              <button
                                type="button"
                                className="rq-thumb-zoom rq-tile"
                                onClick={() => setLightboxImage({ src: imagePreview, alt: watch('titulo') || 'Vista previa de sesión' })}
                                aria-label="Ampliar imagen de sesión"
                              >
                                <img src={imagePreview} alt="" />
                                <span className="rq-thumb-zoom__hint"><ZoomIn size={15} /></span>
                              </button>
                              <button type="button" className="rq-icon-close" onClick={clearImage} aria-label="Quitar imagen seleccionada"><X size={16} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isCreate && (
                      <label htmlFor="sesion-activo" className="rq-check-card">
                        <input type="checkbox" id="sesion-activo" {...register('activo')} />
                        <strong className="rq-stat__value">Sesión activa y visible para estudiantes</strong>
                      </label>
                    )}
                  </div>
                )}
              </div>

              <div id="rq-step-form-actions" className="rq-form-actions rq-step-form-actions">
                <button type="button" onClick={() => setEditing(null)}>Cancelar</button>
                <div className="rq-step-form-actions__primary">
                  {formStep > 1 && <button type="button" onClick={() => setFormStep(1)}>Anterior</button>}
                  {formStep < 2
                    ? <button type="button" onClick={handleNextStep}>Continuar</button>
                    : <button type="button" onClick={handleSubmit(setConfirmData)}>{isCreate ? 'Crear Sesión' : 'Guardar cambios'}</button>}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        open={Boolean(itemToDelete)}
        title="¿Eliminar sesión?"
        itemName={itemToDelete?.titulo}
        onCancel={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={Boolean(confirmData)}
        icon={Save}
        title={isCreate ? '¿Crear esta sesión?' : '¿Guardar cambios?'}
        description={isCreate ? `Crearás la nueva sesión "${confirmData?.titulo}".` : `Se guardarán los cambios de la sesión "${confirmData?.titulo}".`}
        confirmLabel={isCreate ? 'Sí, crear' : 'Sí, guardar'}
        onCancel={() => setConfirmData(null)}
        onConfirm={confirmSubmit}
      />

      {viewing && (
        <div
          className="rq-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sesion-view-title"
          onClick={(e) => { if (e.target === e.currentTarget) setViewing(null); }}
        >
          <div className="modal-content-responsive rq-modal-dialog rq-modal-dialog--wizard" style={{ width: 'min(640px, 100%)', maxWidth: 640 }}>
            <div
              className="rq-detail-banner"
              style={{
                '--banner': viewing.color || 'var(--color-primary)',
                backgroundImage: viewing.url_imagen ? `url(${resolveMediaUrl(viewing.url_imagen)})` : undefined,
              }}
            >
              <div className="rq-detail-banner__row">
                <div className="rq-inline" style={{ gap: 16 }}>
                  <span className="rq-detail-banner__icon" aria-hidden="true"><BookOpen size={28} strokeWidth={2.5} /></span>
                  <div>
                    <span className="rq-overline">Detalles de la Sesión</span>
                    <h2 id="sesion-view-title">{viewing.titulo}</h2>
                  </div>
                </div>
                <button type="button" className="rq-icon-close--on-color" onClick={() => setViewing(null)} aria-label="Cerrar detalles de sesión"><X size={20} strokeWidth={2.5} /></button>
              </div>
            </div>

            <div className="academic-modal-scroll" style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              <div className="rq-detail-sheet">
                <div className="rq-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <div className="rq-stat-card">
                    <DetailStat
                      icon={BookOpen}
                      label="Unidad asociada"
                      value={(
                        <>
                          {unidadName(viewing.unidad) || 'Desconocida'}
                          <span className="rq-muted" style={{ display: 'block', marginTop: 4 }}>
                            {viewingRoute.origen} → {viewingRoute.destino} <span className="rq-badge rq-badge--secondary">{nivelLabel(viewing.curso)}</span>
                          </span>
                        </>
                      )}
                    />
                  </div>
                  <div className="rq-stat-card"><DetailStat icon={ListTree} label="Orden de sesión" value={`#${viewing.orden ?? viewing.orden_clasificacion}`} /></div>
                  <div className="rq-stat-card"><DetailStat icon={Layers} label="Total lecciones" value={viewing.lecciones?.length || 0} /></div>
                  <div className="rq-stat-card">
                    {viewing.url_imagen ? (
                      <div className="rq-stat">
                        <button
                          type="button"
                          className="rq-thumb-zoom rq-tile"
                          style={{ width: 44, height: 44 }}
                          onClick={() => setLightboxImage({ src: resolveMediaUrl(viewing.url_imagen), alt: viewing.titulo })}
                          aria-label={`Ampliar imagen de ${viewing.titulo}`}
                        >
                          <img src={resolveMediaUrl(viewing.url_imagen)} alt="" crossOrigin="anonymous" />
                          <span className="rq-thumb-zoom__hint"><ZoomIn size={14} /></span>
                        </button>
                        <div><span className="rq-overline">Imagen</span><span className="rq-stat__value">Configurada</span></div>
                      </div>
                    ) : (
                      <DetailStat icon={ImageOff} label="Imagen" value="Por defecto" />
                    )}
                  </div>
                </div>
              </div>
              <div style={{ margin: '20px 28px 0' }}><AuditPanel record={viewing} /></div>
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
