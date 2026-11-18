import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Volume2, X, Save, Eye, CheckCircle, XCircle, Upload, Image as ImageIcon, FileAudio, Edit2, FileDown, BookA } from 'lucide-react';
import { getPalabras, createPalabra, updatePalabra, updatePalabraStatus, deletePalabra, getCategorias } from '../../services/diccionarioService';
import { getIdiomas } from '../../services/idiomaService';
import { resolveMediaUrl } from '../../services/api';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { matchesSearch } from '../../utils/searchUtils';
import { findIdioma, getIdiomaBandera, getIdiomaNombre, getUserDisplayName, getWordTranslations } from '../../utils/dictionaryViewUtils';
import { generateDictionaryPdf } from '../../utils/dictionaryPdf';
import { DeleteConfirmationModal, ConfirmDialog } from '../../components/DeleteConfirmationModal';
import { WizardProgress } from '../../components/WizardProgress';
import { RimaqSelect } from '../../components/RimaqSelect';
import { ImageLightboxModal } from '../../components/ImageLightboxModal';
import { PageHeader, EmptyState, Pagination } from '../../components/PageKit';
import './Palabras.css';

const ITEMS_PER_PAGE = 10;
const CONTEXT_KEY = 'rimaqmasi:palabra-contexto-borrador';
const STEPS = [
  { label: 'Configuración', description: 'Selecciona el idioma, las categorías y la dificultad.' },
  { label: 'Término y multimedia', description: 'Escribe el término y agrega su imagen y audio.' },
  { label: 'Traducciones', description: 'Agrega una o más acepciones con sus ejemplos de uso.' },
];
const STEP_FIELDS = { 1: ['idiomas_id', 'categorias_ids', 'nivel_dificultad'], 2: ['termino'] };
const ESTADOS = {
  publicado: { label: 'Publicado', tone: 'success' },
  revision: { label: 'En revisión', tone: 'warning' },
  borrador: { label: 'Borrador', tone: 'neutral' },
  archivado: { label: 'Archivado', tone: 'danger' },
};
const EMPTY_BLOCK = { idioma_definicion_id: '', termino_traducido: '', definicion_origen: '', definicion_destino: '', ejemplo_texto: '', traduccion_ejemplo: '' };

const list = (r) => (Array.isArray(r) ? r : r?.data || []);
const palabraId = (p) => p?.palabra_id ?? p?.palabras_id ?? p?.id;
const categoriaId = (c) => String(c.categoria_id ?? c.categorias_vocabulario_id ?? c.categorias_id ?? c.id);
const idiomaKey = (i) => String(i.idioma_id || i.idiomas_id || i.id);
const idiomaLabel = (i) => i.nombre || i.nombres;

const LanguageChip = ({ idioma, compact = false }) => {
  const flag = getIdiomaBandera(idioma);
  return (
    <span className={`lang-chip${compact ? ' lang-chip--compact' : ''}`}>
      {flag
        ? <img src={resolveMediaUrl(flag)} alt="" className="lang-chip__flag" />
        : <span className="lang-chip__flag" aria-hidden="true">{String(idioma?.codigo_iso || '?').slice(0, 2).toUpperCase()}</span>}
      {getIdiomaNombre(idioma, 'Sin idioma')}
    </span>
  );
};

/** Lee la configuración guardada (idioma, categorías, dificultad) para nuevas palabras. */
const readSavedContext = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CONTEXT_KEY) || 'null');
    return saved?.idiomas_id && saved?.categorias_ids?.length && saved?.nivel_dificultad ? saved : null;
  } catch {
    localStorage.removeItem(CONTEXT_KEY);
    return null;
  }
};

