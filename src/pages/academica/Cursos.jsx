import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { FastAverageColor } from 'fast-average-color';
import {
  Search, Edit2, Trash2, ArrowRight, X, Save, BookOpen, Calendar, CheckCircle, XCircle,
  Eye, Layers, FileDown, LoaderCircle, ImagePlus, ZoomIn,
} from 'lucide-react';
import { getCursos, getCursoById, createCurso, updateCurso, deleteCurso, toggleEstadoCurso, uploadPortadaCurso } from '../../services/cursoService';
import { getIdiomas } from '../../services/idiomaService';
import { getUsuarios } from '../../services/userService';
import { getUnidadsByCurso } from '../../services/unidadService';
import { getSesionesByUnidad } from '../../services/sesionService';
import { getLeccionesBySesion } from '../../services/leccionService';
import { resolveMediaUrl } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { matchesSearch } from '../../utils/searchUtils';
import { generateCurriculumPdf } from '../../utils/curriculumPdf';
import { DeleteConfirmationModal, ConfirmDialog } from '../../components/DeleteConfirmationModal';
import { WizardProgress } from '../../components/WizardProgress';
import { RimaqSelect } from '../../components/RimaqSelect';
import { ImageLightboxModal } from '../../components/ImageLightboxModal';
import { PageHeader, EmptyState, Pagination, DetailStat, StatusSwitch, AuditPanel } from '../../components/PageKit';

const ITEMS_PER_PAGE = 5;
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const NIVELES = [
  { value: 'A1', label: 'A1 - Básico', grupo: 'Básico' },
  { value: 'A2', label: 'A2 - Básico', grupo: 'Básico' },
  { value: 'B1', label: 'B1 - Intermedio', grupo: 'Intermedio' },
  { value: 'B2', label: 'B2 - Intermedio', grupo: 'Intermedio' },
  { value: 'C1', label: 'C1 - Avanzado', grupo: 'Avanzado' },
  { value: 'C2', label: 'C2 - Avanzado', grupo: 'Avanzado' },
];

const STEPS = (isEdit) => [
  { label: 'Información básica', description: 'Configura el nombre y los idiomas del curso.' },
  { label: 'Nivel académico', description: 'Selecciona la dificultad o nivel del curso.' },
  { label: 'Apariencia y estado', description: isEdit ? 'Añade una portada y define su disponibilidad.' : 'Añade una portada representativa para el curso.' },
];

const STEP_FIELDS = { 1: ['nombre', 'idioma_origen_id', 'idioma_destino_id'], 2: ['nivel'] };
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const normalizeList = (r) => (Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : Array.isArray(r?.data?.data) ? r.data.data : []);
const cursoId = (c) => c.curso_id || c.id;
const idiomaId = (i) => i.idioma_id || i.id;
const idiomaName = (i) => i?.nombres || i?.nombre;
const nivelLabel = (nivel) => NIVELES.find((n) => n.value === nivel)?.label || 'A1 - Básico';
const isoOf = (i) => i?.codigo_iso || idiomaName(i)?.substring(0, 3).toUpperCase() || 'XXX';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
};

const fileSizeLabel = (file) => (file.size >= 1024 * 1024
  ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
  : `${Math.max(1, Math.round(file.size / 1024))} KB`);

const Flag = ({ src, alt }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return <img src={src} alt={alt} className="rq-flag" crossOrigin="anonymous" onError={() => setFailed(true)} />;
};

