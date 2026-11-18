import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Search, Edit2, Trash2, X, Save, Layers, BookOpen, ListTree, Eye, ArrowRight, ImageOff, ImagePlus, ZoomIn } from 'lucide-react';
import { getUnidads, getUnidadById, createUnidad, updateUnidad, deleteUnidad, toggleEstadoUnidad, uploadUnidadImage } from '../../services/unidadService';
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
import { PageHeader, EmptyState, Pagination, DetailStat, StatusSwitch, LevelBadge, AuditPanel } from '../../components/PageKit';

const ITEMS_PER_PAGE = 5;
const DEFAULT_COLOR = '#991b1b';
const REMEMBER_KEY = 'unidad.defaultCursoId';
const STEPS = [
  { label: 'Curso asociado', description: 'Selecciona el curso y el nivel de la nueva unidad.' },
  { label: 'Datos principales', description: 'Configura el nombre, orden, color e imagen.' },
];

const list = (r) => (Array.isArray(r) ? r : r?.data || []);
const unidadId = (u) => u?.unidad_id || u?.unidads_id || u?.id;
const unidadCursoId = (u) => u?.curso_id || u?.cursos_id;
const cursoId = (c) => c?.curso_id || c?.cursos_id || c?.id;
const ordenOf = (u) => u?.orden ?? u?.orden_clasificacion;
const tituloOf = (u) => u?.nombre || u?.titulo || `Unidad ${ordenOf(u) || unidadId(u) || ''}`;
const origenId = (c) => c?.idioma_origen_id || c?.idioma_origen?.idioma_id || c?.idiomaOrigen?.idioma_id;
const destinoId = (c) => c?.idioma_destino_id || c?.idioma_destino?.idioma_id || c?.idiomaDestino?.idioma_id;
const groupKey = (c) => `${origenId(c)}-${destinoId(c)}`;
const nivelLabel = (c) => {
  const nivel = c?.nivel || 'A1';
  return { A: `${nivel} - Básico`, B: `${nivel} - Intermedio`, C: `${nivel} - Avanzado` }[nivel[0]] || nivel;
};

const Flag = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return <img src={src} alt={alt} className="rq-flag" crossOrigin="anonymous" onError={() => setFailed(true)} />;
};

