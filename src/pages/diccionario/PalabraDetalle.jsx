import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useFieldArray, useForm } from 'react-hook-form';
import { ArrowLeft, Volume2, Plus, Trash2, BookType, MessageSquareQuote, FileAudio, Upload, ImagePlus, X, Star, Languages, CalendarDays, ShieldCheck, UserRound } from 'lucide-react';
import { getPalabraById, updatePalabra, updatePalabraAudio } from '../../services/diccionarioService';
import { getIdiomas } from '../../services/idiomaService';
import { resolveMediaUrl } from '../../services/api';
import { findIdioma, getIdiomaBandera, getIdiomaId, getIdiomaNombre, getUserDisplayName, getWordTranslations } from '../../utils/dictionaryViewUtils';
import { ModernPageSkeleton } from '../../components/ModernPageSkeleton';
import { RimaqSelect } from '../../components/RimaqSelect';
import { ImageLightboxModal } from '../../components/ImageLightboxModal';
import { EmptyState } from '../../components/PageKit';
import './Palabras.css';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EMPTY_TRANSLATION = { idioma_destino_id: '', termino_traducido: '', ejemplo_origen: '', ejemplo_traduccion: '' };
const ESTADOS = {
  publicado: { label: 'Publicado', tone: 'success' },
  revision: { label: 'En revisión', tone: 'warning' },
  borrador: { label: 'Borrador', tone: 'neutral' },
  archivado: { label: 'Archivado', tone: 'danger' },
};
const formatDate = (value) => new Intl.DateTimeFormat('es-PE').format(new Date(value));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const Flag = ({ idioma, large = false }) => {
  const flag = getIdiomaBandera(idioma);
  return flag
    ? <img src={resolveMediaUrl(flag)} alt="" className="lang-chip__flag" style={large ? { width: 30, height: 21 } : undefined} />
    : <Languages size={18} aria-hidden="true" />;
};