const CursoCard = ({ curso, idiomas, onView, onEdit, onDelete, onToggleEstado, onExportPdf, isExportingPdf, onPreviewImage }) => {
  const origen = idiomas.find((i) => idiomaId(i) === curso.idioma_origen_id);
  const destino = idiomas.find((i) => idiomaId(i) === curso.idioma_destino_id);
  const flagOrigen = resolveMediaUrl(origen?.url_icono_bandera);
  const flagDestino = resolveMediaUrl(destino?.url_icono_bandera);
  const coverUrl = resolveMediaUrl(curso.url_imagen_portada);
  const name = curso.nombre || 'Sin nombre';
  const isActive = curso.estado === 'activo';
  const [tint, setTint] = useState(null);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => setCoverFailed(false), [curso.url_imagen_portada]);
  useEffect(() => {
    setTint(null);
    if (!flagDestino) return;
    new FastAverageColor().getColorAsync(flagDestino, { crossOrigin: 'anonymous' })
      .then((color) => setTint(color.hex))
      .catch(() => {});
  }, [flagDestino]);

  return (
    <article className={`rq-card${isActive ? '' : ' rq-card--muted'}`}>
      <div className="rq-card__body">
        <div className="rq-card__row">
          {coverUrl && !coverFailed ? (
            <button type="button" className="rq-thumb-zoom rq-tile" onClick={() => onPreviewImage(coverUrl, name)} aria-label={`Ampliar portada de ${name}`} title="Ampliar portada">
              <img src={coverUrl} alt={name} crossOrigin="anonymous" onError={() => setCoverFailed(true)} />
              <span className="rq-thumb-zoom__hint"><ZoomIn size={15} /></span>
            </button>
          ) : (
            <span className="rq-tile" aria-hidden="true" style={tint ? { background: `color-mix(in srgb, ${tint} 16%, var(--color-surface-container))` } : undefined}>
              <BookOpen size={20} />
            </span>
          )}
          <div className="rq-card__badges">
            <span className={`rq-badge rq-badge--${isActive ? 'success' : 'neutral'}`}>
              {isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
              {isActive ? 'Activo' : 'Inactivo'}
            </span>
            <span className="rq-badge rq-badge--secondary">{`${isoOf(origen)}-${isoOf(destino)}-${curso.nivel || 'A1'}`}</span>
          </div>
        </div>

        <h3 className="rq-card__title">{name}</h3>
        <p className="rq-card__desc">{curso.descripcion || `Nivel ${nivelLabel(curso.nivel)}`}</p>

        <div className="rq-lang-pair">
          <div className="rq-lang-pair__side">
            <Flag src={flagOrigen} alt={idiomaName(origen) || 'Origen'} />
            <span>{idiomaName(origen) || 'Desconocido'}</span>
          </div>
          <span className="rq-lang-pair__arrow" role="img" aria-label="hacia"><ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" /></span>
          <div className="rq-lang-pair__side rq-lang-pair__side--target">
            <span>{idiomaName(destino) || '—'}</span>
            <Flag src={flagDestino} alt={idiomaName(destino) || 'Destino'} />
          </div>
        </div>

        <div className="rq-card__date">
          <Calendar size={12} aria-hidden="true" />
          Creado el: {formatDate(curso.creado_en || curso.fecha_creacion)}
        </div>
      </div>

      <div className="rq-card__footer">
        <StatusSwitch active={isActive} name={name} onToggle={() => onToggleEstado(curso)} />
        <div className="rq-card__actions">
          <button
            type="button"
            className="rq-text-btn"
            onClick={() => onExportPdf(curso)}
            disabled={isExportingPdf}
            aria-busy={isExportingPdf}
            title="Descargar malla curricular en PDF"
          >
            {isExportingPdf ? <LoaderCircle size={15} className="spinning" /> : <FileDown size={15} strokeWidth={2.5} />} PDF
          </button>
          <button type="button" className="rq-icon-btn" onClick={() => onView(curso)} title="Ver detalles" aria-label={`Ver detalles de ${name}`}>
            <Eye size={15} strokeWidth={2.25} />
          </button>
          <button type="button" className="rq-icon-btn" onClick={() => onEdit(curso)} title="Editar" aria-label={`Editar ${name}`}>
            <Edit2 size={15} />
          </button>
          <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => onDelete(curso)} title="Eliminar" aria-label={`Eliminar ${name}`}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
};

