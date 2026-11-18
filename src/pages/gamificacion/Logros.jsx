import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { FastAverageColor } from 'fast-average-color';
import { Search, Plus, Edit2, Trash2, Award, X, ImagePlus, Save, ZoomIn } from 'lucide-react';
import { getLogros, createLogro, updateLogro, deleteLogro } from '../../services/logroService';
import { resolveMediaUrl } from '../../services/api';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal, ConfirmDialog } from '../../components/DeleteConfirmationModal';
import { RimaqSelect } from '../../components/RimaqSelect';
import { ImageLightboxModal } from '../../components/ImageLightboxModal';
import { PageHeader, EmptyState } from '../../components/PageKit';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const METRICAS_LOGRO = [
  { value: 'racha_maxima', label: 'Racha máxima (días)' },
  { value: 'xp_total', label: 'XP total acumulada' },
  { value: 'lecciones_completadas', label: 'Lecciones completadas' },
  { value: 'lecciones_sin_pistas', label: 'Lecciones completadas sin pistas' },
  { value: 'vocabulario_correcto', label: 'Retos de vocabulario correctos' },
  { value: 'gramatica_correcta', label: 'Retos de gramática correctos' },
  { value: 'pronunciacion_correcta', label: 'Retos de pronunciación correctos' },
  { value: 'errores_recuperados', label: 'Errores recuperados al segundo intento' },
];
const METRICA_LABEL = Object.fromEntries(METRICAS_LOGRO.map((m) => [m.value, m.label]));
const XP_RANGES = { low: (xp) => xp <= 50, mid: (xp) => xp > 50 && xp <= 100, high: (xp) => xp > 100 };
const logroId = (l) => l?.logro_id || l?.logros_id || l?.id;

const LogroCard = ({ logro, onEdit, onDelete, onPreviewImage }) => {
  const imageUrl = resolveMediaUrl(logro.url_imagen_medalla);
  const [tint, setTint] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
    setTint(null);
    if (!imageUrl) return;
    new FastAverageColor().getColorAsync(imageUrl, { crossOrigin: 'anonymous' })
      .then((color) => setTint(color.hex))
      .catch(() => {});
  }, [imageUrl]);

  return (
    <article className="rq-card">
      <div className="rq-card__body">
        <div className="rq-card__row">
          {imageUrl && !imgFailed ? (
            <button type="button" className="rq-thumb-zoom rq-tile" onClick={() => onPreviewImage(imageUrl, logro.titulo)} aria-label={`Ampliar medalla ${logro.titulo}`} title="Ampliar medalla">
              <img src={imageUrl} alt={logro.titulo} crossOrigin="anonymous" onError={() => setImgFailed(true)} />
              <span className="rq-thumb-zoom__hint"><ZoomIn size={15} /></span>
            </button>
          ) : (
            <span className="rq-tile" aria-hidden="true" style={tint ? { background: `color-mix(in srgb, ${tint} 16%, var(--color-surface-container))` } : undefined}>
              <Award size={20} />
            </span>
          )}
          <span className="rq-badge rq-badge--warning">+{logro.xp_recompensa} XP</span>
        </div>

        <h3 className="rq-card__title">{logro.titulo}</h3>
        <p className="rq-card__desc">{logro.descripcion}</p>

        <span className="rq-badge rq-badge--secondary" style={{ marginTop: 'auto', width: 'fit-content', textTransform: 'none', letterSpacing: 0 }}>
          {METRICA_LABEL[logro.metrica_requerida] || logro.metrica_requerida}: {logro.valor_requerido}
        </span>
      </div>

      <div className="rq-card__footer">
        <span className="rq-card__meta">ID: {logroId(logro)}</span>
        <div>
          <button type="button" className="rq-text-btn" onClick={() => onEdit(logro)}>Detalles <Edit2 size={12} strokeWidth={3} /></button>
          <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => onDelete(logro)} title="Eliminar" aria-label={`Eliminar logro ${logro.titulo}`}>
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
        <div className="skeleton" style={{ width: 54, height: 20, borderRadius: 6 }} />
      </div>
      <div className="skeleton" style={{ width: '65%', height: 20, borderRadius: 4, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 32, borderRadius: 4, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 110, height: 22, borderRadius: 6 }} />
    </div>
    <div className="rq-card__footer">
      <div className="skeleton" style={{ width: 40, height: 16, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: 80, height: 16, borderRadius: 4 }} />
    </div>
  </div>
);