/** Convierte las traducciones guardadas de una palabra en bloques del formulario. */
const toTranslationBlocks = (palabra, sourceLanguageId) => (palabra.traduccionesOrigen || palabra.traducciones_origen || []).map((relation) => {
  const destination = relation.palabraDestino || relation.palabra_destino;
  const destId = destination?.idioma_id ?? destination?.idiomas_id ?? destination?.idioma?.idioma_id;
  const sourceDef = (palabra.definiciones || []).find((d) => String(d.idioma_definicion_id) === String(sourceLanguageId));
  const destDef = (destination?.definiciones || []).find((d) => String(d.idioma_definicion_id) === String(destId));
  const example = (palabra.ejemplos || []).find((e) => !e.idioma_significado_id || String(e.idioma_significado_id) === String(destId));
  return {
    traduccion_palabra_id: relation.traduccion_palabra_id || relation.id,
    idioma_definicion_id: String(destId || ''),
    termino_traducido: destination?.termino || '',
    definicion_origen: sourceDef?.definicion || '',
    definicion_destino: destDef?.definicion || '',
    ejemplo_texto: example?.texto_ejemplo || example?.ejemplo_texto || '',
    traduccion_ejemplo: example?.texto_significado || example?.traduccion_ejemplo || '',
  };
});

