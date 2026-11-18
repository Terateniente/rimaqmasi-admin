import React, { useEffect, useState } from 'react';
import { getLogros, createLogro, updateLogro, deleteLogro } from '../../services/logroService';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Award, X, ImagePlus, Save, ZoomIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { FastAverageColor } from 'fast-average-color';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { RimaqSelect } from '../../components/RimaqSelect';
import { ImageLightboxModal } from '../../components/ImageLightboxModal';
import { resolveMediaUrl } from '../../services/api';

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

const LogroCard = ({ logro, getImageUrl, handleOpenEdit, handleDelete, onPreviewImage }) => {
  const [topColor, setTopColor] = useState('var(--color-primary)');
  const [imgFailed, setImgFailed] = useState(false);
  const imageUrl = getImageUrl(logro.url_imagen_medalla);

  useEffect(() => {
    setImgFailed(false);
    if (imageUrl) {
      const fac = new FastAverageColor();
      fac.getColorAsync(imageUrl, { crossOrigin: 'anonymous' })
        .then(color => {
          setTopColor(color.hex);
        })
        .catch(e => {
          console.warn('No se pudo extraer el color de la medalla', e);
          setTopColor('var(--color-primary)');
        });
    } else {
      setTopColor('var(--color-primary)');
    }
  }, [imageUrl]);

  return (
    <div className="rq-card">
      <div className="rq-card__body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
          {imageUrl && !imgFailed ? (
            <button
              type="button"
              className="rq-thumb-zoom"
              style={{ width: '42px', height: '42px', borderRadius: '11px' }}
              onClick={() => onPreviewImage?.(imageUrl, logro.titulo)}
              title="Ampliar medalla"
              aria-label={`Ampliar medalla ${logro.titulo}`}
            >
              <img src={imageUrl} alt={logro.titulo} crossOrigin="anonymous" onError={() => setImgFailed(true)} />
              <span className="rq-thumb-zoom__hint"><ZoomIn size={15} /></span>
            </button>
          ) : (
            <div style={{ 
              width: '42px', height: '42px', 
              borderRadius: '11px', 
              backgroundColor: `color-mix(in srgb, ${topColor} 16%, var(--color-surface-container))`,
              border: `1px solid color-mix(in srgb, ${topColor} 32%, var(--color-outline-variant))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              overflow: 'hidden',
              flexShrink: 0
            }}>
              <span style={{ display: 'flex', color: 'var(--color-primary-text)', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                <Award size={20} />
              </span>
            </div>
          )}

          <span style={{ 
            backgroundColor: 'var(--color-tertiary-container)', 
            color: 'var(--color-on-tertiary-container)', 
            padding: '3px 8px', 
            borderRadius: '6px', 
            fontWeight: 700,
            fontSize: '10px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            +{logro.xp_recompensa} XP
          </span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-on-surface)', fontWeight: 700, lineHeight: 1.3 }}>
            {logro.titulo}
          </h3>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.45, minHeight: '38px', color: 'var(--color-on-surface-variant)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {logro.descripcion}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }}>
          <span style={{ 
            backgroundColor: 'var(--color-secondary-container)', 
            color: 'var(--color-on-secondary-container)', 
            padding: '4px 9px', 
            borderRadius: '6px', 
            fontWeight: 700,
            fontSize: '10.5px',
            letterSpacing: '0.4px',
            textTransform: 'uppercase'
          }}>
            {logro.metrica_requerida}: {logro.valor_requerido}
          </span>
        </div>
      </div>

      <div className="rq-card__footer">
        <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
          ID: {logro.logros_id}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button"
            onClick={() => handleOpenEdit(logro)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary-text)', fontSize: '12px', fontWeight: 700, padding: '4px 6px', borderRadius: '6px' }}
          >
            Detalles <Edit2 size={12} strokeWidth={3} />
          </button>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(logro);
            }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--color-on-surface-variant)', 
              padding: '6px', 
              borderRadius: '6px',
              transition: 'background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-error-container)'; e.currentTarget.style.color = 'var(--color-error-text)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-on-surface-variant)'; }}
            title="Eliminar"
            aria-label="Eliminar logro"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const Logros = () => {
  const [logros, setLogros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [currentId, setCurrentId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [originalLogro, setOriginalLogro] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [metricaFilter, setMetricaFilter] = useState('__all__');
  const [xpFilter, setXpFilter] = useState('__all__');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const getImageUrl = (path) => resolveMediaUrl(path);

  const fetchLogros = async () => {
    try {
      setLoading(true);
      const res = await getLogros();
      const list = Array.isArray(res) ? res : (res.data || []);
      setLogros(list);
    } catch (error) {
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

  const handleOpenCreate = () => {
    setModalMode('create');
    setOriginalLogro(null);
    reset({
      titulo: '',
      descripcion: '',
      metrica_requerida: '',
      valor_requerido: 1,
      xp_recompensa: 50
    });
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (logro) => {
    setModalMode('edit');
    setCurrentId(logro.logros_id || logro.id);
    setOriginalLogro(logro);
    setValue('titulo', logro.titulo);
    setValue('descripcion', logro.descripcion);
    setValue('metrica_requerida', logro.metrica_requerida);
    setValue('valor_requerido', logro.valor_requerido);
    setValue('xp_recompensa', logro.xp_recompensa);
    setImageFile(null);
    setImagePreview(getImageUrl(logro.url_imagen_medalla));
    setIsModalOpen(true);
  };

  const handleDelete = (logro) => {
    setItemToDelete(logro);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const toastId = toast.loading(`Eliminando el logro "${itemToDelete.titulo}"...`);
    try {
      const idToDelete = itemToDelete.logros_id || itemToDelete.id;
      await deleteLogro(idToDelete);
      toast.success(`Logro "${itemToDelete.titulo}" eliminado exitosamente`, { id: toastId });
      fetchLogros();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar el logro', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handlePreSubmit = (data) => {
    setConfirmData(data);
  };

  const confirmSubmit = async () => {
    if (!confirmData) return;
    const data = confirmData;
    const actionName = modalMode === 'create' ? 'Creando' : 'Actualizando';
    const toastId = toast.loading(`${actionName} logro "${data.titulo}"...`);
    try {
      const payload = {
        ...data,
        valor_requerido: parseInt(data.valor_requerido, 10),
        xp_recompensa: parseInt(data.xp_recompensa, 10)
      };

      if (imageFile) {
        payload.imagen = imageFile;
      }

      if (modalMode === 'create') {
        await createLogro(payload);
        toast.success(`Logro "${payload.titulo}" creado exitosamente`, { id: toastId });
      } else {
        await updateLogro(currentId, payload);
        toast.success(`Logro "${payload.titulo}" actualizado exitosamente`, { id: toastId });
      }
      setIsModalOpen(false);
      setConfirmData(null);
      fetchLogros();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} el logro`, { id: toastId });
    }
  };

  const filteredLogros = logros.filter(logro => {
    const matchesQuery = matchesSearch(logro.titulo, searchTerm) || matchesSearch(logro.descripcion, searchTerm);
    const matchesMetrica = metricaFilter === '__all__' || !metricaFilter || String(logro.metrica_requerida) === String(metricaFilter);
    const xp = Number(logro.xp_recompensa || 0);
    const matchesXp = xpFilter === '__all__' || !xpFilter || (
      xpFilter === 'low' ? xp <= 50 :
      xpFilter === 'mid' ? (xp > 50 && xp <= 100) :
      xpFilter === 'high' ? xp > 100 : true
    );
    return matchesQuery && matchesMetrica && matchesXp;
  });

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
      
      {/* Cabecera */}
      <div className="flex-col-mobile" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div className="rq-page-heading">
            <div className="rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">Gestión de Logros</h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Administre las medallas y recompensas del sistema.
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
          <Plus size={18} strokeWidth={2.5} />
          Agregar Nuevo Logro
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="rq-search-box rq-search-field" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={18} strokeWidth={2.5} />
          <input 
            type="text" 
            placeholder="Buscar por título o descripción..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rq-search-field__input"
          />
        </div>

        {/* Filtro por Métrica con RimaqSelect */}
        <div style={{ minWidth: '220px', flex: '0 1 240px' }}>
          <RimaqSelect
            ariaLabel="Filtrar por métrica requerida"
            value={metricaFilter}
            onValueChange={setMetricaFilter}
            options={[
              { value: '__all__', label: 'Todas las Métricas' },
              ...METRICAS_LOGRO
            ]}
          />
        </div>

        {/* Filtro por Recompensa XP con RimaqSelect */}
        <div style={{ minWidth: '180px', flex: '0 1 200px' }}>
          <RimaqSelect
            ariaLabel="Filtrar por recompensa XP"
            value={xpFilter}
            onValueChange={setXpFilter}
            options={[
              { value: '__all__', label: 'Todas las Recompensas' },
              { value: 'low', label: 'Hasta 50 XP' },
              { value: 'mid', label: '50 a 100 XP' },
              { value: 'high', label: 'Más de 100 XP' },
            ]}
          />
        </div>
      </div>

      {/* Grid de Logros */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', 
        gap: '20px' 
      }}>
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rq-card" style={{ minHeight: '198px' }}>
                <div className="rq-card__body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div className="skeleton" style={{ width: '42px', height: '42px', borderRadius: '11px' }}></div>
                    <div className="skeleton" style={{ width: '54px', height: '20px', borderRadius: '6px' }}></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <div className="skeleton" style={{ width: '65%', height: '20px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '100%', height: '16px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '80%', height: '16px', borderRadius: '4px' }}></div>
                  </div>
                  <div className="skeleton" style={{ width: '110px', height: '22px', borderRadius: '6px', marginTop: 'auto' }}></div>
                </div>
                <div className="rq-card__footer">
                  <div className="skeleton" style={{ width: '40px', height: '16px', borderRadius: '4px' }}></div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="skeleton" style={{ width: '60px', height: '16px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '20px', height: '16px', borderRadius: '4px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : filteredLogros.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '64px 32px', color: 'var(--color-outline)' }}>
            <Award size={48} strokeWidth={1.5} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>
              {searchTerm ? 'No se encontraron logros con esa búsqueda' : 'Aún no hay logros registrados'}
            </p>
            <p style={{ fontSize: '13px', margin: 0 }}>
              {searchTerm ? 'Intenta con otra búsqueda' : 'Crea el primer logro haciendo clic en "Agregar Nuevo Logro"'}
            </p>
          </div>
        ) : (
          filteredLogros.map((logro, i) => (
            <LogroCard 
              key={logro.logros_id || logro.id || i}
              logro={logro}
              getImageUrl={getImageUrl}
              handleOpenEdit={handleOpenEdit}
              handleDelete={handleDelete}
              onPreviewImage={(src, alt) => setLightboxImage({ src, alt })}
            />
          ))
        )}
      </div>

      {/* Modal Formulario */}
      {isModalOpen && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="logro-modal-title">
          <div className="modal-content-responsive rq-modal-dialog rq-modal-dialog--wizard">
            <div className="rq-modal-header">
              <h2 id="logro-modal-title" className="rq-modal-header__title">
                {modalMode === 'create' ? 'Nuevo Logro' : 'Editar Logro'}
              </h2>
              <button type="button" className="rq-icon-close" onClick={() => setIsModalOpen(false)} aria-label="Cerrar modal">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(handlePreSubmit)} style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Campo Título */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="logro-titulo-input" className="rq-field__label">Título del Logro</label>
                  <input 
                    id="logro-titulo-input"
                    {...register('titulo', { required: 'El título es obligatorio' })}
                    placeholder="Primeros Pasos"
                    className={`rq-field__input ${errors.titulo ? 'rq-field__input--error' : ''}`}
                  />
                  {errors.titulo && <span className="rq-field__error">{errors.titulo.message}</span>}
                </div>

                {/* Campo Descripción */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label htmlFor="logro-descripcion-input" className="rq-field__label">Descripción</label>
                  <textarea 
                    id="logro-descripcion-input"
                    {...register('descripcion', { required: 'La descripción es obligatoria' })}
                    rows="2"
                    placeholder="Describe qué hay que hacer para obtenerlo..."
                    className={`rq-field__input ${errors.descripcion ? 'rq-field__input--error' : ''}`}
                    style={{ resize: 'vertical', minHeight: '72px' }}
                  />
                  {errors.descripcion && <span className="rq-field__error">{errors.descripcion.message}</span>}
                </div>

                {/* Campos Métrica y Valor */}
                <div className="rq-form-grid-2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                    <label className="rq-field__label">Métrica Requerida *</label>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                    <label htmlFor="logro-valor-input" className="rq-field__label">Valor Requerido</label>
                    <input 
                      id="logro-valor-input"
                      type="number"
                      {...register('valor_requerido', { required: 'Requerido' })}
                      placeholder="1"
                      className={`rq-field__input ${errors.valor_requerido ? 'rq-field__input--error' : ''}`}
                    />
                    {errors.valor_requerido && <span className="rq-field__error">{errors.valor_requerido.message}</span>}
                  </div>
                </div>

                {/* Campo XP Recompensa */}
                <div className="rq-form-grid-2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                    <label htmlFor="logro-xp-input" className="rq-field__label">XP de Recompensa</label>
                    <input 
                      id="logro-xp-input"
                      type="number"
                      {...register('xp_recompensa', { required: 'Requerido' })}
                      placeholder="50"
                      className={`rq-field__input ${errors.xp_recompensa ? 'rq-field__input--error' : ''}`}
                    />
                    {errors.xp_recompensa && <span className="rq-field__error">{errors.xp_recompensa.message}</span>}
                  </div>
                </div>

                {/* Campo Ícono (File Upload) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="rq-field__label">Medalla (Imagen)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {imagePreview ? (
                      <button
                        type="button"
                        className="rq-thumb-zoom"
                        style={{ width: '64px', height: '64px', borderRadius: '12px' }}
                        onClick={() => setLightboxImage({ src: imagePreview, alt: 'Vista previa de medalla' })}
                        title="Haz clic para ampliar"
                        aria-label="Ampliar vista previa de medalla"
                      >
                        <img src={imagePreview} alt="Preview" style={{ objectFit: 'contain' }} />
                        <span className="rq-thumb-zoom__hint"><ZoomIn size={16} /></span>
                      </button>
                    ) : (
                      <div style={{ 
                        width: '64px', height: '64px', borderRadius: '12px', 
                        backgroundColor: 'var(--color-surface-container-low)', 
                        border: '1px dashed var(--color-border-strong)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        <ImagePlus size={22} color="var(--color-outline)" />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('La imagen es demasiado grande. El límite es 5MB.');
                              e.target.value = '';
                              return;
                            }
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        style={{ display: 'none' }}
                        id="image-upload"
                      />
                      <label 
                        htmlFor="image-upload"
                        className="rq-button rq-button--ghost"
                        style={{ minHeight: '38px', padding: '0 14px', fontSize: '13px' }}
                      >
                        Seleccionar Imagen
                      </label>
                      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                        Recomendado: PNG o JPG (máx. 2MB).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', paddingTop: '16px', borderTop: '1px solid var(--color-outline-variant)' }}>
                <button 
                  type="button" 
                  className="rq-button rq-button--ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="rq-button rq-button--primary"
                >
                  {modalMode === 'create' ? 'Crear Logro' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar logro?" itemName={itemToDelete?.titulo} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />

      {/* Modal de Confirmación de Guardar/Crear */}
      {confirmData && (
        <div className="rq-modal-backdrop rq-modal-backdrop--confirm" role="dialog" aria-modal="true">
          <div className="modal-content-responsive rq-modal-dialog" style={{ width: 'min(420px, 100%)', padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ 
              width: '60px', height: '60px', borderRadius: '50%', 
              backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Save size={28} />
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--color-on-surface)' }}>
              {modalMode === 'create' ? `¿Crear ${confirmData.titulo}?` : `¿Guardar cambios?`}
            </h2>
            <p style={{ margin: '0 0 24px 0', color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: '1.5' }}>
              {modalMode === 'create' 
                ? `Estás a punto de crear el nuevo logro "${confirmData.titulo}".` 
                : `Estás guardando los cambios del logro "${originalLogro?.titulo}".`}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button 
                type="button"
                className="rq-button rq-button--ghost"
                onClick={() => setConfirmData(null)}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="rq-button rq-button--primary"
                onClick={confirmSubmit}
              >
                {modalMode === 'create' ? 'Sí, crear' : 'Sí, guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageLightboxModal
        src={lightboxImage?.src}
        alt={lightboxImage?.alt}
        title={lightboxImage?.alt}
        onClose={() => setLightboxImage(null)}
      />

    </div>
  );
};