export const PalabraDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [palabra, setPalabra] = useState(null);
  const [idiomas, setIdiomas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [languageFilter, setLanguageFilter] = useState('');
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [showImage, setShowImage] = useState(false);
  const audioRef = useRef(null);

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { traducciones: [EMPTY_TRANSLATION] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'traducciones' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [p, i] = await Promise.all([getPalabraById(id), getIdiomas()]);
      setPalabra(p.data || p);
      setIdiomas(i.data || i || []);
    } catch {
      toast.error('Error al cargar la palabra');
      navigate('/diccionario/palabras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const openTranslationModal = () => {
    reset({ traducciones: [EMPTY_TRANSLATION] });
    setIsTranslationModalOpen(true);
  };

  const handleAddTranslations = async (data) => {
    const toastId = toast.loading('Guardando traducciones...');
    try {
      await updatePalabra(id, {
        idioma_id: Number(palabra.idioma_id || palabra.idiomas_id),
        traducciones: data.traducciones.map((t) => ({
          idioma_destino_id: Number(t.idioma_destino_id),
          termino_traducido: t.termino_traducido.trim(),
          definicion_origen: palabra.termino.trim(),
          definicion_destino: t.termino_traducido.trim(),
          ejemplo_origen: t.ejemplo_origen.trim(),
          ejemplo_traduccion: t.ejemplo_traduccion.trim(),
        })),
      });
      toast.success(data.traducciones.length === 1 ? 'Traducción añadida' : 'Traducciones añadidas', { id: toastId });
      setIsTranslationModalOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudieron guardar las traducciones', { id: toastId });
    }
  };

  const handleUploadAudio = async (e) => {
    e.preventDefault();
    if (!audioFile) return toast.error('Selecciona un archivo');
    const toastId = toast.loading('Subiendo audio...');
    try {
      await updatePalabraAudio(id, audioFile);
      toast.success('Audio actualizado', { id: toastId });
      setIsAudioModalOpen(false);
      setAudioFile(null);
      fetchData();
    } catch {
      toast.error('Error al subir audio', { id: toastId });
    }
  };

  const handleUploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) {
      toast.error(file.type.startsWith('image/') ? 'La imagen no puede superar los 5 MB' : 'Selecciona un archivo de imagen válido');
      return;
    }
    const hadImage = Boolean(palabra.url_imagen);
    const toastId = toast.loading(hadImage ? 'Actualizando imagen...' : 'Agregando imagen...');
    try {
      await updatePalabra(id, { imagen: file });
      toast.success(hadImage ? 'Imagen actualizada' : 'Imagen agregada', { id: toastId });
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo guardar la imagen', { id: toastId });
    }
  };

  const playAudio = (path) => {
    audioRef.current?.pause();
    audioRef.current = new Audio(resolveMediaUrl(path));
    audioRef.current.play().catch(() => toast.error('No se pudo reproducir el audio'));
  };

  if (loading || !palabra) return <div><ModernPageSkeleton cards={3} /></div>;

  const sourceLanguageId = palabra.idioma_id || palabra.idiomas_id;
  const idioma = findIdioma(idiomas, sourceLanguageId, palabra.idioma);
  const traducciones = getWordTranslations(palabra, idiomas);
  const translationLanguages = traducciones
    .map((t) => t.idioma)
    .filter((item, index, all) => item && index === all.findIndex((c) => String(getIdiomaId(c)) === String(getIdiomaId(item))));
  const visibleTranslations = languageFilter
    ? traducciones.filter((t) => String(getIdiomaId(t.idioma)) === String(languageFilter))
    : traducciones;
  const ejemplos = palabra.ejemplos || [];
  const dificultad = palabra.dificultad || palabra.nivel_dificultad || 1;
  const estado = ESTADOS[palabra.estado];
  const imageUrl = resolveMediaUrl(palabra.url_imagen);

  return (
    <div>
      <Link to="/diccionario/palabras" className="rq-text-btn" style={{ marginBottom: 20 }}>
        <ArrowLeft size={16} aria-hidden="true" /> Volver a Palabras
      </Link>

      <section className="rq-surface-card word-hero">
        <div className="word-hero__main">
          {imageUrl ? (
            <button type="button" className="rq-thumb-zoom word-hero__image" onClick={() => setShowImage(true)} aria-label={`Ampliar imagen de ${palabra.termino}`}>
              <img src={imageUrl} alt="" />
            </button>
          ) : (
            <span className="word-hero__image word-hero__image--empty" aria-hidden="true"><BookType size={38} /></span>
          )}

          <div className="rq-stack" style={{ gap: 12, minWidth: 0 }}>
            <div className="rq-page-heading" style={{ flexWrap: 'wrap' }}>
              <span className="rq-page-heading__accent" aria-hidden="true" />
              <h1 className="rq-page-heading__title">{palabra.termino}</h1>
              {palabra.url_audio && (
                <button type="button" className="rq-icon-btn word-hero__play" onClick={() => playAudio(palabra.url_audio)} aria-label={`Escuchar ${palabra.termino}`} title="Escuchar pronunciación">
                  <Volume2 size={20} />
                </button>
              )}
              <span className={`rq-badge rq-badge--${estado?.tone || 'neutral'}`}>{estado?.label || palabra.estado}</span>
            </div>

            <div className="rq-inline" style={{ flexWrap: 'wrap', gap: 12 }}>
              <span className="lang-chip word-hero__lang">
                <Flag idioma={idioma} large />
                {getIdiomaNombre(idioma)}
                {idioma?.codigo_iso && <span className="rq-muted" style={{ textTransform: 'uppercase' }}>{idioma.codigo_iso}</span>}
              </span>
              <span className="rq-muted" style={{ fontSize: 14 }}><strong>Fonética:</strong> {palabra.transcripcion_fonetica || 'No registrada'}</span>
            </div>

            <div className="rq-inline" style={{ flexWrap: 'wrap' }}>
              <span className="rq-inline" style={{ gap: 2 }} role="img" aria-label={`Dificultad ${dificultad} de 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={17} className={n <= dificultad ? 'word-star is-on' : 'word-star'} aria-hidden="true" />
                ))}
              </span>
              <span className="rq-muted">{dificultad}/5</span>
              {(palabra.categorias || []).map((c, i) => (
                <span key={c.categoria_id || c.id || i} className="rq-badge rq-badge--primary" style={{ textTransform: 'none', letterSpacing: 0 }}>{c.nombre}</span>
              ))}
            </div>
          </div>
        </div>

        <aside className="word-hero__side">
          <input id="word-image-upload" type="file" accept="image/*" hidden onChange={handleUploadImage} />
          <label htmlFor="word-image-upload" className="rq-button rq-button--ghost rq-button--sm" style={{ width: '100%' }}>
            <ImagePlus size={14} /> {palabra.url_imagen ? 'Cambiar imagen' : 'Agregar imagen'}
          </label>
          <button type="button" className="rq-button rq-button--ghost rq-button--sm" onClick={() => setIsAudioModalOpen(true)}>
            <Upload size={14} /> Cambiar audio
          </button>
          <ul className="word-hero__facts">
            <li><ShieldCheck size={14} aria-hidden="true" /> {plural(traducciones.length, 'traducción', 'traducciones')}</li>
            <li><MessageSquareQuote size={14} aria-hidden="true" /> {plural(ejemplos.length, 'ejemplo', 'ejemplos')}</li>
            <li><UserRound size={14} aria-hidden="true" /> Creado por: {getUserDisplayName(palabra.creadoPor || palabra.creado_por)}</li>
            {palabra.creado_en && <li><CalendarDays size={14} aria-hidden="true" /> {formatDate(palabra.creado_en)}</li>}
          </ul>
        </aside>
      </section>

      <section className="rq-surface-card" style={{ padding: 20, marginTop: 24 }} aria-labelledby="traducciones-title">
        <div className="rq-page-header" style={{ marginBottom: 16, alignItems: 'center' }}>
          <div>
            <h2 id="traducciones-title" className="rq-stat__value" style={{ fontSize: 18, margin: 0 }}>Traducciones disponibles</h2>
            <p className="rq-muted" style={{ margin: '4px 0 0' }}>Cada acepción reúne una traducción y su ejemplo de uso.</p>
          </div>
          <div className="rq-page-header__actions">
            <div style={{ minWidth: 200 }}>
              <RimaqSelect
                ariaLabel="Filtrar traducciones por idioma"
                value={languageFilter || '__all__'}
                onValueChange={(val) => setLanguageFilter(val === '__all__' ? '' : val)}
                options={[
                  { value: '__all__', label: 'Todos los idiomas' },
                  ...translationLanguages.map((l) => ({ value: String(getIdiomaId(l)), label: getIdiomaNombre(l) })),
                ]}
              />
            </div>
            <button type="button" className="rq-button rq-button--primary" onClick={openTranslationModal}><Plus size={16} /> Añadir traducción</button>
          </div>
        </div>

        {visibleTranslations.length === 0 ? (
          <EmptyState icon={Languages} title="No hay traducciones registradas para este idioma" />
        ) : (
          <div className="rq-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {visibleTranslations.map((t) => (
              <article key={t.key} className="word-translation" style={{ padding: 20 }}>
                <span className="lang-chip"><Flag idioma={t.idioma} /> <span className="rq-muted" style={{ fontWeight: 700 }}>{getIdiomaNombre(t.idioma)}</span></span>
                <span className="rq-overline" style={{ marginTop: 12 }}>Traducción</span>
                <p className="word-translation__term">{t.termino}</p>
                <p className="word-translation__meta" style={{ margin: 0 }}>
                  Creada por <strong>{getUserDisplayName(t.creadoPor)}</strong>{t.creadoEn && <> · {formatDate(t.creadoEn)}</>}
                </p>
                {t.ejemplos?.length > 0 && (
                  <div className="word-translation__meta">
                    <span className="rq-overline" style={{ marginBottom: 6 }}>Ejemplos de uso</span>
                    {t.ejemplos.map((ex, i) => (
                      <blockquote key={ex.ejemplo_id || ex.id || i} className="word-example">
                        <p className="rq-strong" style={{ margin: 0 }}>“{ex.texto_ejemplo || ex.ejemplo_texto}”</p>
                        {(ex.texto_significado || ex.traduccion_ejemplo) && <p style={{ margin: '3px 0 0' }}>{ex.texto_significado || ex.traduccion_ejemplo}</p>}
                      </blockquote>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {isTranslationModalOpen && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="translation-modal-title">
          <div className="modal-content-responsive rq-modal-dialog rq-modal-dialog--wizard rq-modal-dialog--wide">
            <div className="rq-modal-header">
              <div>
                <h2 id="translation-modal-title" className="rq-modal-header__title">Añadir traducciones</h2>
                <p className="rq-muted" style={{ margin: '4px 0 0' }}>Agrega una o más acepciones con sus ejemplos de uso.</p>
              </div>
              <button type="button" className="rq-icon-close" onClick={() => setIsTranslationModalOpen(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <form className="rq-wizard-form" onSubmit={handleSubmit(handleAddTranslations)}>
              <div className="academic-modal-scroll rq-modal-body rq-stack">
                {fields.map((field, index) => {
                  const err = errors.traducciones?.[index];
                  return (
                    <section key={field.id} className="word-acepcion" aria-label={`Acepción ${index + 1}`}>
                      {fields.length > 1 && (
                        <button type="button" className="rq-icon-btn rq-icon-btn--danger word-acepcion__remove" onClick={() => remove(index)} aria-label={`Quitar acepción ${index + 1}`}>
                          <Trash2 size={15} />
                        </button>
                      )}
                      <h3 className="rq-route__target" style={{ margin: '0 0 4px', fontSize: 15 }}>Acepción {index + 1}</h3>
                      <p className="rq-muted" style={{ margin: '0 0 14px' }}>Una traducción posible según el contexto.</p>
                      <div className="rq-form-grid-2">
                        <div className="rq-field">
                          <span className="rq-field__label">Idioma destino <span className="rq-required">*</span></span>
                          <input type="hidden" {...register(`traducciones.${index}.idioma_destino_id`, { required: 'Selecciona un idioma' })} />
                          <RimaqSelect
                            ariaLabel={`Idioma destino de la acepción ${index + 1}`}
                            value={String(watch(`traducciones.${index}.idioma_destino_id`) || '')}
                            onValueChange={(val) => setValue(`traducciones.${index}.idioma_destino_id`, val, { shouldValidate: true })}
                            placeholder="Seleccione..."
                            options={idiomas
                              .filter((l) => String(getIdiomaId(l)) !== String(sourceLanguageId))
                              .map((l) => ({ value: String(getIdiomaId(l)), label: getIdiomaNombre(l) }))}
                            className="rimaq-select--full-width"
                          />
                          {err?.idioma_destino_id && <span className="rq-field__error">{err.idioma_destino_id.message}</span>}
                        </div>
                        <div className="rq-field">
                          <label htmlFor={`trad-termino-${index}`} className="rq-field__label">Término traducido <span className="rq-required">*</span></label>
                          <input id={`trad-termino-${index}`} {...register(`traducciones.${index}.termino_traducido`, { required: 'Escribe la traducción' })} placeholder="Perro" className={`rq-field__input${err?.termino_traducido ? ' rq-field__input--error' : ''}`} />
                          {err?.termino_traducido && <span className="rq-field__error">{err.termino_traducido.message}</span>}
                        </div>
                      </div>
                      <div className="word-acepcion__example rq-stack">
                        <div className="rq-field">
                          <label htmlFor={`trad-ejemplo-${index}`} className="rq-field__label">Ejemplo en el idioma original <span className="rq-required">*</span></label>
                          <textarea id={`trad-ejemplo-${index}`} rows={2} {...register(`traducciones.${index}.ejemplo_origen`, { required: 'Agrega un ejemplo de uso' })} placeholder="Escribe una frase de contexto" className={`rq-field__input rq-textarea${err?.ejemplo_origen ? ' rq-field__input--error' : ''}`} />
                          {err?.ejemplo_origen && <span className="rq-field__error">{err.ejemplo_origen.message}</span>}
                        </div>
                        <div className="rq-field">
                          <label htmlFor={`trad-ejemplo-t-${index}`} className="rq-field__label">Traducción del ejemplo <span className="rq-required">*</span></label>
                          <textarea id={`trad-ejemplo-t-${index}`} rows={2} {...register(`traducciones.${index}.ejemplo_traduccion`, { required: 'Traduce el ejemplo' })} placeholder="Traduce la frase al idioma destino" className={`rq-field__input rq-textarea${err?.ejemplo_traduccion ? ' rq-field__input--error' : ''}`} />
                          {err?.ejemplo_traduccion && <span className="rq-field__error">{err.ejemplo_traduccion.message}</span>}
                        </div>
                      </div>
                    </section>
                  );
                })}
                <button type="button" className="rq-button rq-button--outline" onClick={() => append(EMPTY_TRANSLATION)}>
                  <Plus size={16} /> Añadir otra traducción
                </button>
              </div>
              <div className="rq-modal-footer">
                <button type="button" className="rq-button rq-button--ghost" onClick={() => setIsTranslationModalOpen(false)}>Cancelar</button>
                <button type="submit" className="rq-button rq-button--primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar traducciones'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAudioModalOpen && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="audio-modal-title">
          <div className="modal-content-responsive rq-modal-dialog" style={{ maxWidth: 460 }}>
            <div className="rq-modal-header">
              <h2 id="audio-modal-title" className="rq-modal-header__title rq-inline">
                <FileAudio size={20} color="var(--color-primary-text)" aria-hidden="true" /> Actualizar Audio
              </h2>
              <button type="button" className="rq-icon-close" onClick={() => setIsAudioModalOpen(false)} aria-label="Cerrar modal"><X size={18} /></button>
            </div>
            <form className="rq-form" onSubmit={handleUploadAudio}>
              <input id="word-audio-upload" type="file" accept="audio/*" hidden onChange={(e) => setAudioFile(e.target.files[0] || null)} />
              <div className="rq-inline">
                <label htmlFor="word-audio-upload" className="rq-upload-pill" style={{ flex: 1, minWidth: 0 }}>
                  <span className="rq-upload-pill__icon"><FileAudio size={15} /></span>
                  <span className={`rq-upload-pill__name${audioFile ? ' rq-upload-pill__name--active' : ''}`}>{audioFile ? audioFile.name : 'Seleccionar archivo de audio...'}</span>
                  <span className="rq-upload-pill__badge">{audioFile ? 'Cambiar' : 'Subir audio'}</span>
                </label>
                {audioFile && <button type="button" className="rq-icon-close" onClick={() => setAudioFile(null)} aria-label="Quitar audio"><X size={16} /></button>}
              </div>
              <div className="rq-form__actions">
                <button type="button" className="rq-button rq-button--ghost" onClick={() => setIsAudioModalOpen(false)}>Cancelar</button>
                <button type="submit" className="rq-button rq-button--primary">Subir Audio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImageLightboxModal src={showImage ? imageUrl : null} alt={palabra.termino} title={palabra.termino} onClose={() => setShowImage(false)} />
    </div>
  );
};