const CardSkeleton = () => (
  <div className="rq-card" aria-hidden="true">
    <div className="rq-card__body">
      <div className="rq-card__row">
        <div className="skeleton rq-tile" />
        <div className="skeleton" style={{ width: 120, height: 22, borderRadius: 6 }} />
      </div>
      <div className="skeleton" style={{ width: '72%', height: 20, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 32, borderRadius: 6, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 42, borderRadius: 10, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 140, height: 14, borderRadius: 4 }} />
    </div>
    <div className="rq-card__footer">
      <div className="skeleton" style={{ width: 90, height: 22, borderRadius: 999 }} />
      <div className="skeleton" style={{ width: 110, height: 28, borderRadius: 6 }} />
    </div>
  </div>
);

export const Cursos = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.usuarios_id || user?.usuario_id;

  const [cursos, setCursos] = useState([]);
  const [idiomas, setIdiomas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nuevo, curso = edición
  const [currentStep, setCurrentStep] = useState(1);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [portadaFile, setPortadaFile] = useState(null);
  const [portadaPreviewUrl, setPortadaPreviewUrl] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const portadaInputRef = useRef(null);

  const { register, handleSubmit, reset, setValue, trigger, watch, formState: { errors } } = useForm();
  const isCreate = editing && !cursoId(editing);
  const idiomaOptions = idiomas.map((i) => ({ value: String(idiomaId(i)), label: `${idiomaName(i)} (${i.codigo_iso})` }));
  const getIdiomaName = (id) => idiomaName(idiomas.find((i) => String(idiomaId(i)) === String(id))) || 'Desconocido';
  const findUser = (id) => usuarios.find((u) => String(u.id || u.usuario_id || u.usuarios_id) === String(id));

  useEffect(() => {
    if (!portadaFile) { setPortadaPreviewUrl(''); return undefined; }
    const url = URL.createObjectURL(portadaFile);
    setPortadaPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [portadaFile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [c, i, u] = await Promise.all([getCursos(), getIdiomas(), getUsuarios()]);
      setCursos(normalizeList(c));
      setIdiomas(normalizeList(i));
      setUsuarios(normalizeList(u));
    } catch {
      toast.error('No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const openForm = (curso = {}) => {
    reset({
      nombre: curso.nombre || '',
      idioma_origen_id: curso.idioma_origen_id ? String(curso.idioma_origen_id) : '',
      idioma_destino_id: curso.idioma_destino_id ? String(curso.idioma_destino_id) : '',
      nivel: curso.nivel || 'A1',
      activo: cursoId(curso) ? curso.estado === 'activo' : true,
    });
    setPortadaFile(null);
    setCurrentStep(1);
    setEditing(curso);
  };

  const handleNextStep = async () => {
    if (await trigger(STEP_FIELDS[currentStep])) setCurrentStep((s) => s + 1);
  };

  const handleView = async (curso) => {
    try {
      const response = await getCursoById(cursoId(curso));
      const data = response.data || response;
      data.creado_por ??= data.creado_por_id ? findUser(data.creado_por_id) : undefined;
      data.actualizado_por ??= data.actualizado_por_id ? findUser(data.actualizado_por_id) : undefined;
      data.unidades = normalizeList(await getUnidadsByCurso(cursoId(data)));
      setViewing(data);
    } catch {
      toast.error('Error al obtener los detalles del curso');
      setViewing(curso);
    }
  };

  const handleExportPdf = async (curso) => {
    const id = cursoId(curso);
    const toastId = toast.loading('Preparando la malla curricular...');
    setExportingId(id);
    try {
      if (!id) throw new Error('El curso no tiene un identificador válido');
      const [cursoResponse, unidadesResponse] = await Promise.all([getCursoById(id), getUnidadsByCurso(id)]);
      const cursoCompleto = cursoResponse?.data?.data || cursoResponse?.data || cursoResponse || curso;
      const unidades = await Promise.all(normalizeList(unidadesResponse).map(async (unidad) => {
        const unidadId = unidad.unidad_id || unidad.unidads_id || unidad.id;
        if (!unidadId) return { ...unidad, sesiones: [] };
        const sesiones = await Promise.all(normalizeList(await getSesionesByUnidad(unidadId)).map(async (sesion) => {
          const sesionId = sesion.sesion_id || sesion.sesiones_id || sesion.id;
          return { ...sesion, lecciones: sesionId ? normalizeList(await getLeccionesBySesion(sesionId)) : [] };
        }));
        return { ...unidad, url_imagen: resolveMediaUrl(unidad.url_imagen || unidad.imagen), sesiones };
      }));
      const fileName = await generateCurriculumPdf({
        curso: cursoCompleto,
        unidades,
        generatedBy: user,
        portadaUrl: resolveMediaUrl(cursoCompleto.url_imagen_portada),
      });
      toast.success(`PDF generado: ${fileName}`, { id: toastId });
    } catch (error) {
      console.error('Error al generar la malla curricular:', error);
      toast.error(error.response?.data?.message || 'No se pudo generar la malla curricular', { id: toastId });
    } finally {
      setExportingId(null);
    }
  };

  const confirmDelete = async () => {
    const toastId = toast.loading('Eliminando curso...');
    try {
      await deleteCurso(cursoId(itemToDelete));
      toast.success('Curso eliminado exitosamente', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar el curso', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleToggleEstado = async (curso) => {
    const isActive = curso.estado === 'activo';
    const toastId = toast.loading(`${isActive ? 'Desactivando' : 'Activando'} curso...`);
    try {
      await toggleEstadoCurso(cursoId(curso), { estado: isActive ? 'inactivo' : 'activo', actualizado_por_id: currentUserId });
      toast.success(`Curso ${isActive ? 'desactivado' : 'activado'} exitosamente`, { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado', { id: toastId });
    }
  };

  const confirmSubmit = async () => {
    const data = confirmData;
    const toastId = toast.loading(`${isCreate ? 'Creando' : 'Actualizando'} curso...`);
    try {
      const payload = {
        nombre: data.nombre.trim(),
        idioma_origen_id: parseInt(data.idioma_origen_id, 10),
        idioma_destino_id: parseInt(data.idioma_destino_id, 10),
        nivel: data.nivel || 'A1',
        url_imagen_portada: data.url_imagen_portada,
        estado: (data.activo ?? true) ? 'activo' : 'inactivo',
      };
      let savedId = cursoId(editing);
      if (isCreate) {
        const result = await createCurso({ ...payload, creado_por_id: currentUserId });
        savedId = result.data?.curso_id || result.data?.id || result.curso_id || result.id;
        toast.success('Curso creado exitosamente', { id: toastId });
      } else {
        await updateCurso(savedId, { ...payload, actualizado_por_id: currentUserId });
        toast.success('Curso actualizado exitosamente', { id: toastId });
      }
      if (portadaFile && savedId) {
        toast.loading('Subiendo imagen de portada...', { id: toastId });
        await uploadPortadaCurso(savedId, portadaFile);
        toast.success('Portada subida exitosamente', { id: toastId });
      }
      setEditing(null);
      setConfirmData(null);
      setPortadaFile(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${isCreate ? 'crear' : 'actualizar'} el curso`, { id: toastId });
    }
  };

  const onPickCover = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_COVER_BYTES) {
      toast.error('La imagen es demasiado grande. El límite es 5MB.');
      e.target.value = '';
      return;
    }
    setPortadaFile(file);
  };

  const clearCover = () => {
    setPortadaFile(null);
    if (portadaInputRef.current) portadaInputRef.current.value = '';
  };

  const filtered = cursos.filter((c) => {
    const matchesText = [getIdiomaName(c.idioma_origen_id), getIdiomaName(c.idioma_destino_id), c.nombre, nivelLabel(c.nivel)]
      .some((text) => matchesSearch(text, searchTerm));
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active') === (c.estado === 'activo');
    return matchesText && matchesStatus;
  });
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const visible = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasFilters = Boolean(searchTerm) || statusFilter !== 'all';
  const coverPreviewSrc = portadaPreviewUrl || resolveMediaUrl(editing?.url_imagen_portada) || '';
  const langField = (field, label, aria, isTarget = false) => (
    <div className="rq-lang-pair-box__col">
      <label className={`rq-lang-pair-box__label${isTarget ? ' rq-lang-pair-box__label--target' : ''}`}>
        {label} <span className="rq-required">*</span>
      </label>
      <input type="hidden" {...register(field, { required: 'Selecciona un idioma' })} />
      <RimaqSelect
        ariaLabel={aria}
        value={String(watch(field) || '')}
        onValueChange={(val) => setValue(field, val, { shouldValidate: true })}
        placeholder="Selecciona idioma..."
        options={idiomaOptions}
        className="rimaq-select--full-width"
      />
      {errors[field] && <span className="rq-field__error">{errors[field].message}</span>}
    </div>
  );
  const displayName = (c) =>c.nombre || `${getIdiomaName(c.idioma_origen_id)} → ${getIdiomaName(c.idioma_destino_id)}`;

  return (
    <div>
      <PageHeader
        title="Gestión de Cursos"
        description="Administra los pares de idiomas de aprendizaje para la plataforma."
        actions={<button type="button" className="rq-button rq-button--primary" onClick={() => openForm()}>Crear Curso</button>}
      />

      <div className="rq-toolbar">
        <div className="rq-filter">
          <label htmlFor="curso-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input id="curso-search" type="search" placeholder="Buscar por idioma..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="rq-filter">
          <label>Estado de curso</label>
          <RimaqSelect
            ariaLabel="Estado de curso"
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

      <div className="rq-grid" aria-busy={loading}>
        {loading ? (
          Array.from({ length: 3 }, (_, i) => <CardSkeleton key={i} />)
        ) : visible.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={hasFilters ? 'No se encontraron cursos con esos filtros' : 'Aún no hay cursos registrados'}
            hint={hasFilters ? 'Intenta con otra búsqueda' : 'Crea el primer curso haciendo clic en "Crear Curso"'}
          />
        ) : (
          visible.map((curso, i) => (
            <CursoCard
              key={cursoId(curso) || i}
              curso={curso}
              idiomas={idiomas}
              onView={handleView}
              onEdit={openForm}
              onDelete={setItemToDelete}
              onToggleEstado={handleToggleEstado}
              onExportPdf={handleExportPdf}
              isExportingPdf={exportingId === cursoId(curso)}
              onPreviewImage={(src, alt) => setLightboxImage({ src, alt })}
            />
          ))
        )}
      </div>

      <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />

      {editing && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="curso-modal-title">
          <div className="modal-content-responsive rq-modal-dialog rq-modal-dialog--wizard">
            <div className="rq-modal-header">
              <h2 id="curso-modal-title" className="rq-modal-header__title">{isCreate ? 'Crear Nuevo Curso' : 'Editar Curso'}</h2>
              <button type="button" className="rq-icon-close" onClick={() => setEditing(null)} aria-label="Cerrar modal"><X size={18} /></button>
            </div>

            <form
              className="rq-wizard-form"
              onSubmit={(e) => { e.preventDefault(); if (currentStep < 3) handleNextStep(); }}
            >
              <div className="academic-modal-scroll rq-modal-body">
                <WizardProgress currentStep={currentStep} steps={STEPS(!isCreate)} />

                {currentStep === 1 && (
                  <div className="rq-step">
                    <div className="rq-field">
                      <label htmlFor="curso-nombre-input" className="rq-field__label">
                        Nombre visible para estudiantes <span className="rq-required">*</span>
                      </label>
                      <input
                        id="curso-nombre-input"
                        {...register('nombre', { required: 'El nombre del curso es requerido' })}
                        placeholder="Quechua Sureño desde Español"
                        className={`rq-field__input${errors.nombre ? ' rq-field__input--error' : ''}`}
                      />
                      {errors.nombre && <span className="rq-field__error">{errors.nombre.message}</span>}
                    </div>

                    <div className="rq-lang-pair-box">
                      {langField('idioma_origen_id', 'Origen (tu idioma)', 'Idioma de origen')}
                      <div className="rq-lang-pair-box__arrow" aria-hidden="true">
                        <div className="rq-lang-pair-box__badge"><ArrowRight size={18} strokeWidth={2.5} /></div>
                      </div>
                      {langField('idioma_destino_id', 'Destino (a aprender)', 'Idioma de destino', true)}
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="rq-step">
                    <div className="rq-panel">
                      <label className="rq-field__label">Seleccionar Nivel Académico <span className="rq-required">*</span></label>
                      <input type="hidden" {...register('nivel', { required: 'Selecciona un nivel' })} />
                      <RimaqSelect
                        ariaLabel="Seleccionar nivel académico"
                        value={String(watch('nivel') || '')}
                        onValueChange={(val) => setValue('nivel', val, { shouldValidate: true })}
                        placeholder="Selecciona un nivel..."
                        options={NIVELES.map((n) => ({ value: n.value, label: `${n.label} (${n.grupo})` }))}
                        className="rimaq-select--full-width"
                      />
                      {errors.nivel && <span className="rq-field__error">{errors.nivel.message}</span>}
                      <p className="rq-callout" style={{ marginTop: 12 }}>
                        <strong>Tip:</strong> Asegúrate de que el nivel seleccionado coincida con el contenido de las lecciones para proporcionar una experiencia de aprendizaje adecuada.
                      </p>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="rq-step">
                    <div className="rq-field">
                      <label htmlFor="curso-portada-upload" className="rq-field__label">Imagen de Portada (Opcional)</label>
                      <div className="rq-upload-card">
                        <input ref={portadaInputRef} id="curso-portada-upload" type="file" accept="image/*" onChange={onPickCover} hidden />
                        {coverPreviewSrc ? (
                          <div className="rq-upload-card__preview-row">
                            <button
                              type="button"
                              className="rq-upload-card__thumb rq-thumb-zoom"
                              onClick={() => setLightboxImage({ src: coverPreviewSrc, alt: portadaFile ? portadaFile.name : 'Portada del curso' })}
                              aria-label="Ampliar portada del curso"
                            >
                              <img src={coverPreviewSrc} alt="" />
                              <span className="rq-thumb-zoom__hint"><ZoomIn size={18} /></span>
                            </button>
                            <div className="rq-upload-card__text">
                              <span className="rq-upload-card__title">{portadaFile ? portadaFile.name : 'Portada actual del curso'}</span>
                              <span className="rq-upload-card__hint">
                                {portadaFile ? `${fileSizeLabel(portadaFile)} · JPG, PNG, WEBP` : 'Imagen guardada · Formatos: JPG, PNG, WEBP'}
                              </span>
                            </div>
                            <div className="rq-upload-card__actions">
                              <label htmlFor="curso-portada-upload" className="rq-button rq-button--ghost rq-button--sm">Cambiar</label>
                              {portadaFile && (
                                <button type="button" className="rq-icon-close" onClick={clearCover} aria-label="Quitar imagen seleccionada">
                                  <X size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <label htmlFor="curso-portada-upload" className="rq-upload-card__empty">
                            <div className="rq-upload-card__info">
                              <div className="rq-upload-card__icon"><ImagePlus size={20} /></div>
                              <div className="rq-upload-card__text">
                                <span className="rq-upload-card__title">Seleccionar imagen de portada</span>
                                <span className="rq-upload-card__hint">Formatos soportados: JPG, PNG, WEBP · Máx. 5MB</span>
                              </div>
                            </div>
                            <span className="rq-button rq-button--ghost rq-button--sm">Subir imagen</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {!isCreate && (
                      <label htmlFor="activo-checkbox" className="rq-check-card">
                        <input type="checkbox" id="activo-checkbox" {...register('activo')} />
                        <div>
                          <strong className="rq-stat__value">Curso Activo</strong>
                          <p className="rq-muted" style={{ margin: 0 }}>Si está marcado, el curso será visible en la plataforma para los estudiantes.</p>
                        </div>
                      </label>
                    )}
                  </div>
                )}
              </div>

              <div id="rq-step-form-actions" className="rq-form-actions rq-step-form-actions">
                <button type="button" onClick={() => setEditing(null)}>Cancelar</button>
                <div className="rq-step-form-actions__primary">
                  {currentStep > 1 && <button type="button" onClick={() => setCurrentStep((s) => s - 1)}>Anterior</button>}
                  {currentStep < 3
                    ? <button type="button" onClick={handleNextStep}>Continuar</button>
                    : <button type="button" onClick={handleSubmit(setConfirmData)}>{isCreate ? 'Crear Curso' : 'Guardar cambios'}</button>}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        open={Boolean(itemToDelete)}
        title="¿Eliminar curso?"
        itemName={itemToDelete ? displayName(itemToDelete) : ''}
        onCancel={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={Boolean(confirmData)}
        icon={Save}
        title={isCreate ? '¿Crear este curso?' : '¿Guardar cambios?'}
        description={isCreate ? `Crearás el curso "${confirmData?.nombre}".` : `Se guardarán los cambios del curso "${confirmData?.nombre}".`}
        confirmLabel={isCreate ? 'Sí, crear' : 'Sí, guardar'}
        onCancel={() => setConfirmData(null)}
        onConfirm={confirmSubmit}
      />

      {viewing && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="curso-view-title">
          <div className="modal-content-responsive rq-modal-dialog rq-modal-dialog--wizard">
            <div className="rq-modal-header">
              <h2 id="curso-view-title" className="rq-modal-header__title rq-inline">
                <Eye size={20} color="var(--color-primary-text)" aria-hidden="true" /> Detalles del Curso
              </h2>
              <button type="button" className="rq-icon-close" onClick={() => setViewing(null)} aria-label="Cerrar detalles"><X size={18} /></button>
            </div>

            <div className="academic-modal-scroll rq-modal-body rq-stack" style={{ gap: 20 }}>
              <div className="rq-detail-hero">
                <span className="rq-icon-chip rq-icon-chip--lg rq-icon-chip--info" aria-hidden="true"><BookOpen size={24} /></span>
                <div>
                  <span className="rq-overline">Nombre del curso</span>
                  <h3>{displayName(viewing)}</h3>
                  <div className="rq-inline" style={{ flexWrap: 'wrap' }}>
                    <span className="rq-badge">Nivel: {nivelLabel(viewing.nivel)}</span>
                    <span className="rq-muted">{getIdiomaName(viewing.idioma_origen_id)} → {getIdiomaName(viewing.idioma_destino_id)}</span>
                  </div>
                </div>
              </div>

              <hr className="rq-divider" />

              <div className="rq-stats">
                <DetailStat
                  icon={viewing.estado === 'activo' ? CheckCircle : XCircle}
                  tone={viewing.estado === 'activo' ? 'success' : undefined}
                  label="Estado del curso"
                  value={viewing.estado === 'activo' ? 'Activo' : 'Inactivo'}
                />
                <DetailStat icon={BookOpen} label="Nivel" value={nivelLabel(viewing.nivel)} />
                <DetailStat icon={Layers} label="Unidades creadas" value={`${(viewing.unidades || viewing.unidads || []).length} unidades`} />
              </div>

              <hr className="rq-divider" />

              <AuditPanel record={viewing} />
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
