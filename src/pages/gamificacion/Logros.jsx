import React, { useEffect, useState } from 'react';
import { getLogros, createLogro, updateLogro, deleteLogro } from '../../services/logroService';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Award, X, ImagePlus, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { FastAverageColor } from 'fast-average-color';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { RimaqSelect } from '../../components/RimaqSelect';

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

const LogroCard = ({ logro, getImageUrl, handleOpenEdit, handleDelete }) => {
  const [topColor, setTopColor] = useState('var(--color-primary)');
  const imageUrl = getImageUrl(logro.url_imagen_medalla);

  useEffect(() => {
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
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: '12px',
      border: '1px solid var(--color-surface-variant)',
      borderTop: `4px solid ${topColor}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: 'var(--shadow-level-1)',
      transition: 'border-color 0.3s ease'
    }}>
      <div style={{ padding: '16px', flex: 1 }}>
        <div style={{ 
          width: '40px', height: '40px', 
          borderRadius: '10px', 
          backgroundColor: 'var(--color-surface-container)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          overflow: 'hidden',
          marginBottom: '12px'
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt={logro.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
          ) : null}
          <span style={{ display: imageUrl ? 'none' : 'flex', color: 'var(--color-primary)', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            <Award size={20} />
          </span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-on-surface)', fontWeight: 700 }}>
            {logro.titulo}
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-on-surface-variant)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {logro.descripcion}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
          <span style={{ 
            backgroundColor: 'var(--color-secondary-container)', 
            color: 'var(--color-on-secondary-container)', 
            padding: '3px 8px', 
            borderRadius: '6px', 
            fontWeight: 700,
            fontSize: '10px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            {logro.metrica_requerida}: {logro.valor_requerido}
          </span>
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
            XP: {logro.xp_recompensa}
          </span>
        </div>
      </div>

      <div style={{ 
        backgroundColor: 'var(--color-surface-container-low)', 
        padding: '12px 16px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderTop: '1px solid var(--color-surface-variant)'
      }}>
        <span style={{ fontSize: '12px', color: 'var(--color-outline)', fontWeight: 600 }}>
          ID: {logro.logros_id}
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => handleOpenEdit(logro)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 700, padding: 0 }}
          >
            Detalles <Edit2 size={12} strokeWidth={3} />
          </button>
          <button 
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
              color: 'var(--color-outline)', 
              padding: '6px', 
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-outline)'; }}
            title="Eliminar"
          >
            <Trash2 size={16} />
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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [metricaFilter, setMetricaFilter] = useState('__all__');
  const [xpFilter, setXpFilter] = useState('__all__');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const BACKEND_HOST = API_URL.replace('/api/v1', '');
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath.startsWith('/public/') ? `${BACKEND_HOST}${cleanPath}` : `${BACKEND_HOST}/public${cleanPath}`;
  };

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
        <div style={{
          display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface)',
          borderRadius: '10px', padding: '0 16px', flex: 1, minWidth: '240px', height: '44px',
          border: '1px solid var(--color-surface-variant)', boxShadow: 'var(--shadow-level-1)'
        }}>
          <Search size={18} color="var(--color-outline)" />
          <input 
            type="text" 
            placeholder="Buscar por título o descripción..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '14px', color: 'var(--color-on-surface)' }}
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
        gap: '16px' 
      }}>
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '12px',
                border: '1px solid var(--color-surface-variant)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '180px'
              }}>
                <div style={{ padding: '16px', flex: 1 }}>
                  <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '10px', marginBottom: '12px' }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="skeleton" style={{ width: '120px', height: '20px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '100%', height: '16px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '80%', height: '16px', borderRadius: '4px' }}></div>
                  </div>
                </div>
                <div style={{ backgroundColor: 'var(--color-surface-container-low)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-surface-variant)' }}>
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
            />
          ))
        )}
      </div>

      {/* Modal Formulario */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content-responsive" style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-level-3)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)' }}>
                {modalMode === 'create' ? 'Nuevo Logro' : 'Editar Logro'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(handlePreSubmit)} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Campo Título */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Título del Logro</label>
                  <input 
                    {...register('titulo', { required: 'El título es obligatorio' })}
                    placeholder="Primeros Pasos"
                    style={{ 
                      padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)',
                      backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '14px', outline: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-surface-variant)'}
                  />
                  {errors.titulo && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.titulo.message}</span>}
                </div>

                {/* Campo Descripción */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Descripción</label>
                  <textarea 
                    {...register('descripcion', { required: 'La descripción es obligatoria' })}
                    rows="2"
                    placeholder="Describe qué hay que hacer para obtenerlo..."
                    style={{ 
                      padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)',
                      backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '14px', outline: 'none', resize: 'vertical'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-surface-variant)'}
                  />
                  {errors.descripcion && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.descripcion.message}</span>}
                </div>

                {/* Campos Métrica y Valor */}
                <div className="flex-col-mobile" style={{ gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Métrica Requerida *</label>
                    <RimaqSelect
                      ariaLabel="Seleccionar métrica requerida"
                      placeholder="Selecciona una métrica..."
                      value={watch('metrica_requerida') || ''}
                      onValueChange={(val) => setValue('metrica_requerida', val, { shouldValidate: true })}
                      options={METRICAS_LOGRO}
                    />
                    {errors.metrica_requerida && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.metrica_requerida.message}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Valor Requerido</label>
                    <input 
                      type="number"
                      {...register('valor_requerido', { required: 'Requerido' })}
                      placeholder="1"
                      style={{ 
                        padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)',
                        backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '14px', outline: 'none'
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--color-surface-variant)'}
                    />
                    {errors.valor_requerido && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.valor_requerido.message}</span>}
                  </div>
                </div>

                {/* Campo XP Recompensa */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '50%', paddingRight: '8px', boxSizing: 'border-box' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>XP de Recompensa</label>
                  <input 
                    type="number"
                    {...register('xp_recompensa', { required: 'Requerido' })}
                    placeholder="50"
                    style={{ 
                      padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)',
                      backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '14px', outline: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-surface-variant)'}
                  />
                  {errors.xp_recompensa && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.xp_recompensa.message}</span>}
                </div>

                {/* Campo Ícono (File Upload) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Medalla (Imagen)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '64px', height: '64px', borderRadius: '12px', 
                      backgroundColor: 'var(--color-surface-container)', 
                      border: '1px dashed var(--color-outline)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <ImagePlus size={24} color="var(--color-outline)" />
                      )}
                    </div>
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
                        style={{
                          display: 'inline-block',
                          padding: '8px 16px',
                          backgroundColor: 'var(--color-surface-container-high)',
                          border: '1px solid var(--color-surface-variant)',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--color-on-surface)',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-high)'}
                      >
                        Seleccionar Imagen
                      </label>
                      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--color-outline)' }}>
                        Recomendado: PNG o JPG (máx. 2MB).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: 'var(--color-on-surface-variant)', fontWeight: 600, cursor: 'pointer', borderRadius: '8px' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
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
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1060,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content-responsive" style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            padding: '32px 24px',
            boxShadow: 'var(--shadow-level-3)',
            textAlign: 'center'
          }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', 
              backgroundColor: 'var(--color-primary)', color: '#ffffff', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Save size={32} />
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--color-on-surface)' }}>
              {modalMode === 'create' ? `¿Crear ${confirmData.titulo}?` : `¿Guardar cambios?`}
            </h2>
            <p style={{ margin: '0 0 24px 0', color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: '1.5' }}>
              {modalMode === 'create' 
                ? `Estás a punto de crear el nuevo logro "${confirmData.titulo}".` 
                : `Estás guardando los cambios del logro "${originalLogro?.titulo}".`}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setConfirmData(null)}
                style={{ flex: 1, padding: '12px', background: 'var(--color-surface-container-high)', border: 'none', borderRadius: '8px', color: 'var(--color-on-surface)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmSubmit}
                style={{ flex: 1, padding: '12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                {modalMode === 'create' ? 'Sí, crear' : 'Sí, guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
