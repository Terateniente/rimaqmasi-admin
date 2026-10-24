import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPalabraById, updatePalabra, updatePalabraAudio, addDefinicion, deleteDefinicion, addEjemplo, deleteEjemplo } from '../../services/diccionarioService';
import { getIdiomas } from '../../services/idiomaService';
import { toast } from 'sonner';
import { ArrowLeft, Volume2, Plus, Trash2, BookType, MessageSquareQuote, FileAudio, Upload, ImagePlus, X, Star, Languages, CalendarDays, ShieldCheck } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { findIdioma, getIdiomaBandera, getIdiomaId, getIdiomaNombre, getUserDisplayName, getWordTranslations, parseDefinitionText } from '../../utils/dictionaryViewUtils';
import { ModernPageSkeleton } from '../../components/ModernPageSkeleton';
import { RimaqSelect } from '../../components/RimaqSelect';

export const PalabraDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [palabra, setPalabra] = useState(null);
  const [idiomas, setIdiomas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals for Definition and Example
  const [isDefinicionModalOpen, setIsDefinicionModalOpen] = useState(false);
  const [isEjemploModalOpen, setIsEjemploModalOpen] = useState(false);
  const [currentDefinicionId, setCurrentDefinicionId] = useState(null);

  // Audio Upload Modal
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [palabraAudioFile, setPalabraAudioFile] = useState(null);
  const imageInputRef = useRef(null);

  // Image Fullscreen Modal
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedTranslationLanguage, setSelectedTranslationLanguage] = useState('');
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);

  const [ejemploAudioFile, setEjemploAudioFile] = useState(null);

  const { register: regDef, handleSubmit: submitDef, reset: resetDef, setValue: setValDef, watch: watchDef, formState: { errors: errDef } } = useForm();
  const { register: regEj, handleSubmit: submitEj, reset: resetEj, formState: { errors: errEj } } = useForm();
  const { register: regTranslation, control: translationControl, handleSubmit: submitTranslation, reset: resetTranslation, setValue: setValTranslation, watch: watchTranslation, formState: { errors: translationErrors, isSubmitting: isSavingTranslations } } = useForm({
    defaultValues: { traducciones: [{ idioma_destino_id: '', termino_traducido: '', ejemplo_origen: '', ejemplo_traduccion: '' }] }
  });
  const { fields: translationFields, append: appendTranslation, remove: removeTranslation } = useFieldArray({ control: translationControl, name: 'traducciones' });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const BACKEND_HOST = API_URL.replace('/api/v1', '');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [palabraRes, idiomasRes] = await Promise.all([
        getPalabraById(id),
        getIdiomas()
      ]);
      setPalabra(palabraRes.data || palabraRes);
      setIdiomas(idiomasRes.data || idiomasRes || []);
    } catch (error) {
      toast.error('Error al cargar la palabra');
      navigate('/diccionario/palabras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddDefinicion = async (data) => {
    // Validación frontend para orden_acepcion duplicado
    const ordenInt = parseInt(data.orden_acepcion, 10);
    const isDuplicateOrder = palabra?.definiciones?.some(
      d => d.orden_acepcion === ordenInt && String(d.idioma_definicion_id) === String(data.idioma_definicion_id)
    );
    
    if (isDuplicateOrder) {
      toast.error(`Ya existe una definición con el orden ${ordenInt} para el idioma seleccionado.`);
      return;
    }

    const toastId = toast.loading('Añadiendo definición...');
    try {
      const defRes = await addDefinicion(id, {
        ...data,
        parte_discurso: '-',
        orden_acepcion: ordenInt
      });
      const createdDef = defRes.data || defRes;
      const defId = createdDef.definicion_id || createdDef.definiciones_palabra_id || createdDef.id;

      if (data.ejemplo_texto) {
        await addEjemplo(defId, {
          ejemplo_texto: data.ejemplo_texto,
          traduccion_ejemplo: data.traduccion_ejemplo || ''
        });
      }

      toast.success('Definición añadida', { id: toastId });
      setIsDefinicionModalOpen(false);
      resetDef();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al añadir definición', { id: toastId });
    }
  };

  const handleDeleteDefinicion = async (defId) => {
    const toastId = toast.loading('Eliminando definición...');
    try {
      await deleteDefinicion(defId);
      toast.success('Definición eliminada', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar', { id: toastId });
    }
  };

  const handleOpenEjemploModal = (defId) => {
    setCurrentDefinicionId(defId);
    setEjemploAudioFile(null);
    resetEj();
    setIsEjemploModalOpen(true);
  };

  const handleAddEjemplo = async (data) => {
    const toastId = toast.loading('Añadiendo ejemplo...');
    try {
      const payload = {
        ejemplo_texto: data.ejemplo_texto,
        traduccion_ejemplo: data.traduccion_ejemplo
      };
      if (ejemploAudioFile) {
        payload.audio = ejemploAudioFile;
      }
      await addEjemplo(currentDefinicionId, payload);
      toast.success('Ejemplo añadido', { id: toastId });
      setIsEjemploModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al añadir ejemplo', { id: toastId });
    }
  };

  const handleDeleteEjemplo = async (ejemploId) => {
    const toastId = toast.loading('Eliminando ejemplo...');
    try {
      await deleteEjemplo(ejemploId);
      toast.success('Ejemplo eliminado', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar', { id: toastId });
    }
  };

  const openTranslationModal = () => {
    resetTranslation({ traducciones: [{ idioma_destino_id: '', termino_traducido: '', ejemplo_origen: '', ejemplo_traduccion: '' }] });
    setIsTranslationModalOpen(true);
  };

  const handleAddTranslations = async (data) => {
    const toastId = toast.loading('Guardando traducciones...');
    try {
      await updatePalabra(id, {
        idioma_id: Number(palabra.idioma_id || palabra.idiomas_id),
        traducciones: data.traducciones.map((item) => ({
          idioma_destino_id: Number(item.idioma_destino_id),
          termino_traducido: item.termino_traducido.trim(),
          definicion_origen: palabra.termino.trim(),
          definicion_destino: item.termino_traducido.trim(),
          ejemplo_origen: item.ejemplo_origen.trim(),
          ejemplo_traduccion: item.ejemplo_traduccion.trim(),
        })),
      });
      toast.success(data.traducciones.length === 1 ? 'Traducción añadida' : 'Traducciones añadidas', { id: toastId });
      setIsTranslationModalOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudieron guardar las traducciones', { id: toastId });
    }
  };

  const handleUploadPalabraAudio = async (e) => {
    e.preventDefault();
    if (!palabraAudioFile) return toast.error('Selecciona un archivo');
    const toastId = toast.loading('Subiendo audio...');
    try {
      await updatePalabraAudio(id, palabraAudioFile);
      toast.success('Audio actualizado', { id: toastId });
      setIsAudioModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Error al subir audio', { id: toastId });
    }
  };

  const handleUploadPalabraImage = async (event) => {
    const imageFile = event.target.files?.[0];
    event.target.value = '';
    if (!imageFile) return;
    if (!imageFile.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      return;
    }
    if (imageFile.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar los 5 MB');
      return;
    }

    const toastId = toast.loading(palabra.url_imagen ? 'Actualizando imagen...' : 'Agregando imagen...');
    try {
      await updatePalabra(id, { imagen: imageFile });
      toast.success(palabra.url_imagen ? 'Imagen actualizada' : 'Imagen agregada', { id: toastId });
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo guardar la imagen', { id: toastId });
    }
  };

  const getFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return cleanPath.startsWith('/public') ? `${BACKEND_HOST}${cleanPath}` : `${BACKEND_HOST}/public${cleanPath}`;
  };

  const playAudio = (path) => {
    if (!path) return;
    const url = getFileUrl(path);
    const audio = new Audio(url);
    audio.play().catch(e => toast.error('No se pudo reproducir el audio'));
  };

  if (loading || !palabra) {
    return <div><ModernPageSkeleton cards={3} /></div>;
  }

  const idioma = findIdioma(idiomas, palabra.idioma_id || palabra.idiomas_id, palabra.idioma);
  const idiomaNombre = getIdiomaNombre(idioma);
  const definiciones = palabra.definiciones || [];
  const traducciones = getWordTranslations(palabra, idiomas);
  const idiomasTraduccion = traducciones
    .map((traduccion) => traduccion.idioma)
    .filter((item, index, list) => item && index === list.findIndex((candidate) => String(getIdiomaId(candidate)) === String(getIdiomaId(item))));
  const traduccionesVisibles = selectedTranslationLanguage
    ? traducciones.filter((traduccion) => String(getIdiomaId(traduccion.idioma)) === String(selectedTranslationLanguage))
    : traducciones;
  const definicionesVisibles = selectedTranslationLanguage
    ? definiciones.filter((definicion) => String(definicion.idioma_definicion_id || getIdiomaId(definicion.idioma)) === String(selectedTranslationLanguage))
    : definiciones;
  const ejemplos = palabra.ejemplos || [];
  const idiomaBandera = getIdiomaBandera(idioma);
  const dificultad = palabra.dificultad || palabra.nivel_dificultad || 1;
  const creadorPalabra = palabra.creadoPor || palabra.creado_por;

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
      {/* Header and Back Button */}
      <button onClick={() => navigate('/diccionario/palabras')} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Volver a Palabras
      </button>

      <section style={{ background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-container-low) 100%)', borderRadius: '20px', border: '1px solid var(--color-surface-variant)', padding: '28px', marginBottom: '24px', boxShadow: 'var(--shadow-level-1)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '240px', height: '240px', borderRadius: '50%', background: 'var(--color-primary-container)', opacity: .32, right: '-80px', top: '-110px' }} />
        <div className="flex-col-mobile" style={{ gap: '28px', alignItems: 'start', position: 'relative' }}>
          <div className="flex-col-mobile" style={{ gap: '20px', minWidth: 0 }}>
            <div style={{ width: '104px', height: '104px', borderRadius: '20px', background: 'var(--color-surface-container-high)', flexShrink: 0, overflow: 'hidden', border: '3px solid var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {palabra.url_imagen ? (
                <img src={getFileUrl(palabra.url_imagen)} alt={palabra.termino} onClick={() => setIsImageModalOpen(true)} title="Ver imagen completa" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} />
              ) : <BookType size={38} color="var(--color-outline)" />}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.08em', color: 'var(--color-primary)', textTransform: 'uppercase' }}>Entrada del diccionario</span>
                <span style={{ padding: '4px 9px', borderRadius: '999px', background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', fontSize: '11px', fontWeight: 700, textTransform: 'capitalize' }}>{palabra.estado}</span>
              </div>
              <div className="rq-page-heading" style={{ flexWrap: 'wrap' }}>
                <div className="rq-page-heading__accent" />
                <h1 className="rq-page-heading__title">{palabra.termino}</h1>
                {palabra.url_audio && <button onClick={() => playAudio(palabra.url_audio)} title="Escuchar pronunciación" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent)' }}><Volume2 size={20} /></button>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '7px 11px', borderRadius: '10px', background: 'var(--color-surface)' }}>
                  {idiomaBandera ? <img src={getFileUrl(idiomaBandera)} alt={`Bandera de ${idiomaNombre}`} style={{ width: '30px', height: '21px', objectFit: 'cover', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,.18)' }} /> : <Languages size={18} />}
                  <span style={{ fontWeight: 700 }}>{idiomaNombre}</span>
                  {idioma?.codigo_iso && <span style={{ color: 'var(--color-outline)', fontSize: '12px', textTransform: 'uppercase' }}>{idioma.codigo_iso}</span>}
                </div>
                <span style={{ fontSize: '15px', color: 'var(--color-on-surface-variant)' }}><strong>Fonética:</strong> {palabra.transcripcion_fonetica || 'No registrada'}</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map(star => <Star key={star} size={17} fill={star <= dificultad ? '#eab308' : 'transparent'} color={star <= dificultad ? '#eab308' : 'var(--color-outline)'} strokeWidth={2} />)}
                <span style={{ fontSize: '12px', color: 'var(--color-outline)', marginRight: '8px' }}>{dificultad}/5</span>
                {(palabra.categorias || []).map((cat, cIdx) => <span key={cat.categoria_id || cat.id || `cat-${cIdx}`} style={{ backgroundColor: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', padding: '5px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>{cat.nombre}</span>)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'stretch', minWidth: '180px' }}>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleUploadPalabraImage} style={{ display: 'none' }} />
            <button type="button" onClick={() => imageInputRef.current?.click()} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', borderRadius: '10px', padding: '9px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', cursor: 'pointer', fontWeight: 700 }}><ImagePlus size={14} /> {palabra.url_imagen ? 'Cambiar imagen' : 'Agregar imagen'}</button>
            <button onClick={() => setIsAudioModalOpen(true)} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', borderRadius: '10px', padding: '9px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', cursor: 'pointer', fontWeight: 700 }}><Upload size={14} /> Cambiar audio</button>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--color-surface)', fontSize: '12px', color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>
              <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}><ShieldCheck size={14} /> {traducciones.length} traducción{traducciones.length === 1 ? '' : 'es'}</div>
              <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}><MessageSquareQuote size={14} /> {ejemplos.length} ejemplo{ejemplos.length === 1 ? '' : 's'}</div>
              <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}><ShieldCheck size={14} /> Creado por: {getUserDisplayName(creadorPalabra)}</div>
              {palabra.creado_en && <div style={{ display: 'flex', gap: '7px', alignItems: 'center' }}><CalendarDays size={14} /> {new Intl.DateTimeFormat('es-PE').format(new Date(palabra.creado_en))}</div>}
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--color-surface)', border: '1px solid var(--color-surface-variant)', borderRadius: '16px', padding: '20px', marginBottom: '24px', boxShadow: 'var(--shadow-level-1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--color-on-surface)' }}>Traducciones disponibles</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--color-outline)', fontSize: '12px' }}>Cada acepción reúne una traducción y su ejemplo de uso.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <RimaqSelect
              value={selectedTranslationLanguage || '__all__'}
              onValueChange={(val) => setSelectedTranslationLanguage(val === '__all__' ? '' : val)}
              placeholder="Todos los idiomas"
              options={[
                { value: '__all__', label: 'Todos los idiomas' },
                ...idiomasTraduccion.map((item) => ({
                  value: String(getIdiomaId(item)),
                  label: getIdiomaNombre(item)
                }))
              ]}
              style={{ minWidth: '200px' }}
            />
            <button type="button" onClick={openTranslationModal} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 14px', background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: '9px', fontWeight: 700, cursor: 'pointer' }}><Plus size={16} /> Añadir traducción</button>
          </div>
        </div>
        {traduccionesVisibles.length === 0 ? <div style={{ padding: '24px', textAlign: 'center', borderRadius: '12px', background: 'var(--color-surface-container-low)', color: 'var(--color-outline)' }}>No hay traducciones registradas para este idioma.</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {traduccionesVisibles.map((traduccion) => {
              const flag = getIdiomaBandera(traduccion.idioma);
              return <article key={traduccion.key} style={{ padding: '18px', borderRadius: '15px', border: '1px solid var(--color-surface-variant)', background: 'var(--color-surface-container-lowest)', borderTop: '4px solid var(--color-primary)', boxShadow: 'var(--shadow-level-1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '10px' }}>
                  {flag ? <img src={getFileUrl(flag)} alt="" style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '4px' }} /> : <Languages size={19} />}
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>{getIdiomaNombre(traduccion.idioma)}</span>
                </div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Traducción</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-on-surface)', marginTop: '3px' }}>{traduccion.termino}</div>
                <div style={{ marginTop: '9px', padding: '8px 10px', borderRadius: '8px', background: 'var(--color-surface-container-low)', color: 'var(--color-on-surface-variant)', fontSize: '11px' }}>
                  Creada por <strong>{getUserDisplayName(traduccion.creadoPor)}</strong>
                  {traduccion.creadoEn && <> · {new Intl.DateTimeFormat('es-PE').format(new Date(traduccion.creadoEn))}</>}
                </div>
                {traduccion.ejemplos?.length > 0 && <div style={{ marginTop: '11px', paddingTop: '10px', borderTop: '1px solid var(--color-surface-variant)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-outline)', textTransform: 'uppercase', marginBottom: '6px' }}>Ejemplos de uso</div>
                  {traduccion.ejemplos.map((example, exampleIndex) => <div key={example.ejemplo_id || example.id || exampleIndex} style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--color-surface)', marginTop: '5px', fontSize: '12px', lineHeight: 1.45 }}>
                    <div style={{ fontWeight: 650, color: 'var(--color-on-surface)' }}>“{example.texto_ejemplo || example.ejemplo_texto}”</div>
                    {(example.texto_significado || example.traduccion_ejemplo) && <div style={{ color: 'var(--color-on-surface-variant)', marginTop: '3px' }}>{example.texto_significado || example.traduccion_ejemplo}</div>}
                  </div>)}
                </div>}
              </article>;
            })}
          </div>
        )}
      </section>

      <div style={{ display: 'none' }}>
        <h2 style={{ fontSize: '20px', color: 'var(--color-on-surface)', margin: 0 }}>Definiciones ({definicionesVisibles.length})</h2>
        <button onClick={() => { resetDef(); setIsDefinicionModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Añadir Definición
        </button>
      </div>

      <div style={{ display: 'none' }}>
        {definicionesVisibles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px dashed var(--color-outline)', color: 'var(--color-outline)' }}>
            <BookType size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No hay definiciones para esta palabra.</p>
          </div>
        ) : (
          definicionesVisibles.map((def, idx) => {
            const parsed = parseDefinitionText(def.definicion);
            const definitionLanguage = findIdioma(idiomas, def.idioma_definicion_id, def.idioma);
            const definitionFlag = getIdiomaBandera(definitionLanguage);
            return (
              <article key={def.definicion_id || def.definiciones_id || def.id || `def-${idx}`} style={{ backgroundColor: 'var(--color-surface)', borderRadius: '15px', border: '1px solid var(--color-surface-variant)', overflow: 'hidden', boxShadow: 'var(--shadow-level-1)' }}>
                <header style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface-container-low)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                    <span style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'var(--color-primary)', color: 'var(--color-on-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{def.orden_acepcion || idx + 1}</span>
                    {definitionFlag ? <img src={getFileUrl(definitionFlag)} alt="" style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '4px' }} /> : <Languages size={18} />}
                    <div>
                      <div style={{ fontWeight: 750, color: 'var(--color-on-surface)' }}>{getIdiomaNombre(definitionLanguage)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-outline)', textTransform: 'capitalize' }}>{def.estado || 'Sin estado'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleOpenEjemploModal(def.definicion_id || def.definiciones_id || def.id)} style={{ background: 'var(--color-primary-container)', border: 'none', color: 'var(--color-on-primary-container)', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 10px', borderRadius: '8px' }}><Plus size={14} /> Ejemplo</button>
                    <button onClick={() => handleDeleteDefinicion(def.definicion_id || def.definiciones_id || def.id)} title="Eliminar definición" style={{ background: 'var(--color-error-container)', border: 'none', color: 'var(--color-on-error-container)', cursor: 'pointer', padding: '7px', borderRadius: '8px', display: 'flex' }}><Trash2 size={15} /></button>
                  </div>
                </header>
                <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: parsed.origen && parsed.destino ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: '14px' }}>
                  {parsed.termino && <div style={{ gridColumn: '1 / -1', fontSize: '21px', fontWeight: 800, color: 'var(--color-primary)' }}>{parsed.termino}</div>}
                  {parsed.origen && <div style={{ padding: '14px', borderRadius: '11px', background: 'var(--color-surface-container-low)' }}><div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.06em', color: 'var(--color-outline)', textTransform: 'uppercase', marginBottom: '6px' }}>Definición original</div><div style={{ color: 'var(--color-on-surface)', lineHeight: 1.55 }}>{parsed.origen}</div></div>}
                  <div style={{ padding: '14px', borderRadius: '11px', background: 'var(--color-primary-container)' }}><div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.06em', color: 'var(--color-on-primary-container)', opacity: .72, textTransform: 'uppercase', marginBottom: '6px' }}>Significado en {getIdiomaNombre(definitionLanguage)}</div><div style={{ color: 'var(--color-on-primary-container)', lineHeight: 1.55 }}>{parsed.destino || parsed.raw}</div></div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <section style={{ display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div><h2 style={{ fontSize: '20px', margin: 0, color: 'var(--color-on-surface)' }}>Ejemplos de uso ({ejemplos.length})</h2><p style={{ margin: '4px 0 0', color: 'var(--color-outline)', fontSize: '12px' }}>Frases de contexto con su significado o traducción.</p></div>
          {definiciones[0] && <button onClick={() => handleOpenEjemploModal(definiciones[0].definicion_id || definiciones[0].definiciones_id || definiciones[0].id)} style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', padding: '8px 12px', borderRadius: '9px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={15} /> Añadir ejemplo</button>}
        </div>
        {ejemplos.length === 0 ? <div style={{ padding: '28px', textAlign: 'center', background: 'var(--color-surface)', border: '1px dashed var(--color-outline-variant)', borderRadius: '14px', color: 'var(--color-outline)' }}>Todavía no hay ejemplos registrados.</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {ejemplos.map((ejemplo, index) => {
              const exampleLanguage = findIdioma(idiomas, ejemplo.idioma_significado_id, ejemplo.idiomaSignificado);
              const exampleFlag = getIdiomaBandera(exampleLanguage);
              return <article key={ejemplo.ejemplo_id || ejemplo.ejemplos_id || ejemplo.id || index} style={{ padding: '16px', borderRadius: '13px', background: 'var(--color-surface)', border: '1px solid var(--color-surface-variant)', display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
                <div><MessageSquareQuote size={18} color="var(--color-primary)" /><p style={{ margin: '7px 0', fontSize: '15px', fontWeight: 650, color: 'var(--color-on-surface)', lineHeight: 1.5 }}>“{ejemplo.texto_ejemplo || ejemplo.ejemplo_texto}”</p>{(ejemplo.texto_significado || ejemplo.traduccion_ejemplo) && <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--color-on-surface-variant)', fontSize: '13px' }}>{exampleFlag && <img src={getFileUrl(exampleFlag)} alt="" style={{ width: '22px', height: '16px', objectFit: 'cover', borderRadius: '3px' }} />}<span>{ejemplo.texto_significado || ejemplo.traduccion_ejemplo}</span></div>}</div>
                <div style={{ display: 'flex', gap: '7px', alignItems: 'flex-start' }}>{ejemplo.url_audio && <button onClick={() => playAudio(ejemplo.url_audio)} style={{ border: 'none', background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', padding: '7px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><Volume2 size={16} /></button>}<button onClick={() => handleDeleteEjemplo(ejemplo.ejemplo_id || ejemplo.ejemplos_id || ejemplo.id)} style={{ border: 'none', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', padding: '7px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}><Trash2 size={16} /></button></div>
              </article>;
            })}
          </div>
        )}
      </section>

      {isTranslationModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, .58)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="modal-content-responsive" style={{ width: 'min(680px, 100%)', maxHeight: '90vh', background: 'var(--color-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-level-3)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <header style={{ padding: '22px 24px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><h2 style={{ margin: 0, fontSize: '20px', color: 'var(--color-on-surface)' }}>Añadir traducciones</h2><p style={{ margin: '5px 0 0', fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>Agrega una o más acepciones con sus ejemplos de uso.</p></div>
              <button type="button" onClick={() => setIsTranslationModalOpen(false)} aria-label="Cerrar" style={{ border: 'none', background: 'var(--color-surface-container-low)', color: 'var(--color-on-surface-variant)', borderRadius: '50%', width: '36px', height: '36px', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={19} /></button>
            </header>
            <form onSubmit={submitTranslation(handleAddTranslations)} style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="academic-modal-scroll" style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {translationFields.map((field, index) => (
                  <article key={field.id} style={{ padding: '18px', borderRadius: '14px', background: 'var(--color-surface-container-low)', border: '1px solid var(--color-surface-variant)', position: 'relative' }}>
                    <div style={{ marginBottom: '14px' }}><h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '15px' }}>Acepción {index + 1}</h3><p style={{ margin: '4px 34px 0 0', color: 'var(--color-on-surface-variant)', fontSize: '12px' }}>Una traducción posible según el contexto.</p></div>
                    {translationFields.length > 1 && <button type="button" onClick={() => removeTranslation(index)} title="Quitar acepción" style={{ position: 'absolute', right: '14px', top: '14px', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'grid', placeItems: 'center', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', cursor: 'pointer' }}><Trash2 size={15} /></button>}
                    <div className="flex-col-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Idioma destino *</span>
                        <input type="hidden" {...regTranslation(`traducciones.${index}.idioma_destino_id`, { required: 'Selecciona un idioma' })} />
                        <RimaqSelect
                          value={String(watchTranslation(`traducciones.${index}.idioma_destino_id`) || '')}
                          onValueChange={(val) => setValTranslation(`traducciones.${index}.idioma_destino_id`, val, { shouldValidate: true })}
                          placeholder="Seleccione..."
                          options={idiomas
                            .filter((item) => String(getIdiomaId(item)) !== String(palabra.idioma_id || palabra.idiomas_id))
                            .map((item) => ({
                              value: String(getIdiomaId(item)),
                              label: getIdiomaNombre(item)
                            }))}
                          className="rimaq-select--full-width"
                        />
                        {translationErrors.traducciones?.[index]?.idioma_destino_id && <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>{translationErrors.traducciones[index].idioma_destino_id.message}</span>}
                      </div>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Término traducido *
                        <input {...regTranslation(`traducciones.${index}.termino_traducido`, { required: 'Escribe la traducción' })} placeholder="Perro" style={{ padding: '11px 12px', borderRadius: '9px', border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface)', color: 'var(--color-on-surface)' }} />
                        {translationErrors.traducciones?.[index]?.termino_traducido && <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>{translationErrors.traducciones[index].termino_traducido.message}</span>}
                      </label>
                    </div>
                    <div style={{ marginTop: '12px', padding: '14px', border: '1px dashed var(--color-outline-variant)', borderRadius: '10px', background: 'var(--color-surface)' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Ejemplo en el idioma original *
                        <textarea {...regTranslation(`traducciones.${index}.ejemplo_origen`, { required: 'Agrega un ejemplo de uso' })} rows={2} placeholder="Escribe una frase de contexto" style={{ padding: '10px 12px', borderRadius: '9px', border: '1px solid var(--color-outline-variant)', resize: 'vertical', background: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }} />
                        {translationErrors.traducciones?.[index]?.ejemplo_origen && <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>{translationErrors.traducciones[index].ejemplo_origen.message}</span>}
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '11px', fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Traducción del ejemplo *
                        <textarea {...regTranslation(`traducciones.${index}.ejemplo_traduccion`, { required: 'Traduce el ejemplo' })} rows={2} placeholder="Traduce la frase al idioma destino" style={{ padding: '10px 12px', borderRadius: '9px', border: '1px solid var(--color-outline-variant)', resize: 'vertical', background: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)' }} />
                        {translationErrors.traducciones?.[index]?.ejemplo_traduccion && <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>{translationErrors.traducciones[index].ejemplo_traduccion.message}</span>}
                      </label>
                    </div>
                  </article>
                ))}
                <button type="button" onClick={() => appendTranslation({ idioma_destino_id: '', termino_traducido: '', ejemplo_origen: '', ejemplo_traduccion: '' })} style={{ border: '1px dashed var(--color-primary)', borderRadius: '11px', padding: '12px', background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', fontWeight: 750, cursor: 'pointer' }}><Plus size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Añadir otra traducción</button>
              </div>
              <footer style={{ padding: '18px 24px', borderTop: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--color-surface)' }}><button type="button" onClick={() => setIsTranslationModalOpen(false)} style={{ padding: '11px 18px', borderRadius: '10px', border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface)', color: 'var(--color-on-surface)', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button><button type="submit" disabled={isSavingTranslations} style={{ padding: '11px 20px', borderRadius: '10px', border: 'none', background: 'var(--color-primary)', color: 'var(--color-on-primary)', fontWeight: 750, cursor: isSavingTranslations ? 'wait' : 'pointer', opacity: isSavingTranslations ? .7 : 1 }}>{isSavingTranslations ? 'Guardando...' : 'Guardar traducciones'}</button></footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal Añadir Definición */}
      {isDefinicionModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-level-3)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Añadir Definición</h2>
            <form onSubmit={submitDef(handleAddDefinicion)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Idioma de la definición y traducción</label>
                <input type="hidden" {...regDef('idioma_definicion_id', { required: true })} />
                <div style={{ marginTop: '4px' }}>
                  <RimaqSelect
                    value={String(watchDef('idioma_definicion_id') || '')}
                    onValueChange={(val) => setValDef('idioma_definicion_id', val, { shouldValidate: true })}
                    placeholder="Selecciona un idioma"
                    options={idiomas.map((item) => ({
                      value: String(getIdiomaId(item)),
                      label: getIdiomaNombre(item)
                    }))}
                    className="rimaq-select--full-width"
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Definición</label>
                <textarea {...regDef('definicion', { required: true })} rows={3} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-outline)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Orden (Acepción)</label>
                <input type="number" {...regDef('orden_acepcion', { required: true })} defaultValue={1} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-outline)', marginTop: '4px' }} />
              </div>
              
              {/* Optional Example fields */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-surface-variant)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--color-on-surface)' }}>Ejemplo de Uso (Opcional)</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '16px', borderLeft: '2px solid var(--color-primary)' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Ejemplo</label>
                  <textarea {...regDef('ejemplo_texto')} placeholder="Hello, how are you?" rows={2} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', fontSize: '14px', outline: 'none', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingLeft: '16px', borderLeft: '2px solid var(--color-primary)' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Traducción</label>
                  <textarea {...regDef('traduccion_ejemplo')} placeholder="Hola, ¿cómo estás?" rows={2} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', fontSize: '14px', outline: 'none', resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsDefinicionModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Añadir Ejemplo */}
      {isEjemploModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-level-3)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Añadir Ejemplo</h2>
            <form onSubmit={submitEj(handleAddEjemplo)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Ejemplo de Uso</label>
                <textarea {...regEj('ejemplo_texto', { required: true })} rows={2} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-outline)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Traducción</label>
                <textarea {...regEj('traduccion_ejemplo')} rows={2} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-outline)', marginTop: '4px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Audio (Opcional)</label>
                <input type="file" accept="audio/*" onChange={(e) => setEjemploAudioFile(e.target.files[0])} style={{ width: '100%', marginTop: '4px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsEjemploModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cambiar Audio Palabra */}
      {isAudioModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-level-3)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><FileAudio size={20} /> Actualizar Audio</h2>
            <form onSubmit={handleUploadPalabraAudio}>
              <input type="file" accept="audio/*" onChange={(e) => setPalabraAudioFile(e.target.files[0])} style={{ width: '100%', padding: '8px', marginBottom: '24px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsAudioModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '8px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Subir Audio</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Imagen Completa */}
      {isImageModalOpen && palabra.url_imagen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '24px', backdropFilter: 'blur(4px)' }} onClick={() => setIsImageModalOpen(false)}>
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsImageModalOpen(false)} style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}>
              <X size={24} />
            </button>
            <img src={getFileUrl(palabra.url_imagen)} alt={palabra.termino} style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} crossOrigin="anonymous" />
          </div>
        </div>
      )}

    </div>
  );
};