export const Unidades = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.usuarios_id || user?.usuario_id;

  const [unidads, setUnidads] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [idiomas, setIdiomas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nueva, unidad = edición
  const [formStep, setFormStep] = useState(1);
  const [rememberCourse, setRememberCourse] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cursoFilter, setCursoFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const imageInputRef = useRef(null);

  const { register, handleSubmit, reset, setValue, watch, trigger, formState: { errors } } = useForm();
  const selectedGroup = watch('curso_group');
  const selectedCursoId = watch('cursos_id');
  const isCreate = editing && !unidadId(editing);

  const idiomaName = (id, embedded) => {
    const idioma = embedded || idiomas.find((i) => String(i.idioma_id || i.id) === String(id));
    return idioma?.nombres || idioma?.nombre || 'Desconocido';
  };
  const findCurso = (id) => cursos.find((c) => String(cursoId(c)) === String(id));
  const routeName = (id) => {
    const c = findCurso(id);
    if (!c) return 'Desconocido';
    return `${idiomaName(origenId(c), c.idioma_origen || c.idiomaOrigen)} → ${idiomaName(destinoId(c), c.idioma_destino || c.idiomaDestino)}`;
  };
  const flagOf = (id) => resolveMediaUrl(idiomas.find((i) => String(i.idioma_id || i.id) === String(id))?.url_icono_bandera);
  const unidadesOfCurso = (id) => unidads.filter((u) => String(unidadCursoId(u)) === String(id));
  const nextOrder = (id) => (id ? unidadesOfCurso(id).reduce((max, u) => Math.max(max, Number(ordenOf(u)) || 0), 0) + 1 : 1);
  const baseColor = (id) => {
    const first = [...unidadesOfCurso(id)].sort((a, b) => (Number(ordenOf(a)) || 0) - (Number(ordenOf(b)) || 0))[0];
    return first?.color || '#b91c1c';
  };

  const cursoGroups = Object.values(cursos.reduce((groups, c) => {
    const key = groupKey(c);
    groups[key] ??= { key, label: routeName(cursoId(c)) };
    return groups;
  }, {}));
  const groupCursos = selectedGroup
    ? cursos.filter((c) => groupKey(c) === selectedGroup).sort((a, b) => String(a.nivel || 'A1').localeCompare(String(b.nivel || 'A1')))
    : [];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [u, c, i, us] = await Promise.all([getUnidads(), getCursos(), getIdiomas(), getUsuarios()]);
      setUnidads(list(u).sort((a, b) => (ordenOf(a) || 0) - (ordenOf(b) || 0)));
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
  useEffect(() => { setCurrentPage(1); }, [searchTerm, cursoFilter, statusFilter]);

  // Al crear: el orden y el color siguen al curso elegido.
  useEffect(() => {
    if (!isCreate) return;
    const order = nextOrder(selectedCursoId);
    setValue('orden', order, { shouldValidate: true });
    setValue('color', getColorByOrder(baseColor(selectedCursoId), order), { shouldDirty: false });
  }, [selectedCursoId, isCreate, unidads]);

  // Si el nivel elegido no pertenece a la ruta, toma el primero de la ruta.
  useEffect(() => {
    if (!editing || !selectedGroup || groupCursos.length === 0) return;
    if (!groupCursos.some((c) => String(cursoId(c)) === String(selectedCursoId))) {
      setValue('cursos_id', cursoId(groupCursos[0]), { shouldValidate: true });
    }
  }, [editing, selectedGroup, selectedCursoId, cursos]);

  const openForm = (unidad = {}) => {
    const isNew = !unidadId(unidad);
    const saved = isNew ? findCurso(localStorage.getItem(REMEMBER_KEY)) : null;
    const curso = isNew ? saved : findCurso(unidadCursoId(unidad));
    const order = isNew ? nextOrder(cursoId(saved)) : (ordenOf(unidad) || '');
    reset({
      curso_group: curso ? groupKey(curso) : '',
      cursos_id: isNew ? (saved ? cursoId(saved) : '') : unidadCursoId(unidad),
      nombre: unidad.nombre || unidad.titulo || '',
      orden: order,
      color: isNew ? getColorByOrder(baseColor(cursoId(saved)), order) : (unidad.color || DEFAULT_COLOR),
      activo: unidad.estado ? unidad.estado === 'activo' : unidad.activo !== false,
    });
    setImageFile(null);
    setImagePreview(unidad.url_imagen ? resolveMediaUrl(unidad.url_imagen) : null);
    setRememberCourse(Boolean(saved));
    setFormStep(saved ? 2 : 1);
    setEditing(unidad);
  };

  const handleNextStep = async () => {
    if (!(await trigger(['curso_group', 'cursos_id']))) return;
    if (isCreate) setValue('orden', nextOrder(selectedCursoId), { shouldValidate: true });
    setFormStep(2);
  };

  const toggleRemember = async () => {
    if (rememberCourse) {
      setRememberCourse(false);
      localStorage.removeItem(REMEMBER_KEY);
      toast.success('El curso ya no se reutilizará automáticamente.');
      return;
    }
    if (!(await trigger(['curso_group', 'cursos_id']))) return;
    localStorage.setItem(REMEMBER_KEY, String(selectedCursoId));
    setRememberCourse(true);
    toast.success('Curso guardado para reutilizarlo en nuevas unidades.');
  };

  const findUser = (id) => usuarios.find((u) => String(u.id || u.usuarios_id || u.usuario_id) === String(id));
  const handleView = async (unidad) => {
    try {
      const response = await getUnidadById(unidadId(unidad));
      const data = response.data || response;
      data.creado_por ??= data.creado_por_id ? findUser(data.creado_por_id) : undefined;
      data.actualizado_por ??= data.actualizado_por_id ? findUser(data.actualizado_por_id) : undefined;
      setViewing(data);
    } catch {
      toast.error('Error al obtener los detalles de la unidad');
      setViewing(unidad);
    }
  };

  const confirmDelete = async () => {
    const toastId = toast.loading('Eliminando unidad...');
    try {
      await deleteUnidad(unidadId(itemToDelete));
      toast.success('Unidad eliminada exitosamente', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar la unidad', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleToggleEstado = async (unidad) => {
    const isActive = unidad.estado === 'activo';
    const toastId = toast.loading(`${isActive ? 'Desactivando' : 'Activando'} unidad...`);
    try {
      await toggleEstadoUnidad(unidadId(unidad), { estado: isActive ? 'inactivo' : 'activo', actualizado_por_id: currentUserId });
      toast.success(`Unidad ${isActive ? 'desactivada' : 'activada'} exitosamente`, { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado', { id: toastId });
    }
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const confirmSubmit = async () => {
    const data = confirmData;
    const duplicate = unidads.some((u) => String(unidadCursoId(u)) === String(data.cursos_id)
      && String(ordenOf(u)) === String(data.orden)
      && String(unidadId(u)) !== String(unidadId(editing)));
    if (duplicate) {
      toast.error(`Ya existe una unidad con el orden ${data.orden} en este curso.`);
      setConfirmData(null);
      return;
    }

    const toastId = toast.loading(`${isCreate ? 'Creando' : 'Actualizando'} unidad...`);
    try {
      const uploaded = imageFile ? await uploadUnidadImage(imageFile) : null;
      const payload = {
        curso_id: parseInt(data.cursos_id, 10),
        codigo: null,
        nombre: data.nombre,
        orden: parseInt(data.orden, 10),
        color: data.color || null,
        estado: (data.activo ?? true) ? 'activo' : 'inactivo',
        ...(uploaded && { url_imagen: uploaded.url || uploaded.data?.url }),
      };
      if (isCreate) await createUnidad({ ...payload, creado_por_id: currentUserId });
      else await updateUnidad(unidadId(editing), { ...payload, actualizado_por_id: currentUserId });
      toast.success(`Unidad ${isCreate ? 'creada' : 'actualizada'} exitosamente`, { id: toastId });
      setEditing(null);
      setConfirmData(null);
      clearImage();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${isCreate ? 'crear' : 'actualizar'} la unidad`, { id: toastId });
    }
  };

  const filtered = unidads
    .filter((u) => {
      const cid = unidadCursoId(u);
      const textOk = [tituloOf(u), routeName(cid), nivelLabel(findCurso(cid))].some((t) => matchesSearch(t, searchTerm));
      const cursoOk = cursoFilter === 'all' || String(cid) === cursoFilter;
      const statusOk = statusFilter === 'all' || (statusFilter === 'active') === (u.estado === 'activo');
      return textOk && cursoOk && statusOk;
    })
    .sort((a, b) => routeName(unidadCursoId(a)).localeCompare(routeName(unidadCursoId(b)))
      || String(findCurso(unidadCursoId(a))?.nivel || 'A1').localeCompare(String(findCurso(unidadCursoId(b))?.nivel || 'A1'))
      || (Number(ordenOf(a)) || 0) - (Number(ordenOf(b)) || 0));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const visible = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasFilters = Boolean(searchTerm) || cursoFilter !== 'all' || statusFilter !== 'all';

  return (
    <div>
      <PageHeader
        title="Gestión de Unidades"
        description="Administra las unidades y progresión académica de los cursos."
        actions={<button type="button" className="rq-button rq-button--primary" onClick={() => openForm()}>Crear Unidad</button>}
      />

      <div className="rq-toolbar">
        <div className="rq-filter">
          <label htmlFor="unidad-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input id="unidad-search" type="search" placeholder="Saludos, Quechua..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="rq-filter">
          <label>Curso y nivel</label>
          <RimaqSelect
            ariaLabel="Curso y nivel"
            value={cursoFilter}
            onValueChange={setCursoFilter}
            options={[
              { value: 'all', label: 'Todos los cursos y niveles' },
              ...cursos.map((c) => ({ value: String(cursoId(c)), label: `${routeName(cursoId(c))} · ${nivelLabel(c)}` })),
            ]}
          />
        </div>
        <div className="rq-filter">
          <label>Estado de unidad</label>
          <RimaqSelect
            ariaLabel="Estado de unidad"
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: 'all', label: 'Todos los estados' },
              { value: 'active', label: 'Solo activos' },
              { value: 'inactive', label: 'Solo inactivos' },
            ]}
          />
        </div>
      </div>

      <div className="rq-table-card">
        <div className="table-responsive-container">
          <table className="rq-table" aria-busy={loading}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>Orden</th>
                <th>Unidad</th>
                <th>Curso Asociado</th>
                <th>Nivel</th>
                <th>Estado</th>
                <th className="rq-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} aria-hidden="true">
                    {[40, 180, 160, 50, 90, 90].map((w, j) => (
                      <td key={j}><div className="skeleton" style={{ width: w, height: 20, borderRadius: 6 }} /></td>
                    ))}
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan="6" className="rq-empty-cell">
                    <EmptyState
                      icon={ListTree}
                      title={hasFilters ? 'No se encontraron unidades con esos filtros' : 'Aún no hay unidades registradas'}
                      hint={hasFilters ? 'Intenta con otra búsqueda' : 'Crea la primera unidad haciendo clic en "Crear Unidad"'}
                    />
                  </td>
                </tr>
              ) : (
                visible.map((unidad, i) => {
                  const curso = findCurso(unidadCursoId(unidad));
                  const titulo = tituloOf(unidad);
                  const isActive = unidad.estado === 'activo';
                  return (
                    <tr key={unidadId(unidad) || i} className={isActive ? '' : 'is-muted'}>
                      <td><span className="rq-badge">#{ordenOf(unidad)}</span></td>
                      <td>
                        <span className="rq-inline rq-strong">
                          <span className="rq-dot" style={{ backgroundColor: unidad.color || DEFAULT_COLOR }} title={`Color: ${unidad.color || DEFAULT_COLOR}`} />
                          {titulo}
                        </span>
                      </td>
                      <td>
                        <span className="rq-route">
                          <Flag src={flagOf(origenId(curso))} alt="" />
                          {idiomaName(origenId(curso), curso?.idioma_origen || curso?.idiomaOrigen)}
                          <ArrowRight size={14} color="var(--color-outline)" aria-label="hacia" />
                          <Flag src={flagOf(destinoId(curso))} alt="" />
                          <span className="rq-route__target">{idiomaName(destinoId(curso), curso?.idioma_destino || curso?.idiomaDestino)}</span>
                        </span>
                      </td>
                      <td><LevelBadge nivel={curso?.nivel || 'A1'} /></td>
                      <td><StatusSwitch active={isActive} name={titulo} onToggle={() => handleToggleEstado(unidad)} /></td>
                      <td className="rq-col-actions">
                        <div>
                          <button type="button" className="rq-icon-btn" onClick={() => handleView(unidad)} title="Ver detalles" aria-label={`Ver detalles de ${titulo}`}><Eye size={17} /></button>
                          <button type="button" className="rq-icon-btn" onClick={() => openForm(unidad)} title="Editar" aria-label={`Editar ${titulo}`}><Edit2 size={17} /></button>
                          <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => setItemToDelete(unidad)} title="Eliminar" aria-label={`Eliminar ${titulo}`}><Trash2 size={17} /></button>
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
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="unidad-modal-title">
          <div className="modal-content-responsive rq-modal-dialog rq-modal-dialog--wizard">
            <div className="rq-modal-header">
              <h2 id="unidad-modal-title" className="rq-modal-header__title">{isCreate ? 'Crear Nueva Unidad' : 'Editar Unidad'}</h2>
              <button type="button" className="rq-icon-close" onClick={() => setEditing(null)} aria-label="Cerrar modal"><X size={18} /></button>
            </div>

            <form className="rq-wizard-form" onSubmit={(e) => { e.preventDefault(); if (formStep < 2) handleNextStep(); }}>
              <div className="academic-modal-scroll rq-modal-body">
                <WizardProgress currentStep={formStep} steps={STEPS} />

                {formStep === 1 && (
                  <div className="rq-step">
                    <div className="rq-form-grid-2">
                      <div className="rq-field">
                        <label className="rq-field__label">Curso</label>
                        <input type="hidden" {...register('curso_group', { required: 'El curso es requerido' })} />
                        <RimaqSelect
                          ariaLabel="Curso"
                          value={String(selectedGroup || '')}
                          onValueChange={(val) => {
                            setValue('curso_group', val, { shouldValidate: true });
                            setValue('cursos_id', '', { shouldValidate: true });
                          }}
                          placeholder="Seleccione una ruta"
                          options={cursoGroups.map((g) => ({ value: g.key, label: g.label }))}
                          className="rimaq-select--full-width"
                        />
                        {errors.curso_group && <span className="rq-field__error">{errors.curso_group.message}</span>}
                      </div>
                      <div className="rq-field">
                        <label className="rq-field__label">Nivel</label>
                        <input type="hidden" {...register('cursos_id', { required: 'El nivel es requerido' })} />
                        <RimaqSelect
                          ariaLabel="Nivel"
                          value={String(selectedCursoId || '')}
                          onValueChange={(val) => setValue('cursos_id', val, { shouldValidate: true })}
                          placeholder="Seleccione nivel"
                          options={groupCursos.map((c) => ({ value: String(cursoId(c)), label: nivelLabel(c) }))}
                          disabled={!selectedGroup}
                          className="rimaq-select--full-width"
                        />
                        {errors.cursos_id && <span className="rq-field__error">{errors.cursos_id.message}</span>}
                      </div>
                    </div>

                    <div className="rq-setting-row">
                      <div>
                        <strong>Guardar para reutilizar</strong>
                        <span>Recordar este curso en las próximas unidades.</span>
                      </div>
                      <button type="button" role="switch" className="rq-switch" aria-checked={rememberCourse} aria-label="Guardar curso para reutilizar" onClick={toggleRemember} />
                    </div>
                  </div>
                )}

                {formStep === 2 && (
                  <div className="rq-step">
                    <div className="rq-form-row" style={{ gridTemplateColumns: '96px minmax(0, 1fr)' }}>
                      <div className="rq-field">
                        <label htmlFor="unidad-orden-input" className="rq-field__label">Orden</label>
                        <input
                          id="unidad-orden-input"
                          type="number"
                          min="1"
                          {...register('orden', { required: 'El orden es requerido', min: { value: 1, message: 'Debe ser mayor a 0' } })}
                          className={`rq-field__input rq-input-number${errors.orden ? ' rq-field__input--error' : ''}`}
                          placeholder="1"
                        />
                        {errors.orden && <span className="rq-field__error">{errors.orden.message}</span>}
                      </div>
                      <div className="rq-field">
                        <label htmlFor="unidad-nombre-input" className="rq-field__label">Nombre de unidad</label>
                        <input
                          id="unidad-nombre-input"
                          {...register('nombre', { required: 'El nombre es requerido' })}
                          className={`rq-field__input${errors.nombre ? ' rq-field__input--error' : ''}`}
                          placeholder="Saludos y presentación"
                        />
                        {errors.nombre && <span className="rq-field__error">{errors.nombre.message}</span>}
                      </div>
                    </div>

                    <div className="rq-form-row" style={{ gridTemplateColumns: '124px minmax(0, 1fr)' }}>
                      <input type="hidden" {...register('color')} />
                      <ColorPickerField value={watch('color')} onChange={(c) => setValue('color', c, { shouldDirty: true })} fallback={DEFAULT_COLOR} />
                      <div className="rq-field">
                        <label htmlFor="unidad-image-upload" className="rq-field__label">Imagen de unidad</label>
                        <div className="rq-inline">
                          <input ref={imageInputRef} id="unidad-image-upload" type="file" accept="image/*" onChange={onPickImage} hidden />
                          <label htmlFor="unidad-image-upload" className="rq-upload-pill" style={{ flex: 1, minWidth: 0 }}>
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
                                onClick={() => setLightboxImage({ src: imagePreview, alt: watch('nombre') || 'Vista previa de unidad' })}
                                aria-label="Ampliar imagen de unidad"
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
                      <label className="rq-check-card">
                        <input type="checkbox" {...register('activo')} />
                        <div>
                          <strong className="rq-stat__value">Unidad activa</strong>
                          <p className="rq-muted" style={{ margin: 0 }}>Las unidades inactivas no son visibles para los alumnos</p>
                        </div>
                      </label>
                    )}
                  </div>
                )}
              </div>

              <div id="rq-step-form-actions" className="rq-form-actions rq-step-form-actions">
                <button type="button" onClick={() => setEditing(null)}>Cancelar</button>
                <div className="rq-step-form-actions__primary">
                  {formStep === 2 && <button type="button" onClick={() => setFormStep(1)}>Anterior</button>}
                  {formStep === 1
                    ? <button type="button" onClick={handleNextStep}>Continuar</button>
                    : <button type="button" onClick={handleSubmit(setConfirmData)}>{isCreate ? 'Crear Unidad' : 'Guardar cambios'}</button>}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        open={Boolean(itemToDelete)}
        title="¿Eliminar unidad?"
        itemName={itemToDelete ? tituloOf(itemToDelete) : ''}
        onCancel={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={Boolean(confirmData)}
        icon={Save}
        title={isCreate ? '¿Crear esta unidad?' : '¿Guardar cambios?'}
        description={isCreate ? `Crearás la unidad "${confirmData?.nombre}".` : `Se guardarán los cambios de la unidad "${confirmData?.nombre}".`}
        confirmLabel={isCreate ? 'Sí, crear' : 'Sí, guardar'}
        onCancel={() => setConfirmData(null)}
        onConfirm={confirmSubmit}
      />

      {viewing && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="unidad-view-title">
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
                    <span className="rq-overline">Detalles de la Unidad</span>
                    <h2 id="unidad-view-title">{tituloOf(viewing)}</h2>
                  </div>
                </div>
                <button type="button" className="rq-icon-close--on-color" onClick={() => setViewing(null)} aria-label="Cerrar detalles de unidad"><X size={20} strokeWidth={2.5} /></button>
              </div>
            </div>

            <div className="academic-modal-scroll" style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>
              <div className="rq-detail-sheet">
                <div className="rq-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <div className="rq-stat-card">
                    <DetailStat
                      icon={BookOpen}
                      label="Curso asociado"
                      value={<>{routeName(unidadCursoId(viewing))} <span className="rq-badge rq-badge--secondary">{nivelLabel(findCurso(unidadCursoId(viewing)))}</span></>}
                    />
                  </div>
                  <div className="rq-stat-card"><DetailStat icon={ListTree} label="Orden de unidad" value={`#${ordenOf(viewing)}`} /></div>
                  <div className="rq-stat-card"><DetailStat icon={Layers} label="Total sesiones" value={viewing.sesiones?.length || 0} /></div>
                  <div className="rq-stat-card">
                    <DetailStat icon={viewing.url_imagen ? ZoomIn : ImageOff} label="Imagen" value={viewing.url_imagen ? 'Configurada' : 'Por defecto'} />
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
