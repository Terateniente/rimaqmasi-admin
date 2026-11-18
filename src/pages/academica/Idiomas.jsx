import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { FastAverageColor } from 'fast-average-color';
import { Search, Plus, Edit2, Trash2, Globe, X, ImagePlus, Save, ZoomIn } from 'lucide-react';
import { getIdiomas, createIdioma, updateIdioma, deleteIdioma, uploadFlag } from '../../services/idiomaService';
import { resolveMediaUrl } from '../../services/api';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal, ConfirmDialog } from '../../components/DeleteConfirmationModal';
import { ImageLightboxModal } from '../../components/ImageLightboxModal';
import { PageHeader, EmptyState, Pagination } from '../../components/PageKit';

const ITEMS_PER_PAGE = 5;
const MAX_FLAG_BYTES = 5 * 1024 * 1024;
const idOf = (idioma) => idioma.idioma_id || idioma.id;
const nameOf = (idioma) => idioma.nombres || idioma.nombre || '';

const IdiomaCard = ({ idioma, onEdit, onDelete, onPreviewImage }) => {
  const flagUrl = resolveMediaUrl(idioma.url_icono_bandera);
  const [tint, setTint] = useState(null);
  const [flagFailed, setFlagFailed] = useState(false);
  const name = nameOf(idioma) || 'Desconocido';

  useEffect(() => {
    setFlagFailed(false);
    setTint(null);
    if (!flagUrl) return;
    new FastAverageColor().getColorAsync(flagUrl, { crossOrigin: 'anonymous' })
      .then((color) => setTint(color.hex))
      .catch(() => setFlagFailed(true));
  }, [flagUrl]);

  return (
    <article className="rq-card">
      <div className="rq-card__body">
        <div className="rq-card__row">
          {flagUrl && !flagFailed ? (
            <button
              type="button"
              className="rq-thumb-zoom rq-tile"
              onClick={() => onPreviewImage(flagUrl, name)}
              title="Ampliar bandera"
              aria-label={`Ampliar bandera de ${name}`}
            >
              <img src={flagUrl} alt={name} crossOrigin="anonymous" onError={() => setFlagFailed(true)} />
              <span className="rq-thumb-zoom__hint"><ZoomIn size={15} /></span>
            </button>
          ) : (
            <span
              className="rq-tile"
              aria-hidden="true"
              style={tint ? { background: `color-mix(in srgb, ${tint} 16%, var(--color-surface-container))` } : undefined}
            >
              {name.charAt(0)}
            </span>
          )}
          <span className="rq-badge rq-badge--secondary">{idioma.codigo_iso}</span>
        </div>
        <h3 className="rq-card__title">{name}</h3>
      </div>

      <div className="rq-card__footer">
        <span className="rq-card__meta">ID: {idioma.idioma_id}</span>
        <div>
          <button type="button" className="rq-text-btn" onClick={() => onEdit(idioma)}>
            Detalles <Edit2 size={12} strokeWidth={3} />
          </button>
          <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => onDelete(idioma)} title="Eliminar" aria-label={`Eliminar ${name}`}>
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
        <div className="skeleton" style={{ width: 36, height: 20, borderRadius: 6 }} />
      </div>
      <div className="skeleton" style={{ width: '65%', height: 20, borderRadius: 6 }} />
    </div>
    <div className="rq-card__footer">
      <div className="skeleton" style={{ width: 40, height: 16, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: 80, height: 16, borderRadius: 4 }} />
    </div>
  </div>
);