export const Palabras = () => {
  const navigate = useNavigate();
  const [palabras, setPalabras] = useState([]);
  const [idiomas, setIdiomas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIdioma, setSelectedIdioma] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [categoriaSearch, setCategoriaSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nueva, palabra = edición
  const [currentStep, setCurrentStep] = useState(1);
  const [rememberContext, setRememberContext] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [imagenFile, setImagenFile] = useState(null);
  const audioRef = useRef(null);
  const newAudioUrl = useObjectUrl(audioFile);
  const newImagenUrl = useObjectUrl(imagenFile);

  const { register, handleSubmit, reset, setValue, getValues, watch, control, trigger, formState: { errors } } = useForm({
    defaultValues: { definiciones: [EMPTY_BLOCK] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'definiciones' });
  const sourceLanguageId = watch('idiomas_id');
  const isCreate = editing && !palabraId(editing);
  const audioPreview = newAudioUrl || (editing?.url_audio ? resolveMediaUrl(editing.url_audio) : null);
  const imagenPreview = newImagenUrl || (editing?.url_imagen ? resolveMediaUrl(editing.url_imagen) : null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, i, c] = await Promise.all([getPalabras(selectedIdioma), getIdiomas(), getCategorias()]);
      setPalabras(list(p));
      setIdiomas(list(i));
      setCategorias(list(c));
    } catch {
      toast.error('Error al cargar datos');
      setPalabras([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedIdioma]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedIdioma, selectedEstado, selectedCategoria]);

  const openForm = (palabra = {}) => {
    const isNew = !palabraId(palabra);
    const saved = isNew ? readSavedContext() : null;
    const sourceId = palabra.idioma_id ?? palabra.idiomas_id ?? palabra.idioma?.idioma_id;
    reset(isNew
      ? {
        termino: '',
        idiomas_id: saved?.idiomas_id || '',
        transcripcion_fonetica: '',
        nivel_dificultad: saved?.nivel_dificultad || 1,
        categorias_ids: saved?.categorias_ids || [],
        definiciones: [EMPTY_BLOCK],
      }
      : {
        termino: palabra.termino,
        idiomas_id: String(sourceId || ''),
        transcripcion_fonetica: palabra.transcripcion_fonetica || '',
        nivel_dificultad: palabra.dificultad ?? palabra.nivel_dificultad ?? 1,
        categorias_ids: palabra.categorias?.map(categoriaId) || [],
        definiciones: toTranslationBlocks(palabra, sourceId),
      });
    setAudioFile(null);
    setImagenFile(null);
    setCategoriaSearch('');
    setRememberContext(Boolean(saved));
    setCurrentStep(saved ? 2 : 1);
    setEditing(palabra);
  };

  const saveContext = () => {
    const { idiomas_id, categorias_ids, nivel_dificultad } = getValues();
    if (idiomas_id && categorias_ids?.length && nivel_dificultad) {
      localStorage.setItem(CONTEXT_KEY, JSON.stringify({ idiomas_id, categorias_ids, nivel_dificultad }));
    }
  };

  const toggleRemember = async () => {
    if (rememberContext) {
      localStorage.removeItem(CONTEXT_KEY);
      setRememberContext(false);
      toast.success('La configuración ya no se reutilizará automáticamente.');
      return;
    }
    if (!(await trigger(STEP_FIELDS[1]))) return;
    saveContext();
    setRememberContext(true);
    toast.success('Idioma, categoría y dificultad guardados para las siguientes palabras.');
  };

  const handleNextStep = async () => {
    if (!(await trigger(STEP_FIELDS[currentStep]))) return;
    if (currentStep === 1 && isCreate && rememberContext) saveContext();
    setCurrentStep((s) => s + 1);
  };

  const confirmSubmit = async () => {
    const data = confirmData;
    const toastId = toast.loading(`${isCreate ? 'Creando' : 'Editando'} palabra "${data.termino}"...`);
    try {
      const payload = {
        termino: data.termino,
        idioma_id: parseInt(data.idiomas_id, 10),
        nivel_dificultad: parseInt(data.nivel_dificultad, 10),
        transcripcion_fonetica: data.transcripcion_fonetica,
        categorias_ids: (data.categorias_ids || []).map((id) => parseInt(id, 10)),
        ...(data.definiciones?.length && {
          traducciones: data.definiciones.map((b) => ({
            traduccion_palabra_id: b.traduccion_palabra_id ? parseInt(b.traduccion_palabra_id, 10) : undefined,
            idioma_destino_id: parseInt(b.idioma_definicion_id, 10),
            termino_traducido: b.termino_traducido.trim(),
            definicion_origen: b.definicion_origen?.trim() || data.termino.trim(),
            definicion_destino: b.definicion_destino?.trim() || b.termino_traducido.trim(),
            ejemplo_origen: b.ejemplo_texto?.trim() || undefined,
            ejemplo_traduccion: b.traduccion_ejemplo?.trim() || undefined,
          })),
        }),
        ...(audioFile && { audio: audioFile }),
        ...(imagenFile && { imagen: imagenFile }),
      };
      if (isCreate) await createPalabra(payload);
      else await updatePalabra(palabraId(editing), payload);
      toast.success(`Palabra ${isCreate ? 'creada/enviada a revisión' : 'editada'} exitosamente`, { id: toastId });
      setEditing(null);
      setConfirmData(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar', { id: toastId });
    }
  };

  const confirmDelete = async () => {
    const id = palabraId(itemToDelete);
    if (!id) {
      toast.error('No se pudo identificar la palabra seleccionada');
      setItemToDelete(null);
      return;
    }
    const toastId = toast.loading(`Eliminando "${itemToDelete.termino}"...`);
    try {
      await deletePalabra(id);
      toast.success('Palabra eliminada exitosamente', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleUpdateStatus = async (palabra, estado) => {
    const toastId = toast.loading(`Cambiando estado a ${ESTADOS[estado]?.label.toLowerCase() || estado}...`);
    try {
      await updatePalabraStatus(palabraId(palabra), estado);
      toast.success('Estado actualizado exitosamente', { id: toastId });
      fetchData();
    } catch {
      toast.error('Error al cambiar el estado', { id: toastId });
    }
  };

  const playAudio = (path) => {
    audioRef.current?.pause();
    audioRef.current = new Audio(resolveMediaUrl(path));
    audioRef.current.play().catch(() => toast.error('No se pudo reproducir el audio'));
  };

  const filtered = palabras
    .filter((p) => matchesSearch(p.termino, searchTerm)
      && (!selectedCategoria || p.categorias?.some((c) => categoriaId(c) === String(selectedCategoria)))
      && (!selectedIdioma || String(p.idioma_id ?? p.idiomas_id) === String(selectedIdioma))
      && (!selectedEstado || String(p.estado) === String(selectedEstado)))
    .sort((a, b) => a.termino.localeCompare(b.termino));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const visible = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const visibleCategorias = categorias.filter((c) => matchesSearch(c.nombre, categoriaSearch));

  const handleExportPdf = async () => {
    if (filtered.length === 0) {
      toast.error('No hay palabras para exportar con los filtros seleccionados');
      return;
    }
    const toastId = toast.loading('Generando PDF del diccionario...');
    setIsExportingPdf(true);
    try {
      const fileName = await generateDictionaryPdf({
        palabras: filtered,
        idiomas,
        filtros: {
          idioma: selectedIdioma ? getIdiomaNombre(findIdioma(idiomas, selectedIdioma), 'Idioma seleccionado') : '',
          estado: selectedEstado ? ESTADOS[selectedEstado]?.label || selectedEstado : '',
          categoria: categorias.find((c) => categoriaId(c) === String(selectedCategoria))?.nombre || '',
          busqueda: searchTerm.trim(),
        },
      });
      toast.success(`PDF generado: ${fileName}`, { id: toastId });
    } catch (error) {
      console.error('Error al generar el PDF del diccionario:', error);
      toast.error('No se pudo generar el PDF del diccionario', { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Diccionario"
        description="Gestiona el repertorio de palabras, filtra por idioma y estado, y edita a detalle cada término."
        actions={(
          <>
            <button type="button" className="rq-button rq-button--outline" onClick={handleExportPdf} disabled={isExportingPdf || loading}>
              <FileDown size={18} strokeWidth={2.4} /> {isExportingPdf ? 'Generando...' : 'Exportar PDF'}
            </button>
            <button type="button" className="rq-button rq-button--primary" onClick={() => openForm()}>
              <Plus size={18} strokeWidth={2.5} /> Crear Palabra
            </button>
          </>
        )}
      />

      <div className="rq-toolbar" style={{ gridTemplateColumns: 'minmax(240px, 2fr) repeat(3, minmax(170px, 1fr))' }}>
        <div className="rq-filter">
          <label htmlFor="palabra-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input id="palabra-search" type="search" placeholder="Buscar por término..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="rq-filter">
          <label>Idioma</label>
          <RimaqSelect
            ariaLabel="Filtrar por idioma"
            value={selectedIdioma || '__all__'}
            onValueChange={(val) => setSelectedIdioma(val === '__all__' ? '' : val)}
            options={[{ value: '__all__', label: 'Todos los idiomas' }, ...idiomas.map((i) => ({ value: idiomaKey(i), label: idiomaLabel(i) }))]}
          />
        </div>
        <div className="rq-filter">
          <label>Estado</label>
          <RimaqSelect
            ariaLabel="Filtrar por estado"
            value={selectedEstado || '__all__'}
            onValueChange={(val) => setSelectedEstado(val === '__all__' ? '' : val)}
            options={[{ value: '__all__', label: 'Todos los estados' }, ...Object.entries(ESTADOS).map(([value, e]) => ({ value, label: e.label }))]}
          />
        </div>
        <div className="rq-filter">
          <label>Categoría</label>
          <RimaqSelect
            ariaLabel="Filtrar por categoría"
            value={selectedCategoria || '__all__'}
            onValueChange={(val) => setSelectedCategoria(val === '__all__' ? '' : val)}
            options={[{ value: '__all__', label: 'Todas las categorías' }, ...categorias.map((c) => ({ value: categoriaId(c), label: c.nombre }))]}
          />
        </div>
      </div>

      <div className="rq-table-card">
        <div className="table-responsive-container">
          <table className="rq-table" aria-busy={loading}>
            <thead>
              <tr>
                <th>Término</th>
                <th>Idioma origen</th>
                <th>Traducción</th>
                <th>Creado por</th>
                <th>Fonética</th>
                <th>Categorías</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th className="rq-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} aria-hidden="true">
                    {[120, 100, 180, 120, 80, 100, 80, 90].map((w, j) => (
                      <td key={j}><div className="skeleton" style={{ width: w, height: 20, borderRadius: 6 }} /></td>
                    ))}
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="rq-empty-cell">
                    <EmptyState icon={BookA} title="No se encontraron palabras" hint="Prueba con otros filtros o crea una palabra nueva" />
                  </td>
                </tr>
              ) : (
                visible.map((palabra) => {
                  const id = palabraId(palabra);
                  const estado = ESTADOS[palabra.estado];
                  const traducciones = getWordTranslations(palabra, idiomas);
                  return (
                    <tr key={id}>
                      <td>
                        <span className="rq-inline rq-strong">
                          {palabra.url_imagen && (
                            <button
                              type="button"
                              className="rq-thumb-zoom rq-tile rq-tile--sm"
                              style={{ width: 32, height: 32 }}
                              onClick={() => setLightbox({ src: resolveMediaUrl(palabra.url_imagen), alt: palabra.termino })}
                              aria-label={`Ver imagen de ${palabra.termino}`}
                            >
                              <img src={resolveMediaUrl(palabra.url_imagen)} alt="" crossOrigin="anonymous" />
                            </button>
                          )}
                          {palabra.termino}
                          {palabra.url_audio && (
                            <button type="button" className="rq-icon-btn" onClick={() => playAudio(palabra.url_audio)} aria-label={`Escuchar ${palabra.termino}`} title="Escuchar pronunciación">
                              <Volume2 size={16} />
                            </button>
                          )}
                        </span>
                      </td>
                      <td><LanguageChip idioma={findIdioma(idiomas, palabra.idioma_id || palabra.idiomas_id, palabra.idioma)} /></td>
                      <td style={{ minWidth: 190 }}>
                        {traducciones.length === 0 ? <span className="rq-muted">Sin traducciones</span> : traducciones.map((t) => (
                          <div key={t.key} className="word-translation">
                            <div className="rq-strong">{t.termino}</div>
                            <div className="word-translation__meta">
                              <LanguageChip idioma={t.idioma} compact />
                              <div style={{ marginTop: 6 }}>Traducción creada por: <strong>{getUserDisplayName(t.creadoPor)}</strong></div>
                            </div>
                          </div>
                        ))}
                      </td>
                      <td style={{ minWidth: 150 }}>
                        <div className="rq-cell-stack">
                          <span className="rq-strong" style={{ fontWeight: 600 }}>{getUserDisplayName(palabra.creadoPor || palabra.creado_por)}</span>
                          {palabra.creado_en && <span className="rq-muted">{new Intl.DateTimeFormat('es-PE').format(new Date(palabra.creado_en))}</span>}
                        </div>
                      </td>
                      <td className="rq-muted">{palabra.transcripcion_fonetica || '—'}</td>
                      <td>
                        {palabra.categorias?.length
                          ? <div className="rq-inline" style={{ flexWrap: 'wrap', gap: 4 }}>{palabra.categorias.map((c) => <span key={categoriaId(c)} className="rq-badge" style={{ textTransform: 'none', letterSpacing: 0 }}>{c.nombre}</span>)}</div>
                          : <span className="rq-muted">—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="rq-cell-stack" style={{ alignItems: 'center' }}>
                          <span className={`rq-badge rq-badge--${estado?.tone || 'neutral'}`}>{estado?.label || palabra.estado}</span>
                          {palabra.estado === 'revision' && (
                            <div className="rq-inline" style={{ gap: 2 }}>
                              <button type="button" className="rq-icon-btn rq-icon-btn--success" onClick={() => handleUpdateStatus(palabra, 'publicado')} title="Publicar" aria-label={`Publicar ${palabra.termino}`}><CheckCircle size={18} /></button>
                              <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => handleUpdateStatus(palabra, 'archivado')} title="Archivar" aria-label={`Archivar ${palabra.termino}`}><XCircle size={18} /></button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="rq-col-actions">
                        <div>
                          <button type="button" className="rq-icon-btn" onClick={() => navigate(`/diccionario/palabras/${id}`)} title="Ver detalles" aria-label={`Ver detalles de ${palabra.termino}`}><Eye size={17} /></button>
                          <button type="button" className="rq-icon-btn" onClick={() => openForm(palabra)} title="Editar" aria-label={`Editar ${palabra.termino}`}><Edit2 size={17} /></button>
                          <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => setItemToDelete(palabra)} title="Eliminar" aria-label={`Eliminar ${palabra.termino}`}><Trash2 size={17} /></button>
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
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="word-editor-title">
          <div className="modal-content-responsive rq-modal-dialog rq-modal-dialog--wizard rq-modal-dialog--wide">
            <div className="rq-modal-header">
              <h2 id="word-editor-title" className="rq-modal-header__title">{isCreate ? 'Crear Nueva Palabra' : 'Editar Palabra'}</h2>
              <button type="button" className="rq-icon-close" onClick={() => setEditing(null)} aria-label="Cerrar formulario de palabra"><X size={18} /></button>
            </div>

            <form className="rq-wizard-form" onSubmit={(e) => { e.preventDefault(); if (currentStep < 3) handleNextStep(); }}>
              <div className="academic-modal-scroll rq-modal-body">
                <WizardProgress currentStep={currentStep} steps={STEPS} />

                {currentStep === 1 && (
                  <div className="rq-step">
                    <div className="rq-form-grid-2">
                      <div className="rq-field">
                        <span className="rq-field__label">Idioma</span>
                        <input type="hidden" {...register('idiomas_id', { required: 'Selecciona un idioma' })} />
                        <RimaqSelect
                          ariaLabel="Idioma de la palabra"
                          value={String(sourceLanguageId || '')}
                          onValueChange={(val) => setValue('idiomas_id', val, { shouldValidate: true })}
                          placeholder="Seleccione..."
                          options={idiomas.map((i) => ({ value: idiomaKey(i), label: idiomaLabel(i) }))}
                          className="rimaq-select--full-width"
                        />
                        {errors.idiomas_id && <span className="rq-field__error">{errors.idiomas_id.message}</span>}
                      </div>
                      <div className="rq-field">
                        <label htmlFor="palabra-dificultad" className="rq-field__label">Nivel de dificultad</label>
                        <input
                          id="palabra-dificultad"
                          type="number"
                          min="1"
                          max="5"
                          {...register('nivel_dificultad', { required: 'Indica la dificultad', min: { value: 1, message: 'Mínimo 1' }, max: { value: 5, message: 'Máximo 5' } })}
                          className={`rq-field__input rq-input-number${errors.nivel_dificultad ? ' rq-field__input--error' : ''}`}
                        />
                        {errors.nivel_dificultad && <span className="rq-field__error">{errors.nivel_dificultad.message}</span>}
                      </div>
                    </div>

                    <div className="rq-field">
                      <div className="word-categories__heading">
                        <label htmlFor="word-category-search" className="rq-field__label">Categorías</label>
                        <span className="word-categories__count">{visibleCategorias.length} disponibles</span>
                      </div>
                      <div className="rq-search-box">
                        <Search size={16} aria-hidden="true" />
                        <input id="word-category-search" type="search" placeholder="Buscar categoría..." value={categoriaSearch} onChange={(e) => setCategoriaSearch(e.target.value)} />
                      </div>
                      <div className="word-categories__list">
                        {visibleCategorias.length === 0
                          ? <p className="word-categories__empty">No hay categorías que coincidan.</p>
                          : visibleCategorias.map((c) => (
                            <label className="word-categories__option" key={categoriaId(c)}>
                              <input
                                type="checkbox"
                                value={categoriaId(c)}
                                {...register('categorias_ids', { validate: (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)) || 'Selecciona al menos una categoría' })}
                              />
                              <span>{c.nombre}</span>
                            </label>
                          ))}
                      </div>
                      {errors.categorias_ids && <span className="rq-field__error">{errors.categorias_ids.message}</span>}
                    </div>

                    {isCreate && (
                      <div className="rq-setting-row">
                        <div>
                          <strong>Guardar para reutilizar</strong>
                          <span>Recordar este idioma, categoría y dificultad en las próximas palabras.</span>
                        </div>
                        <button type="button" role="switch" className="rq-switch" aria-checked={rememberContext} aria-label="Guardar configuración para reutilizar" onClick={toggleRemember} />
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="rq-step">
                    <div className="rq-form-grid-2">
                      <div className="rq-field">
                        <label htmlFor="palabra-termino" className="rq-field__label">Término</label>
                        <input id="palabra-termino" {...register('termino', { required: 'Requerido' })} placeholder="Sumaq" className={`rq-field__input${errors.termino ? ' rq-field__input--error' : ''}`} />
                        {errors.termino && <span className="rq-field__error">{errors.termino.message}</span>}
                      </div>
                      <div className="rq-field">
                        <label htmlFor="palabra-fonetica" className="rq-field__label">Transcripción Fonética</label>
                        <input id="palabra-fonetica" {...register('transcripcion_fonetica')} placeholder="/'su.maq/" className="rq-field__input" />
                      </div>
                    </div>

                    <div className="rq-field">
                      <span className="rq-field__label rq-inline" style={{ gap: 6 }}><ImageIcon size={14} aria-hidden="true" /> Imagen Representativa</span>
                      <input id="imagen-upload" type="file" accept="image/*" hidden onChange={(e) => setImagenFile(e.target.files?.[0] || null)} />
                      <div className="rq-upload-card">
                        {imagenPreview ? (
                          <div className="rq-upload-card__preview-row">
                            <button
                              type="button"
                              className="rq-upload-card__thumb rq-thumb-zoom"
                              onClick={() => setLightbox({ src: imagenPreview, alt: watch('termino') || 'Imagen de palabra' })}
                              aria-label="Ampliar imagen representativa"
                            >
                              <img src={imagenPreview} alt="" style={{ objectFit: 'contain' }} />
                              <span className="rq-thumb-zoom__hint"><Eye size={16} /></span>
                            </button>
                            <div className="rq-upload-card__text">
                              <span className="rq-upload-card__title">{imagenFile ? imagenFile.name : 'Imagen cargada'}</span>
                              <span className="rq-upload-card__hint">Haz clic en la miniatura para ampliarla</span>
                            </div>
                            <div className="rq-upload-card__actions">
                              <label htmlFor="imagen-upload" className="rq-button rq-button--ghost rq-button--sm">Cambiar</label>
                            </div>
                          </div>
                        ) : (
                          <label htmlFor="imagen-upload" className="rq-upload-card__empty">
                            <div className="rq-upload-card__info">
                              <div className="rq-upload-card__icon"><Upload size={18} /></div>
                              <div className="rq-upload-card__text">
                                <span className="rq-upload-card__title">Haz clic para subir una imagen</span>
                                <span className="rq-upload-card__hint">PNG, JPG o WEBP</span>
                              </div>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="rq-field">
                      <span className="rq-field__label rq-inline" style={{ gap: 6 }}><FileAudio size={14} aria-hidden="true" /> Audio de Pronunciación (.mp3 o .wav)</span>
                      <input id="audio-upload" type="file" accept="audio/*" hidden onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                      <label htmlFor="audio-upload" className="rq-file-drop">
                        <span className="rq-file-drop__icon"><Volume2 size={16} /></span>
                        <span className={`rq-file-drop__name${audioPreview ? ' is-set' : ''}`}>
                          {audioFile ? audioFile.name : audioPreview ? 'Audio cargado · haz clic para cambiar' : 'Haz clic para subir un audio'}
                        </span>
                      </label>
                      {audioPreview && <audio controls src={audioPreview} className="rq-audio" />}
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="rq-step">
                    <div className="rq-inline" style={{ justifyContent: 'space-between' }}>
                      <h3 className="rq-stat__value" style={{ margin: 0 }}>Traducciones y ejemplos</h3>
                      <button type="button" className="rq-button rq-button--outline rq-button--sm" onClick={() => append(EMPTY_BLOCK)}>
                        <Plus size={14} /> Añadir Traducción
                      </button>
                    </div>

                    {fields.map((item, index) => {
                      const err = errors.definiciones?.[index];
                      return (
                        <section key={item.id} className="word-acepcion" aria-label={`Acepción ${index + 1}`}>
                          {index > 0 && (
                            <button type="button" className="rq-icon-btn rq-icon-btn--danger word-acepcion__remove" onClick={() => remove(index)} aria-label={`Quitar acepción ${index + 1}`}>
                              <X size={16} />
                            </button>
                          )}
                          <h4 className="rq-route__target" style={{ margin: '0 0 4px', fontSize: 14 }}>Acepción {index + 1}</h4>
                          <p className="rq-muted" style={{ margin: '0 0 16px' }}>Una acepción es una traducción posible según el contexto.</p>
                          <div className="rq-form-grid-2">
                            <div className="rq-field">
                              <span className="rq-field__label">Idioma destino <span className="rq-required">*</span></span>
                              <input type="hidden" {...register(`definiciones.${index}.idioma_definicion_id`, { required: 'Requerido' })} />
                              <RimaqSelect
                                ariaLabel={`Idioma destino de la acepción ${index + 1}`}
                                value={String(watch(`definiciones.${index}.idioma_definicion_id`) || '')}
                                onValueChange={(val) => setValue(`definiciones.${index}.idioma_definicion_id`, val, { shouldValidate: true })}
                                placeholder="Seleccione el idioma..."
                                options={idiomas.filter((i) => idiomaKey(i) !== String(sourceLanguageId)).map((i) => ({ value: idiomaKey(i), label: idiomaLabel(i) }))}
                                className="rimaq-select--full-width"
                              />
                              {err?.idioma_definicion_id && <span className="rq-field__error">{err.idioma_definicion_id.message}</span>}
                            </div>
                            <div className="rq-field">
                              <label htmlFor={`termino-traducido-${index}`} className="rq-field__label">Término traducido <span className="rq-required">*</span></label>
                              <input id={`termino-traducido-${index}`} {...register(`definiciones.${index}.termino_traducido`, { required: 'Requerido' })} placeholder="Hermoso" className={`rq-field__input${err?.termino_traducido ? ' rq-field__input--error' : ''}`} />
                              {err?.termino_traducido && <span className="rq-field__error">{err.termino_traducido.message}</span>}
                            </div>
                          </div>

                          {/* Definiciones heredadas: se conservan al editar aunque el formulario ya no las muestre. */}
                          <input type="hidden" {...register(`definiciones.${index}.definicion_origen`)} />
                          <input type="hidden" {...register(`definiciones.${index}.definicion_destino`)} />

                          <div className="word-acepcion__example rq-stack">
                            <div className="rq-field">
                              <label htmlFor={`ejemplo-${index}`} className="rq-field__label">Ejemplo en el idioma original <span className="rq-required">*</span></label>
                              <textarea id={`ejemplo-${index}`} rows={2} {...register(`definiciones.${index}.ejemplo_texto`, { required: 'Agrega un ejemplo para explicar el contexto' })} placeholder="Allinllachu kachkanki?" className={`rq-field__input rq-textarea${err?.ejemplo_texto ? ' rq-field__input--error' : ''}`} />
                              {err?.ejemplo_texto && <span className="rq-field__error">{err.ejemplo_texto.message}</span>}
                            </div>
                            <div className="rq-field">
                              <label htmlFor={`ejemplo-trad-${index}`} className="rq-field__label">Traducción del ejemplo <span className="rq-required">*</span></label>
                              <textarea id={`ejemplo-trad-${index}`} rows={2} {...register(`definiciones.${index}.traduccion_ejemplo`, { required: 'Traduce el ejemplo al idioma destino' })} placeholder="Hola, ¿cómo estás?" className={`rq-field__input rq-textarea${err?.traduccion_ejemplo ? ' rq-field__input--error' : ''}`} />
                              {err?.traduccion_ejemplo && <span className="rq-field__error">{err.traduccion_ejemplo.message}</span>}
                            </div>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>

              <div id="rq-step-form-actions" className="rq-form-actions rq-step-form-actions">
                <button type="button" onClick={() => setEditing(null)}>Cancelar</button>
                <div className="rq-step-form-actions__primary">
                  {currentStep > 1 && <button type="button" onClick={() => setCurrentStep((s) => s - 1)}>Anterior</button>}
                  {currentStep < 3
                    ? <button type="button" onClick={handleNextStep}>Continuar</button>
                    : <button type="button" onClick={handleSubmit(setConfirmData)}>{isCreate ? 'Crear Palabra' : 'Guardar cambios'}</button>}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmData)}
        icon={Save}
        title={isCreate ? '¿Crear palabra?' : '¿Guardar cambios?'}
        description={isCreate ? `Se creará "${confirmData?.termino}" y se enviará a revisión.` : `Se guardarán los cambios de "${confirmData?.termino}".`}
        onCancel={() => setConfirmData(null)}
        onConfirm={confirmSubmit}
      />

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar palabra?" itemName={itemToDelete?.termino} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />

      <ImageLightboxModal src={lightbox?.src} alt={lightbox?.alt} title={lightbox?.alt} onClose={() => setLightbox(null)} />
    </div>
  );
};
