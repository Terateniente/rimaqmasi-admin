import React, { useEffect, useState } from 'react';
import { getPalabras, createPalabra, updatePalabra, updatePalabraStatus, deletePalabra, getCategorias } from '../../services/diccionarioService';
import { getIdiomas } from '../../services/idiomaService';
import { toast } from 'sonner';
import { Search, Plus, Trash2, Volume2, X, Save, Eye, Filter, CheckCircle, XCircle, Upload, Image as ImageIcon, FileAudio, Edit2, FileDown } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { matchesSearch } from '../../utils/searchUtils';
import { findIdioma, getIdiomaBandera, getIdiomaNombre, getUserDisplayName, getWordTranslations } from '../../utils/dictionaryViewUtils';
import { generateDictionaryPdf } from '../../utils/dictionaryPdf';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { WizardProgress } from '../../components/WizardProgress';
import { RimaqSelect } from '../../components/RimaqSelect';
import './Palabras.css';

const WORD_CONTEXT_DRAFT_KEY = 'rimaqmasi:palabra-contexto-borrador';

export const Palabras = () => {
  const navigate = useNavigate();
  const [palabras, setPalabras] = useState([]);
  const [idiomas, setIdiomas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIdioma, setSelectedIdioma] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [categoriaSearchTerm, setCategoriaSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [rememberContext, setRememberContext] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [audioFile, setAudioFile] = useState(null);
  const [imagenFile, setImagenFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);

  const { register, handleSubmit, reset, setValue, getValues, watch, control, trigger, formState: { errors } } = useForm({
    defaultValues: {
      definiciones: [{ definicion: '', ejemplo_texto: '', traduccion_ejemplo: '' }]
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'definiciones'
  });
  
  const selectedCategoriasIds = watch('categorias_ids') || [];
  const selectedSourceLanguageId = watch('idiomas_id');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const BACKEND_HOST = API_URL.replace('/api/v1', '');

  const getPalabraId = (palabra) => palabra?.palabra_id ?? palabra?.palabras_id ?? palabra?.id;

  const getFileUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return cleanPath.startsWith('/public') ? `${BACKEND_HOST}${cleanPath}` : `${BACKEND_HOST}/public${cleanPath}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [palabrasRes, idiomasRes, catsRes] = await Promise.all([
        getPalabras(selectedIdioma),
        getIdiomas(),
        getCategorias()
      ]);
      
      const fetchedPalabras = palabrasRes.data || palabrasRes || [];
      setPalabras(fetchedPalabras);
      setIdiomas(idiomasRes.data || idiomasRes || []);
      setCategorias(Array.isArray(catsRes) ? catsRes : (catsRes.data || []));
    } catch (error) {
      toast.error('Error al cargar datos');
      setPalabras([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedIdioma]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedIdioma, selectedEstado, selectedCategoria]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const handleOpenCreate = () => {
    let savedContext = null;
    try {
      savedContext = JSON.parse(localStorage.getItem(WORD_CONTEXT_DRAFT_KEY) || 'null');
    } catch {
      localStorage.removeItem(WORD_CONTEXT_DRAFT_KEY);
    }
    const hasSavedContext = Boolean(savedContext?.idiomas_id && savedContext?.categorias_ids?.length && savedContext?.nivel_dificultad);
    setCurrentStep(hasSavedContext ? 2 : 1);
    reset({
      termino: '',
      idiomas_id: savedContext?.idiomas_id || '',
      transcripcion_fonetica: '',
      nivel_dificultad: savedContext?.nivel_dificultad || 1,
      categorias_ids: savedContext?.categorias_ids || [],
      definiciones: [{ 
        idioma_definicion_id: '', 
        termino_traducido: '',
        definicion_origen: '',
        definicion_destino: '',
        ejemplo_texto: '', 
        traduccion_ejemplo: '' 
      }]
    });
    setAudioFile(null);
    setImagenFile(null);
    setAudioPreview(null);
    setImagenPreview(null);
    setCategoriaSearchTerm('');
    setRememberContext(hasSavedContext);
    setIsEditMode(false);
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (palabra) => {
    setCurrentStep(1);
    setRememberContext(false);
    const sourceLanguageId = palabra.idioma_id ?? palabra.idiomas_id ?? palabra.idioma?.idioma_id;
    const translationBlocks = (palabra.traduccionesOrigen || palabra.traducciones_origen || []).map((relation) => {
      const destination = relation.palabraDestino || relation.palabra_destino;
      const destinationLanguageId = destination?.idioma_id ?? destination?.idiomas_id ?? destination?.idioma?.idioma_id;
      const sourceDefinition = (palabra.definiciones || []).find((definition) => String(definition.idioma_definicion_id) === String(sourceLanguageId));
      const destinationDefinition = (destination?.definiciones || []).find((definition) => String(definition.idioma_definicion_id) === String(destinationLanguageId));
      const example = (palabra.ejemplos || []).find((item) => !item.idioma_significado_id || String(item.idioma_significado_id) === String(destinationLanguageId));
      return {
        traduccion_palabra_id: relation.traduccion_palabra_id || relation.id,
        idioma_definicion_id: String(destinationLanguageId || ''),
        termino_traducido: destination?.termino || '',
        definicion_origen: sourceDefinition?.definicion || '',
        definicion_destino: destinationDefinition?.definicion || '',
        ejemplo_texto: example?.texto_ejemplo || example?.ejemplo_texto || '',
        traduccion_ejemplo: example?.texto_significado || example?.traduccion_ejemplo || ''
      };
    });
    reset({
      termino: palabra.termino,
      idiomas_id: String(sourceLanguageId || ''),
      transcripcion_fonetica: palabra.transcripcion_fonetica || '',
      nivel_dificultad: palabra.dificultad ?? palabra.nivel_dificultad ?? 1,
      categorias_ids: palabra.categorias?.map(c => String(c.categoria_id || c.categorias_vocabulario_id || c.categorias_id || c.id)) || [],
      definiciones: translationBlocks
    });
    setAudioFile(null);
    setImagenFile(null);
    setAudioPreview(palabra.url_audio ? getFileUrl(palabra.url_audio) : null);
    setImagenPreview(palabra.url_imagen ? getFileUrl(palabra.url_imagen) : null);
    setCategoriaSearchTerm('');
    setIsEditMode(true);
    setEditId(getPalabraId(palabra));
    setIsModalOpen(true);
  };

  const handlePreSubmit = (data) => {
    setConfirmData(data);
  };

  const saveWordContextDraft = () => {
    if (isEditMode) return;
    const { idiomas_id, categorias_ids, nivel_dificultad } = getValues();
    if (!idiomas_id || !categorias_ids?.length || !nivel_dificultad) return;
    localStorage.setItem(WORD_CONTEXT_DRAFT_KEY, JSON.stringify({ idiomas_id, categorias_ids, nivel_dificultad }));
  };

  const handleRememberContextToggle = async () => {
    if (rememberContext) {
      localStorage.removeItem(WORD_CONTEXT_DRAFT_KEY);
      setRememberContext(false);
      toast.success('La configuración ya no se reutilizará automáticamente.');
      return;
    }
    const isValid = await trigger(['idiomas_id', 'categorias_ids', 'nivel_dificultad']);
    if (!isValid) return;
    saveWordContextDraft();
    setRememberContext(true);
    toast.success('Idioma, categoría y dificultad guardados para las siguientes palabras.');
  };

  const handleNextWordStep = async () => {
    if (currentStep === 1) {
      const isValid = await trigger(['idiomas_id', 'categorias_ids', 'nivel_dificultad']);
      if (!isValid) return;
      if (rememberContext) saveWordContextDraft();
      setCurrentStep(2);
      return;
    }

    const isValid = await trigger(['termino']);
    if (isValid) setCurrentStep(3);
  };

  const confirmSubmit = async () => {
    if (!confirmData) return;
    const data = confirmData;
    const isEditing = isEditMode;
    const actionText = isEditing ? 'Editando' : 'Creando';
    const successText = isEditing ? 'editada' : 'creada/enviada a revisión';
    const toastId = toast.loading(`${actionText} palabra "${data.termino}"...`);
    
    try {
      const payload = {
        termino: data.termino,
        idioma_id: parseInt(data.idiomas_id, 10),
        nivel_dificultad: parseInt(data.nivel_dificultad, 10),
        transcripcion_fonetica: data.transcripcion_fonetica,
        categorias_ids: data.categorias_ids ? data.categorias_ids.map(id => parseInt(id, 10)) : []
      };

      if (data.definiciones && data.definiciones.length > 0) {
        payload.traducciones = data.definiciones.map((block) => ({
          traduccion_palabra_id: block.traduccion_palabra_id ? parseInt(block.traduccion_palabra_id, 10) : undefined,
          idioma_destino_id: parseInt(block.idioma_definicion_id, 10),
          termino_traducido: block.termino_traducido.trim(),
          definicion_origen: block.definicion_origen?.trim() || data.termino.trim(),
          definicion_destino: block.definicion_destino?.trim() || block.termino_traducido.trim(),
          ejemplo_origen: block.ejemplo_texto?.trim() || undefined,
          ejemplo_traduccion: block.traduccion_ejemplo?.trim() || undefined,
        }));
      }

      if (audioFile) payload.audio = audioFile;
      if (imagenFile) payload.imagen = imagenFile;

      if (isEditing) {
        await updatePalabra(editId, payload);
      } else {
        await createPalabra(payload);
      }
      
      toast.success(`Palabra ${successText} exitosamente`, { id: toastId });
      
      setIsModalOpen(false);
      setConfirmData(null);
      setIsEditMode(false);
      setEditId(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al guardar`, { id: toastId });
    }
  };

  const handleDelete = (palabra) => {
    setItemToDelete(palabra);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const palabraId = getPalabraId(itemToDelete);
    if (!palabraId) {
      toast.error('No se pudo identificar la palabra seleccionada');
      setItemToDelete(null);
      return;
    }
    const toastId = toast.loading(`Eliminando "${itemToDelete.termino}"...`);
    try {
      await deletePalabra(palabraId);
      toast.success(`Palabra eliminada exitosamente`, { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const filteredPalabras = palabras.filter(p => {
    const searchMatched = matchesSearch(p.termino, searchTerm);
    const matchesCat = selectedCategoria
      ? p.categorias?.some(c => String(c.categoria_id ?? c.categorias_vocabulario_id ?? c.categorias_id ?? c.id) === String(selectedCategoria))
      : true;
    const matchesIdioma = selectedIdioma ? String(p.idioma_id ?? p.idiomas_id) === String(selectedIdioma) : true;
    const matchesEstado = selectedEstado ? String(p.estado) === String(selectedEstado) : true;
    return searchMatched && matchesCat && matchesIdioma && matchesEstado;
  }).sort((a, b) => a.termino.localeCompare(b.termino));

  const totalPages = Math.ceil(filteredPalabras.length / itemsPerPage) || 1;
  const paginatedPalabras = filteredPalabras.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportPdf = async () => {
    if (filteredPalabras.length === 0) {
      toast.error('No hay palabras para exportar con los filtros seleccionados');
      return;
    }

    const toastId = toast.loading('Generando PDF del diccionario...');
    setIsExportingPdf(true);
    try {
      const selectedLanguage = findIdioma(idiomas, selectedIdioma);
      const selectedCategory = categorias.find((category) =>
        String(category.categoria_id ?? category.categorias_vocabulario_id ?? category.categorias_id ?? category.id) === String(selectedCategoria)
      );
      const stateLabels = {
        publicado: 'Publicado',
        revision: 'En revisión',
        borrador: 'Borrador',
        archivado: 'Archivado',
      };

      const fileName = await generateDictionaryPdf({
        palabras: filteredPalabras,
        idiomas,
        filtros: {
          idioma: selectedIdioma ? getIdiomaNombre(selectedLanguage, 'Idioma seleccionado') : '',
          estado: selectedEstado ? stateLabels[selectedEstado] || selectedEstado : '',
          categoria: selectedCategory?.nombre || '',
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

  const playAudio = (path) => {
    if (!path) return;
    const url = getFileUrl(path);
    const audio = new Audio(url);
    audio.play().catch(e => toast.error('No se pudo reproducir el audio'));
  };

  const getIdiomaName = (id) => {
    const idioma = idiomas.find(i => i.idiomas_id === id || i.id === id);
    return idioma ? idioma.nombre : `ID: ${id}`;
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'publicado': return { bg: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)' };
      case 'revision': return { bg: 'var(--color-tertiary-container)', color: 'var(--color-on-tertiary-container)' };
      case 'archivado': return { bg: 'var(--color-error-container)', color: 'var(--color-on-error-container)' };
      case 'borrador': return { bg: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' };
      default: return { bg: 'var(--color-surface-variant)', color: 'var(--color-on-surface-variant)' };
    }
  };

  const handleUpdateStatus = async (palabra, nuevoEstado) => {
    const id = getPalabraId(palabra);
    const toastId = toast.loading(`Cambiando estado a ${nuevoEstado}...`);
    try {
      await updatePalabraStatus(id, nuevoEstado);
      toast.success(`Estado actualizado exitosamente`, { id: toastId });
      fetchData();
    } catch (error) {
      toast.error('Error al cambiar el estado', { id: toastId });
    }
  };

  const SkeletonRow = ({ cols }) => (
    <tr style={{ borderBottom: '1px solid var(--color-surface-variant)' }}>
      {Array(cols).fill(0).map((_, i) => (
        <td key={i} style={{ padding: '16px' }}>
          <div style={{ height: '20px', backgroundColor: 'var(--color-surface-variant)', borderRadius: '4px', opacity: 0.6, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </td>
      ))}
    </tr>
  );

  const LanguageBadge = ({ idioma, compact = false }) => {
    const flag = getIdiomaBandera(idioma);
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
        {flag ? (
          <img
            src={getFileUrl(flag)}
            alt={`Bandera de ${getIdiomaNombre(idioma)}`}
            style={{ width: compact ? '22px' : '28px', height: compact ? '16px' : '20px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-surface-variant)', boxShadow: '0 1px 3px rgba(0,0,0,.14)', flexShrink: 0 }}
          />
        ) : (
          <span style={{ width: compact ? '22px' : '28px', height: compact ? '16px' : '20px', borderRadius: '4px', background: 'var(--color-surface-container-high)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, flexShrink: 0 }}>
            {String(idioma?.codigo_iso || '?').slice(0, 2).toUpperCase()}
          </span>
        )}
        <span style={{ fontWeight: 600, color: 'var(--color-on-surface)', whiteSpace: 'nowrap' }}>
          {getIdiomaNombre(idioma, 'Sin idioma')}
        </span>
      </span>
    );
  };

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

      `}</style>
      
      <div className="flex-col-mobile" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div className="rq-page-heading">
            <div className="rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">Diccionario</h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Gestiona el repertorio de palabras, filtra por idioma y estado, y edita a detalle cada término.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 20px',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-primary)',
              border: '2px solid var(--color-primary)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isExportingPdf || loading ? 'not-allowed' : 'pointer',
              opacity: isExportingPdf || loading ? 0.6 : 1,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <FileDown size={18} strokeWidth={2.4} />
            {isExportingPdf ? 'Generando...' : 'Exportar PDF'}
          </button>
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
            Crear Palabra
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)',
          borderRadius: '8px', padding: '12px 16px', flex: 1, minWidth: '250px',
          border: '1px solid var(--color-surface-variant)', boxShadow: 'var(--shadow-level-1)'
        }}>
          <Search size={18} color="var(--color-outline)" />
          <input 
            type="text" 
            placeholder="Buscar por término..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '14px', color: 'var(--color-on-surface)' }}
          />
        </div>

        {/* Filtro por Idioma con RimaqSelect */}
        <div style={{ minWidth: '180px', flex: '0 1 200px' }}>
          <RimaqSelect 
            ariaLabel="Filtrar por idioma"
            value={selectedIdioma || '__all__'} 
            onValueChange={(val) => setSelectedIdioma(val === '__all__' ? '' : val)}
            options={[
              { value: '__all__', label: 'Todos los Idiomas' },
              ...idiomas.map(i => ({
                value: String(i.idioma_id || i.idiomas_id || i.id),
                label: i.nombre || i.nombres
              }))
            ]}
          />
        </div>

        {/* Filtro por Estado con RimaqSelect */}
        <div style={{ minWidth: '180px', flex: '0 1 200px' }}>
          <RimaqSelect 
            ariaLabel="Filtrar por estado"
            value={selectedEstado || '__all__'} 
            onValueChange={(val) => setSelectedEstado(val === '__all__' ? '' : val)}
            options={[
              { value: '__all__', label: 'Todos los Estados' },
              { value: 'publicado', label: 'Publicado' },
              { value: 'revision', label: 'En revisión' },
              { value: 'borrador', label: 'Borrador' },
              { value: 'archivado', label: 'Archivado' }
            ]}
          />
        </div>

        {/* Filtro por Categoría con RimaqSelect */}
        <div style={{ minWidth: '200px', flex: '0 1 220px' }}>
          <RimaqSelect 
            ariaLabel="Filtrar por categoría"
            value={selectedCategoria || '__all__'} 
            onValueChange={(val) => setSelectedCategoria(val === '__all__' ? '' : val)}
            options={[
              { value: '__all__', label: 'Todas las Categorías' },
              ...categorias.map(c => {
                const categoriaId = String(c.categoria_id ?? c.categorias_vocabulario_id ?? c.categorias_id ?? c.id);
                return { value: categoriaId, label: c.nombre };
              })
            ]}
          />
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-variant)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-level-1)' }}>
        <div className="table-responsive-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-container-low)', borderBottom: '2px solid var(--color-surface-variant)' }}>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>TÉRMINO</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>IDIOMA ORIGEN</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>TRADUCCIÓN</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>CREADO POR</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>FONÉTICA</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>CATEGORÍAS</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>ESTADO</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow cols={8} />
                  <SkeletonRow cols={8} />
                  <SkeletonRow cols={8} />
                  <SkeletonRow cols={8} />
                  <SkeletonRow cols={7} />
                </>
              ) : filteredPalabras.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--color-outline)' }}>No se encontraron palabras.</td></tr>
              ) : (
                paginatedPalabras.map((palabra) => {
                  const statusInfo = getStatusColor(palabra.estado);
                  const idiomaOrigen = findIdioma(idiomas, palabra.idioma_id || palabra.idiomas_id, palabra.idioma);
                  const traducciones = getWordTranslations(palabra, idiomas);
                  return (
                    <tr key={getPalabraId(palabra)} style={{ borderBottom: '1px solid var(--color-surface-variant)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-lowest)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {palabra.url_imagen && (
                            <img 
                              src={getFileUrl(palabra.url_imagen)} 
                              alt={palabra.termino} 
                              onClick={() => setSelectedImage({ url: palabra.url_imagen, title: palabra.termino })}
                              title="Ver imagen completa"
                              style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--color-surface-variant)' }} 
                              crossOrigin="anonymous" 
                              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            />
                          )}
                          {palabra.termino}
                          {palabra.url_audio && (
                            <button onClick={() => playAudio(palabra.url_audio)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Volume2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-on-surface-variant)' }}>
                        <LanguageBadge idioma={idiomaOrigen} />
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-on-surface-variant)' }}>
                        {traducciones.length === 0 ? <span style={{ color: 'var(--color-outline)' }}>Sin traducciones</span> : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '190px' }}>
                            {traducciones.map((traduccion) => (
                              <div key={traduccion.key} style={{ padding: '9px 11px', borderRadius: '9px', background: 'var(--color-surface-container-low)', borderLeft: '3px solid var(--color-primary)' }}>
                                <div style={{ fontWeight: 700, color: 'var(--color-on-surface)' }}>{traduccion.termino}</div>
                                <div style={{ marginTop: '7px', paddingTop: '7px', borderTop: '1px solid var(--color-surface-variant)' }}>
                                  <LanguageBadge idioma={traduccion.idioma} compact />
                                  <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--color-outline)' }}>
                                    Traducción creada por: <strong style={{ color: 'var(--color-on-surface-variant)' }}>{getUserDisplayName(traduccion.creadoPor)}</strong>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-on-surface-variant)', minWidth: '150px' }}>
                        <div style={{ fontWeight: 650, color: 'var(--color-on-surface)' }}>{getUserDisplayName(palabra.creadoPor || palabra.creado_por)}</div>
                        {palabra.creado_en && <div style={{ marginTop: '3px', fontSize: '11px', color: 'var(--color-outline)' }}>{new Intl.DateTimeFormat('es-PE').format(new Date(palabra.creado_en))}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-on-surface-variant)' }}>{palabra.transcripcion_fonetica || '-'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-on-surface-variant)' }}>
                        {(!palabra.categorias || palabra.categorias.length === 0) ? '-' : (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {palabra.categorias.map(c => (
                              <span key={c.categoria_id || c.categorias_vocabulario_id || c.categorias_id || c.id} style={{ backgroundColor: 'var(--color-surface-container-high)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                {c.nombre}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span style={{ 
                            backgroundColor: statusInfo.bg, color: statusInfo.color, 
                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, textTransform: 'capitalize'
                          }}>
                            {palabra.estado}
                          </span>
                          {palabra.estado === 'revision' && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <button onClick={() => handleUpdateStatus(palabra, 'publicado')} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', padding: 0 }} title="Publicar"><CheckCircle size={18} /></button>
                              <button onClick={() => handleUpdateStatus(palabra, 'archivado')} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: 0 }} title="Archivar"><XCircle size={18} /></button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                          <button onClick={() => navigate(`/diccionario/palabras/${getPalabraId(palabra)}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }} title="Ver detalles">
                            <Eye size={20} strokeWidth={2} />
                          </button>
                          <button onClick={() => handleOpenEdit(palabra)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }} title="Editar">
                            <Edit2 size={20} strokeWidth={2} />
                          </button>
                          <button onClick={() => handleDelete(palabra)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }} title="Eliminar">
                            <Trash2 size={20} strokeWidth={2} />
                          </button>
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

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', marginBottom: '24px' }}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ 
              padding: '8px 16px', borderRadius: '8px', 
              border: '1px solid var(--color-surface-variant)', 
              backgroundColor: currentPage === 1 ? 'var(--color-surface-variant)' : 'var(--color-surface)', 
              color: currentPage === 1 ? 'var(--color-outline)' : 'var(--color-on-surface)',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
            Página {currentPage} de {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ 
              padding: '8px 16px', borderRadius: '8px', 
              border: '1px solid var(--color-surface-variant)', 
              backgroundColor: currentPage === totalPages ? 'var(--color-surface-variant)' : 'var(--color-surface)', 
              color: currentPage === totalPages ? 'var(--color-outline)' : 'var(--color-on-surface)',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            Siguiente
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="word-editor-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content-responsive word-editor-modal" role="dialog" aria-modal="true" aria-labelledby="word-editor-title" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-level-3)', display: 'flex', flexDirection: 'column' }}>
            <div className="word-editor-header" style={{ borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 id="word-editor-title" style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)' }}>{isEditMode ? 'Editar Palabra' : 'Crear Nueva Palabra'}</h2>
              </div>
              <button className="word-editor-close" aria-label="Cerrar formulario de palabra" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form className="word-editor-form" onSubmit={(event) => { event.preventDefault(); if (currentStep < 3) handleNextWordStep(); }} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="word-editor-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <WizardProgress
                currentStep={currentStep}
                steps={[
                  { label: 'Configuración', description: 'Selecciona el idioma, las categorías y la dificultad.' },
                  { label: 'Término y multimedia', description: 'Escribe el término y agrega su imagen y audio.' },
                  { label: 'Traducciones', description: 'Agrega una o más acepciones con sus ejemplos de uso.' }
                ]}
              />

              {currentStep === 1 && (
                <div className="word-editor-step word-editor-step--settings" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="word-editor-fields-row" style={{ display: 'flex' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Idioma</label>
                      <input type="hidden" {...register('idiomas_id', { required: 'Selecciona un idioma' })} />
                      <RimaqSelect
                        value={String(selectedSourceLanguageId || '')}
                        onValueChange={(val) => setValue('idiomas_id', val, { shouldValidate: true })}
                        placeholder="Seleccione..."
                        options={idiomas.map(i => ({
                          value: String(i.idioma_id || i.idiomas_id || i.id),
                          label: i.nombre || i.nombres
                        }))}
                        className="rimaq-select--full-width"
                      />
                      {errors.idiomas_id && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.idiomas_id.message}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0 }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Nivel de dificultad</label>
                      <input type="number" {...register('nivel_dificultad', { required: 'Indica la dificultad', min: { value: 1, message: 'Mínimo 1' }, max: { value: 5, message: 'Máximo 5' } })} min="1" max="5" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '14px', outline: 'none' }} />
                      {errors.nivel_dificultad && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.nivel_dificultad.message}</span>}
                    </div>
                  </div>

                  <div className="word-editor-categories" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="word-editor-section-heading">
                      <label htmlFor="word-category-search" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Categorías</label>
                      <span>{categorias.filter(c => matchesSearch(c.nombre, categoriaSearchTerm)).length} disponibles</span>
                    </div>
                    <div className="word-editor-search">
                      <Search size={16} aria-hidden="true" />
                      <input id="word-category-search" type="search" placeholder="Buscar categoría..." value={categoriaSearchTerm} onChange={(e) => setCategoriaSearchTerm(e.target.value)} />
                    </div>
                    <div className="word-editor-category-list">
                      {categorias.filter(c => matchesSearch(c.nombre, categoriaSearchTerm)).length === 0 ? (
                        <p className="word-editor-category-empty">No hay categorías que coincidan.</p>
                      ) : (
                        categorias.filter(c => matchesSearch(c.nombre, categoriaSearchTerm)).map(c => (
                          <label className="word-editor-category-option" key={c.categoria_id || c.categorias_vocabulario_id || c.categorias_id || c.id}>
                            <input type="checkbox" value={c.categoria_id || c.categorias_vocabulario_id || c.categorias_id || c.id} {...register('categorias_ids', { validate: value => (Array.isArray(value) ? value.length > 0 : Boolean(value)) || 'Selecciona al menos una categoría' })} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                            <span style={{ fontSize: '14px', color: 'var(--color-on-surface)' }}>{c.nombre}</span>
                          </label>
                        ))
                      )}
                    </div>
                    {errors.categorias_ids && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.categorias_ids.message}</span>}
                  </div>

                  {!isEditMode && (
                    <div className="word-editor-remember" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface-container-low)' }}>
                      <div>
                        <strong style={{ display: 'block', color: 'var(--color-on-surface)', fontSize: '13px' }}>Guardar para reutilizar</strong>
                        <span style={{ display: 'block', marginTop: '3px', color: 'var(--color-on-surface-variant)', fontSize: '11px' }}>Recordar este idioma, categoría y dificultad en las próximas palabras.</span>
                      </div>
                      <button type="button" role="switch" aria-checked={rememberContext} onClick={handleRememberContextToggle} style={{ position: 'relative', flex: '0 0 auto', width: '44px', height: '24px', minHeight: '24px', padding: 0, border: 'none', borderRadius: '99px', cursor: 'pointer', backgroundColor: rememberContext ? 'var(--color-primary)' : 'var(--color-surface-variant)', transition: 'background-color .2s' }}>
                        <span style={{ position: 'absolute', top: '3px', left: rememberContext ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left .2s' }} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                <div className="responsive-grid" style={{ gap: '32px' }}>
                  
                  {/* Columna Izquierda: Datos Básicos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Término</label>
                    <input {...register('termino', { required: 'Requerido' })} placeholder="Sumaq" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '14px', outline: 'none' }} />
                    {errors.termino && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.termino.message}</span>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Transcripción Fonética</label>
                    <input {...register('transcripcion_fonetica')} placeholder="/'su.maq/" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '14px', outline: 'none' }} />
                  </div>
                </div>

                {/* Columna Derecha: Multimedia y Definición */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Imagen */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '6px' }}><ImageIcon size={14} /> Imagen Representativa</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', border: '2px dashed var(--color-outline)', borderRadius: '12px', alignItems: 'center', backgroundColor: 'var(--color-surface-container-lowest)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--color-outline)'} onClick={() => document.getElementById('imagen-upload').click()}>
                      {imagenPreview ? (
                        <img src={imagenPreview} alt="Preview" style={{ width: '100%', height: '140px', objectFit: 'contain', borderRadius: '8px' }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--color-outline)' }}>
                          <Upload size={24} style={{ marginBottom: '8px', margin: '0 auto' }} />
                          <p style={{ margin: 0, fontSize: '13px' }}>Haz clic para subir una imagen</p>
                        </div>
                      )}
                      <input id="imagen-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImagenFile(e.target.files[0]);
                          setImagenPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }} />
                    </div>
                  </div>

                  {/* Audio */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', gap: '6px' }}><FileAudio size={14} /> Audio de Pronunciación (.mp3 o .wav)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', border: '2px dashed var(--color-outline)', borderRadius: '12px', alignItems: 'center', backgroundColor: 'var(--color-surface-container-lowest)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--color-outline)'} onClick={() => document.getElementById('audio-upload').click()}>
                      {audioPreview ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                           <audio controls src={audioPreview} style={{ width: '100%', height: '36px', outline: 'none' }} onClick={(e) => e.stopPropagation()} />
                           <span style={{ fontSize: '12px', color: 'var(--color-primary)', textDecoration: 'underline' }}>Cambiar audio</span>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--color-outline)' }}>
                          <Volume2 size={24} style={{ marginBottom: '8px', margin: '0 auto' }} />
                          <p style={{ margin: 0, fontSize: '13px' }}>Haz clic para subir un audio</p>
                        </div>
                      )}
                      <input id="audio-upload" type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAudioFile(e.target.files[0]);
                          setAudioPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }} />
                    </div>
                  </div>
                  
                </div>
                </div>
              )}

              {currentStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Definiciones y Ejemplos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Traducciones y ejemplos
                      </h3>
                      <button type="button" onClick={() => append({ idioma_definicion_id: '', termino_traducido: '', definicion_origen: '', definicion_destino: '', ejemplo_texto: '', traduccion_ejemplo: '' })} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--color-primary-container)', border: 'none', color: 'var(--color-on-primary-container)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        <Plus size={14} /> Añadir Traducción
                      </button>
                    </div>
                    
                    {fields.map((item, index) => (
                      <div key={item.id} style={{ backgroundColor: 'var(--color-surface-container-low)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-surface-variant)', position: 'relative' }}>
                        {index > 0 && (
                          <button type="button" onClick={() => remove(index)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <X size={16} />
                          </button>
                        )}
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--color-primary)' }}>Acepción {index + 1}</h4>
                        <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--color-on-surface-variant)', lineHeight: 1.45 }}>Una acepción es una traducción posible según el contexto.</p>
                        <div className="flex-col-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Idioma Destino (Traducción) *</label>
                            <input type="hidden" {...register(`definiciones.${index}.idioma_definicion_id`, { required: 'Requerido' })} />
                            <RimaqSelect
                              value={String(watch(`definiciones.${index}.idioma_definicion_id`) || '')}
                              onValueChange={(val) => setValue(`definiciones.${index}.idioma_definicion_id`, val, { shouldValidate: true })}
                              placeholder="Seleccione el idioma..."
                              options={idiomas
                                .filter(i => String(i.idioma_id || i.idiomas_id || i.id) !== String(selectedSourceLanguageId))
                                .map(i => ({
                                  value: String(i.idioma_id || i.idiomas_id || i.id),
                                  label: i.nombre || i.nombres
                                }))}
                              className="rimaq-select--full-width"
                            />
                            {errors.definiciones?.[index]?.idioma_definicion_id && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.definiciones[index].idioma_definicion_id.message}</span>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Término Traducido *</label>
                            <input {...register(`definiciones.${index}.termino_traducido`, { required: 'Requerido' })} placeholder="Hermoso" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', fontSize: '13px', outline: 'none' }} />
                            {errors.definiciones?.[index]?.termino_traducido && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.definiciones[index].termino_traducido.message}</span>}
                          </div>
                        </div>

                        <div aria-hidden="true" style={{ display: 'none' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>¿Qué significa en el idioma origen? *</label>
                            <textarea {...register(`definiciones.${index}.definicion_origen`)} placeholder="Definición opcional en el idioma origen." rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>¿Qué significa en el idioma destino? *</label>
                            <textarea {...register(`definiciones.${index}.definicion_destino`)} placeholder="Definición opcional del término traducido." rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', border: '1px dashed var(--color-outline-variant)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Ejemplo en el idioma original *</label>
                            <textarea {...register(`definiciones.${index}.ejemplo_texto`, { required: 'Agrega un ejemplo para explicar el contexto' })} placeholder="Allinllachu kachkanki?" rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
                            {errors.definiciones?.[index]?.ejemplo_texto && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.definiciones[index].ejemplo_texto.message}</span>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Traducción del ejemplo *</label>
                            <textarea {...register(`definiciones.${index}.traduccion_ejemplo`, { required: 'Traduce el ejemplo al idioma destino' })} placeholder="Hola, ¿cómo estás?" rows={2} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
                            {errors.definiciones?.[index]?.traduccion_ejemplo && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.definiciones[index].traduccion_ejemplo.message}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                          
                  </div>
                </div>
              )}
              </div>

              <div id="rq-step-form-actions" className="rq-form-actions rq-step-form-actions word-editor-actions" style={{ borderTop: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', zIndex: 4, flexShrink: 0, borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', fontWeight: 600, cursor: 'pointer', borderRadius: '8px', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>Cancelar</button>
                <div className="rq-step-form-actions__primary" style={{ display: 'flex', gap: '12px' }}>
                {currentStep > 1 && (
                  <button type="button" onClick={() => setCurrentStep(step => step - 1)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface)', fontWeight: 600, cursor: 'pointer', borderRadius: '8px' }}>Anterior</button>
                )}
                {currentStep < 3 ? (
                  <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleNextWordStep(); }} style={{ padding: '10px 24px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(153, 27, 27, 0.2)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>Continuar</button>
                ) : (
                  <button type="button" onClick={handleSubmit(handlePreSubmit)} style={{ padding: '10px 24px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(153, 27, 27, 0.2)', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>{isEditMode ? 'Guardar cambios' : 'Crear Palabra'}</button>
                )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      {confirmData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1060, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', width: '360px', padding: '32px 24px', textAlign: 'center', boxShadow: 'var(--shadow-level-3)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}><Save size={32} /></div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--color-on-surface)' }}>¿{isEditMode ? 'Guardar cambios' : 'Crear Palabra'}?</h2>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setConfirmData(null)} style={{ flex: 1, padding: '12px', background: 'var(--color-surface-container-high)', border: 'none', borderRadius: '8px', color: 'var(--color-on-surface)', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmSubmit} style={{ flex: 1, padding: '12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Sí, confirmar</button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar palabra?" itemName={itemToDelete?.termino} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />

      {selectedImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '24px', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedImage(null)}>
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}>
              <X size={24} />
            </button>
            <img src={getFileUrl(selectedImage.url)} alt={selectedImage.title} style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} crossOrigin="anonymous" />
          </div>
        </div>
      )}

    </div>
  );
};