export const Idiomas = () => {
  const [idiomas, setIdiomas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nuevo, idioma = edición
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [flagFile, setFlagFile] = useState(null);
  const [flagPreview, setFlagPreview] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const isCreate = editing && !idOf(editing);

  const fetchIdiomas = async () => {
    try {
      setLoading(true);
      const res = await getIdiomas();
      setIdiomas(Array.isArray(res) ? res : (res.data || []));
    } catch {
      toast.error('No se pudieron cargar los idiomas');
      setIdiomas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIdiomas(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const openForm = (idioma = {}) => {
    reset({ nombres: idioma.nombres || '', codigo_iso: idioma.codigo_iso || '', url_icono_bandera: idioma.url_icono_bandera || '' });
    setFlagFile(null);
    setFlagPreview(resolveMediaUrl(idioma.url_icono_bandera) || null);
    setEditing(idioma);
  };

  const onPickFlag = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FLAG_BYTES) {
      toast.error('El archivo es demasiado grande. El límite es 5MB.');
      e.target.value = '';
      return;
    }
    setFlagFile(file);
    setFlagPreview(URL.createObjectURL(file));
  };

  const confirmDelete = async () => {
    const name = itemToDelete.nombres;
    const toastId = toast.loading(`Eliminando el idioma "${name}"...`);
    try {
      await deleteIdioma(idOf(itemToDelete));
      toast.success(`Idioma "${name}" eliminado exitosamente`, { id: toastId });
      fetchIdiomas();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar el idioma', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const confirmSubmit = async () => {
    const data = confirmData;
    const toastId = toast.loading(`${isCreate ? 'Creando' : 'Actualizando'} idioma "${data.nombres}"...`);
    try {
      let url = data.url_icono_bandera || '';
      if (flagFile) {
        const upload = await uploadFlag(flagFile);
        if (upload.success) url = upload.url;
      }
      const payload = { ...data, url_icono_bandera: url };
      if (isCreate) await createIdioma(payload);
      else await updateIdioma(idOf(editing), payload);
      toast.success(`Idioma "${payload.nombres}" ${isCreate ? 'creado' : 'actualizado'} exitosamente`, { id: toastId });
      setEditing(null);
      setConfirmData(null);
      fetchIdiomas();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${isCreate ? 'crear' : 'actualizar'} el idioma`, { id: toastId });
    }
  };

  const filtered = idiomas.filter((i) => matchesSearch(nameOf(i), searchTerm) || matchesSearch(i.codigo_iso, searchTerm));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const visible = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      <PageHeader
        title="Gestión de Idiomas"
        description="Administre la oferta lingüística de Rimaqmasi Edu, configurando códigos ISO y representaciones visuales."
        actions={(
          <button type="button" className="rq-button rq-button--primary" onClick={() => openForm()}>
            <Plus size={18} strokeWidth={2.5} /> Agregar Nuevo Idioma
          </button>
        )}
      />

      <div className="rq-toolbar">
        <div className="rq-filter">
          <label htmlFor="idioma-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input
              id="idioma-search"
              type="search"
              placeholder="Buscar por nombre o código ISO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rq-grid" aria-busy={loading}>
        {loading ? (
          Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Globe}
            title={searchTerm ? 'No se encontraron idiomas con esa búsqueda' : 'Aún no hay idiomas registrados'}
            hint={searchTerm ? 'Intenta con otra búsqueda' : 'Crea el primer idioma haciendo clic en "Agregar Nuevo Idioma"'}
          />
        ) : (
          visible.map((idioma, i) => (
            <IdiomaCard
              key={idOf(idioma) || i}
              idioma={idioma}
              onEdit={openForm}
              onDelete={setItemToDelete}
              onPreviewImage={(src, alt) => setLightboxImage({ src, alt })}
            />
          ))
        )}
      </div>

      <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />

      {editing && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="idioma-modal-title">
          <div className="modal-content-responsive rq-modal-dialog">
            <div className="rq-modal-header">
              <h2 id="idioma-modal-title" className="rq-modal-header__title">{isCreate ? 'Nuevo Idioma' : 'Editar Idioma'}</h2>
              <button type="button" className="rq-icon-close" onClick={() => setEditing(null)} aria-label="Cerrar modal">
                <X size={18} />
              </button>
            </div>

            <form className="rq-form" onSubmit={handleSubmit(setConfirmData)}>
              <div className="rq-stack">
                <div className="rq-field">
                  <label htmlFor="idioma-nombre-input" className="rq-field__label">Nombre del Idioma</label>
                  <input
                    id="idioma-nombre-input"
                    {...register('nombres', { required: 'El nombre es obligatorio' })}
                    placeholder="Portugués"
                    className={`rq-field__input${errors.nombres ? ' rq-field__input--error' : ''}`}
                  />
                  {errors.nombres && <span className="rq-field__error">{errors.nombres.message}</span>}
                </div>

                <div className="rq-field">
                  <label htmlFor="idioma-iso-input" className="rq-field__label">Código ISO</label>
                  <input
                    id="idioma-iso-input"
                    {...register('codigo_iso', { required: 'El código ISO es obligatorio' })}
                    placeholder="pt"
                    className={`rq-field__input${errors.codigo_iso ? ' rq-field__input--error' : ''}`}
                  />
                  {errors.codigo_iso && <span className="rq-field__error">{errors.codigo_iso.message}</span>}
                </div>

                <div className="rq-field">
                  <span className="rq-field__label">Ícono / Bandera</span>
                  <div className="rq-card__row" style={{ alignItems: 'center', justifyContent: 'flex-start', marginBottom: 0 }}>
                    {flagPreview ? (
                      <button
                        type="button"
                        className="rq-thumb-zoom rq-tile rq-tile--lg"
                        onClick={() => setLightboxImage({ src: flagPreview, alt: 'Vista previa de bandera' })}
                        aria-label="Ampliar vista previa de bandera"
                      >
                        <img src={flagPreview} alt="" />
                        <span className="rq-thumb-zoom__hint"><ZoomIn size={16} /></span>
                      </button>
                    ) : (
                      <span className="rq-tile rq-tile--lg rq-tile--dashed"><ImagePlus size={22} /></span>
                    )}
                    <div className="rq-stack" style={{ gap: 8 }}>
                      <input type="file" accept="image/*" onChange={onPickFlag} id="flag-upload" hidden />
                      <label htmlFor="flag-upload" className="rq-button rq-button--ghost">Seleccionar Imagen</label>
                      <p className="rq-field__hint">Recomendado: PNG o JPG (máx. 5MB).</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rq-form__actions">
                <button type="button" className="rq-button rq-button--ghost" onClick={() => setEditing(null)}>Cancelar</button>
                <button type="submit" className="rq-button rq-button--primary">{isCreate ? 'Crear Idioma' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        open={Boolean(itemToDelete)}
        title="¿Eliminar idioma?"
        itemName={itemToDelete && nameOf(itemToDelete)}
        onCancel={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={Boolean(confirmData)}
        icon={Save}
        title={isCreate ? `¿Crear ${confirmData?.nombres}?` : '¿Guardar cambios?'}
        description={isCreate
          ? `Estás a punto de crear el nuevo idioma "${confirmData?.nombres}".`
          : `Estás cambiando el idioma "${editing?.nombres}" por "${confirmData?.nombres}".`}
        confirmLabel={isCreate ? 'Sí, crear' : 'Sí, guardar'}
        onCancel={() => setConfirmData(null)}
        onConfirm={confirmSubmit}
      />

      <ImageLightboxModal
        src={lightboxImage?.src}
        alt={lightboxImage?.alt}
        title={lightboxImage?.alt}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
};