export const Logros = () => {
  const [logros, setLogros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nuevo, logro = edición
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [metricaFilter, setMetricaFilter] = useState('__all__');
  const [xpFilter, setXpFilter] = useState('__all__');
  const imageInputRef = useRef(null);
  const newImageUrl = useObjectUrl(imageFile);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const isCreate = editing && !logroId(editing);
  const imagePreview = newImageUrl || resolveMediaUrl(editing?.url_imagen_medalla) || null;

  const fetchLogros = async () => {
    try {
      setLoading(true);
      const res = await getLogros();
      setLogros(Array.isArray(res) ? res : res.data || []);
    } catch {
      toast.error('No se pudieron cargar los logros');
      setLogros([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogros();
    register('metrica_requerida', { required: 'La métrica es obligatoria' });
  }, [register]);

  const openForm = (logro = {}) => {
    reset({
      titulo: logro.titulo || '',
      descripcion: logro.descripcion || '',
      metrica_requerida: logro.metrica_requerida || '',
      valor_requerido: logro.valor_requerido ?? 1,
      xp_recompensa: logro.xp_recompensa ?? 50,
    });
    setImageFile(null);
    setEditing(logro);
  };

  const onPickImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('La imagen es demasiado grande. El límite es 5MB.');
      e.target.value = '';
      return;
    }
    setImageFile(file);
  };

  const clearImage = () => {
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const confirmDelete = async () => {
    const toastId = toast.loading(`Eliminando el logro "${itemToDelete.titulo}"...`);
    try {
      await deleteLogro(logroId(itemToDelete));
      toast.success(`Logro "${itemToDelete.titulo}" eliminado exitosamente`, { id: toastId });
      fetchLogros();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar el logro', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const confirmSubmit = async () => {
    const data = confirmData;
    const toastId = toast.loading(`${isCreate ? 'Creando' : 'Actualizando'} logro "${data.titulo}"...`);
    try {
      const payload = {
        ...data,
        valor_requerido: parseInt(data.valor_requerido, 10),
        xp_recompensa: parseInt(data.xp_recompensa, 10),
        ...(imageFile && { imagen: imageFile }),
      };
      if (isCreate) await createLogro(payload);
      else await updateLogro(logroId(editing), payload);
      toast.success(`Logro "${payload.titulo}" ${isCreate ? 'creado' : 'actualizado'} exitosamente`, { id: toastId });
      setEditing(null);
      setConfirmData(null);
      fetchLogros();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${isCreate ? 'crear' : 'actualizar'} el logro`, { id: toastId });
    }
  };

  const filtered = logros.filter((l) => {
    const textOk = matchesSearch(l.titulo, searchTerm) || matchesSearch(l.descripcion, searchTerm);
    const metricaOk = metricaFilter === '__all__' || String(l.metrica_requerida) === String(metricaFilter);
    const xpOk = xpFilter === '__all__' || XP_RANGES[xpFilter](Number(l.xp_recompensa || 0));
    return textOk && metricaOk && xpOk;
  });
  const hasFilters = Boolean(searchTerm) || metricaFilter !== '__all__' || xpFilter !== '__all__';

  return (
    <div>
      <PageHeader
        title="Gestión de Logros"
        description="Administre las medallas y recompensas del sistema."
        actions={<button type="button" className="rq-button rq-button--primary" onClick={() => openForm()}><Plus size={18} strokeWidth={2.5} /> Agregar Nuevo Logro</button>}
      />

      <div className="rq-toolbar" style={{ gridTemplateColumns: 'minmax(240px, 2fr) repeat(2, minmax(200px, 1fr))' }}>
        <div className="rq-filter">
          <label htmlFor="logro-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input id="logro-search" type="search" placeholder="Buscar por título o descripción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="rq-filter">
          <label>Métrica</label>
          <RimaqSelect ariaLabel="Filtrar por métrica requerida" value={metricaFilter} onValueChange={setMetricaFilter} options={[{ value: '__all__', label: 'Todas las métricas' }, ...METRICAS_LOGRO]} />
        </div>
        <div className="rq-filter">
          <label>Recompensa</label>
          <RimaqSelect
            ariaLabel="Filtrar por recompensa XP"
            value={xpFilter}
            onValueChange={setXpFilter}
            options={[
              { value: '__all__', label: 'Todas las recompensas' },
              { value: 'low', label: 'Hasta 50 XP' },
              { value: 'mid', label: '50 a 100 XP' },
              { value: 'high', label: 'Más de 100 XP' },
            ]}
          />
        </div>
      </div>

      <div className="rq-grid" aria-busy={loading}>
        {loading ? (
          Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Award}
            title={hasFilters ? 'No se encontraron logros con esos filtros' : 'Aún no hay logros registrados'}
            hint={hasFilters ? 'Intenta con otra búsqueda' : 'Crea el primer logro haciendo clic en "Agregar Nuevo Logro"'}
          />
        ) : (
          filtered.map((logro, i) => (
            <LogroCard key={logroId(logro) || i} logro={logro} onEdit={openForm} onDelete={setItemToDelete} onPreviewImage={(src, alt) => setLightboxImage({ src, alt })} />
          ))
        )}
      </div>

      {editing && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="logro-modal-title">
          <div className="modal-content-responsive rq-modal-dialog rq-modal-dialog--wizard">
            <div className="rq-modal-header">
              <h2 id="logro-modal-title" className="rq-modal-header__title">{isCreate ? 'Nuevo Logro' : 'Editar Logro'}</h2>
              <button type="button" className="rq-icon-close" onClick={() => setEditing(null)} aria-label="Cerrar modal"><X size={18} /></button>
            </div>

            <form className="rq-wizard-form" onSubmit={handleSubmit(setConfirmData)}>
              <div className="academic-modal-scroll rq-modal-body">
                <div className="rq-stack">
                  <div className="rq-field">
                    <label htmlFor="logro-titulo-input" className="rq-field__label">Título del Logro <span className="rq-required">*</span></label>
                    <input id="logro-titulo-input" {...register('titulo', { required: 'El título es obligatorio' })} placeholder="Primeros Pasos" className={`rq-field__input${errors.titulo ? ' rq-field__input--error' : ''}`} />
                    {errors.titulo && <span className="rq-field__error">{errors.titulo.message}</span>}
                  </div>

                  <div className="rq-field">
                    <label htmlFor="logro-descripcion-input" className="rq-field__label">Descripción <span className="rq-required">*</span></label>
                    <textarea id="logro-descripcion-input" rows={2} {...register('descripcion', { required: 'La descripción es obligatoria' })} placeholder="Describe qué hay que hacer para obtenerlo..." className={`rq-field__input rq-textarea${errors.descripcion ? ' rq-field__input--error' : ''}`} />
                    {errors.descripcion && <span className="rq-field__error">{errors.descripcion.message}</span>}
                  </div>

                  <div className="rq-field">
                    <span className="rq-field__label">Métrica requerida <span className="rq-required">*</span></span>
                    <RimaqSelect
                      ariaLabel="Seleccionar métrica requerida"
                      placeholder="Selecciona una métrica..."
                      value={watch('metrica_requerida') || ''}
                      onValueChange={(val) => setValue('metrica_requerida', val, { shouldValidate: true })}
                      options={METRICAS_LOGRO}
                      className="rimaq-select--full-width"
                    />
                    {errors.metrica_requerida && <span className="rq-field__error">{errors.metrica_requerida.message}</span>}
                  </div>

                  <div className="rq-form-grid-2">
                    <div className="rq-field">
                      <label htmlFor="logro-valor-input" className="rq-field__label">Valor requerido <span className="rq-required">*</span></label>
                      <input id="logro-valor-input" type="number" min="1" {...register('valor_requerido', { required: 'Requerido', min: { value: 1, message: 'Mínimo 1' } })} placeholder="1" className={`rq-field__input rq-input-number${errors.valor_requerido ? ' rq-field__input--error' : ''}`} />
                      {errors.valor_requerido && <span className="rq-field__error">{errors.valor_requerido.message}</span>}
                    </div>
                    <div className="rq-field">
                      <label htmlFor="logro-xp-input" className="rq-field__label">XP de recompensa <span className="rq-required">*</span></label>
                      <input id="logro-xp-input" type="number" min="0" step="5" {...register('xp_recompensa', { required: 'Requerido', min: { value: 0, message: 'Mínimo 0' } })} placeholder="50" className={`rq-field__input rq-input-number${errors.xp_recompensa ? ' rq-field__input--error' : ''}`} />
                      {errors.xp_recompensa && <span className="rq-field__error">{errors.xp_recompensa.message}</span>}
                    </div>
                  </div>

                  <div className="rq-field">
                    <label htmlFor="image-upload" className="rq-field__label">Medalla (imagen)</label>
                    <div className="rq-upload-card">
                      <input ref={imageInputRef} id="image-upload" type="file" accept="image/*" hidden onChange={onPickImage} />
                      {imagePreview ? (
                        <div className="rq-upload-card__preview-row">
                          <button
                            type="button"
                            className="rq-upload-card__thumb rq-thumb-zoom"
                            onClick={() => setLightboxImage({ src: imagePreview, alt: watch('titulo') || 'Vista previa de medalla' })}
                            aria-label="Ampliar vista previa de medalla"
                          >
                            <img src={imagePreview} alt="" style={{ objectFit: 'contain' }} />
                            <span className="rq-thumb-zoom__hint"><ZoomIn size={16} /></span>
                          </button>
                          <div className="rq-upload-card__text">
                            <span className="rq-upload-card__title">{imageFile ? imageFile.name : 'Medalla actual'}</span>
                            <span className="rq-upload-card__hint">PNG, JPG o WEBP · Máx. 5MB</span>
                          </div>
                          <div className="rq-upload-card__actions">
                            <label htmlFor="image-upload" className="rq-button rq-button--ghost rq-button--sm">Cambiar</label>
                            {imageFile && (
                              <button type="button" className="rq-icon-close" onClick={clearImage} aria-label="Quitar imagen seleccionada">
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <label htmlFor="image-upload" className="rq-upload-card__empty">
                          <div className="rq-upload-card__info">
                            <div className="rq-upload-card__icon"><ImagePlus size={20} /></div>
                            <div className="rq-upload-card__text">
                              <span className="rq-upload-card__title">Seleccionar imagen de medalla</span>
                              <span className="rq-upload-card__hint">Recomendado: PNG, JPG o WEBP · Máx. 5MB</span>
                            </div>
                          </div>
                          <span className="rq-button rq-button--ghost rq-button--sm">Subir imagen</span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rq-modal-footer" style={{ flexShrink: 0 }}>
                <button type="button" className="rq-button rq-button--ghost" onClick={() => setEditing(null)}>Cancelar</button>
                <button type="submit" className="rq-button rq-button--primary">{isCreate ? 'Crear Logro' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar logro?" itemName={itemToDelete?.titulo} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />

      <ConfirmDialog
        open={Boolean(confirmData)}
        icon={Save}
        title={isCreate ? `¿Crear ${confirmData?.titulo}?` : '¿Guardar cambios?'}
        description={isCreate ? `Estás a punto de crear el nuevo logro "${confirmData?.titulo}".` : `Estás guardando los cambios del logro "${editing?.titulo}".`}
        confirmLabel={isCreate ? 'Sí, crear' : 'Sí, guardar'}
        onCancel={() => setConfirmData(null)}
        onConfirm={confirmSubmit}
      />

      <ImageLightboxModal src={lightboxImage?.src} alt={lightboxImage?.alt} title={lightboxImage?.alt} onClose={() => setLightboxImage(null)} />
    </div>
  );
};
