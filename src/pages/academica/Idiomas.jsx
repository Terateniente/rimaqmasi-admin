import { useEffect, useState } from 'react';
import { getIdiomas, createIdioma, updateIdioma, deleteIdioma, uploadFlag } from '../../services/idiomaService';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Globe, X, ImagePlus, Save, ShieldCheck, Eye, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { FastAverageColor } from 'fast-average-color';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';

const IdiomaCard = ({ idioma, getImageUrl, handleOpenEdit, handleDelete }) => {
  const [topColor, setTopColor] = useState('var(--color-primary)');
  const [flagLoadFailed, setFlagLoadFailed] = useState(false);
  const flagUrl = getImageUrl(idioma.url_icono_bandera);

  useEffect(() => {
    setFlagLoadFailed(false);
    if (flagUrl) {
      const fac = new FastAverageColor();
      fac.getColorAsync(flagUrl, { crossOrigin: 'anonymous' })
        .then(color => {
          setTopColor(color.hex);
        })
        .catch(() => {
          setFlagLoadFailed(true);
          setTopColor('var(--color-primary)');
        });
    } else {
      setTopColor('var(--color-primary)');
    }
  }, [flagUrl]);

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
          {flagUrl && !flagLoadFailed ? (
            <img src={flagUrl} alt={idioma.nombres} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" onError={() => setFlagLoadFailed(true)} />
          ) : null}
          <span aria-hidden={flagUrl && !flagLoadFailed} style={{ display: flagUrl && !flagLoadFailed ? 'none' : 'flex', fontWeight: 'bold', fontSize: '18px', color: 'var(--color-primary)', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            {(idioma.nombres || idioma.nombre || '?').charAt(0)}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--color-on-surface)', fontWeight: 700 }}>
            {idioma.nombres || idioma.nombre || 'Desconocido'}
          </h3>
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
            {idioma.codigo_iso}
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
          ID: {idioma.idioma_id}
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => handleOpenEdit(idioma)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 700, padding: 0 }}
          >
            Detalles <Edit2 size={12} strokeWidth={3} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(idioma);
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

export const Idiomas = () => {
  const [idiomas, setIdiomas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [currentId, setCurrentId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [originalIdioma, setOriginalIdioma] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  
  const [flagFile, setFlagFile] = useState(null);
  const [flagPreview, setFlagPreview] = useState(null);
  
  // Nuevo estado para la búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  // Utilidad para resolver la URL de la imagen
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const BACKEND_HOST = API_URL.replace('/api/v1', '');
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath.startsWith('/public') ? `${BACKEND_HOST}${cleanPath}` : `${BACKEND_HOST}/public${cleanPath}`;
  };

  const fetchIdiomas = async () => {
    try {
      setLoading(true);
      const res = await getIdiomas();
      const list = Array.isArray(res) ? res : (res.data || []);
      setIdiomas(list);
    } catch (error) {
      toast.error('No se pudieron cargar los idiomas');
      setIdiomas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdiomas();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setOriginalIdioma(null);
    reset();
    setFlagFile(null);
    setFlagPreview(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (idioma) => {
    setModalMode('edit');
    setCurrentId(idioma.idioma_id || idioma.id);
    setOriginalIdioma(idioma);
    setValue('nombres', idioma.nombres);
    setValue('codigo_iso', idioma.codigo_iso);
    setValue('url_icono_bandera', idioma.url_icono_bandera);
    setFlagFile(null);
    setFlagPreview(getImageUrl(idioma.url_icono_bandera));
    setIsModalOpen(true);
  };

  const handleDelete = (idioma) => {
    setItemToDelete(idioma);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const toastId = toast.loading(`Eliminando el idioma "${itemToDelete.nombres}"...`);
    try {
      const idToDelete = itemToDelete.idioma_id || itemToDelete.idioma_id || itemToDelete.id;
      await deleteIdioma(idToDelete);
      toast.success(`Idioma "${itemToDelete.nombres}" eliminado exitosamente`, { id: toastId });
      fetchIdiomas();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar el idioma', { id: toastId });
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
    const toastId = toast.loading(`${actionName} idioma "${data.nombres}"...`);
    try {
      let finalUrl = data.url_icono_bandera || '';

      if (flagFile) {
        const uploadRes = await uploadFlag(flagFile);
        if (uploadRes.success) {
          finalUrl = uploadRes.url;
        }
      }

      const payload = { ...data, url_icono_bandera: finalUrl };

      if (modalMode === 'create') {
        await createIdioma(payload);
        toast.success(`Idioma "${payload.nombres}" creado exitosamente`, { id: toastId });
      } else {
        await updateIdioma(currentId, payload);
        toast.success(`Idioma "${payload.nombres}" actualizado exitosamente`, { id: toastId });
      }
      setIsModalOpen(false);
      setConfirmData(null);
      fetchIdiomas();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} el idioma`, { id: toastId });
    }
  };

  // Filtrado de idiomas en base a la búsqueda
  const filteredIdiomas = idiomas.filter(idioma => 
    (idioma.nombres || idioma.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (idioma.codigo_iso && idioma.codigo_iso.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredIdiomas.length / itemsPerPage) || 1;
  const paginatedIdiomas = filteredIdiomas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
      
      {/* Cabecera */}
      <div className="flex-col-mobile" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div className="rq-page-heading">
            <div className="rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">Gestión de Idiomas</h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Administre la oferta lingüística de Rimaqmasi Edu, configurando códigos ISO y representaciones visuales.
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
          Agregar Nuevo Idioma
        </button>
      </div>

      {/* Barra de Filtros Compacta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          
          {/* Buscar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Palabra clave</label>
            <div style={{
              display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface-container-low)',
              borderRadius: '12px', padding: '12px 16px',
              border: '1px solid var(--color-outline-variant)', transition: 'all 0.2s'
            }} onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--color-outline-variant)'}>
              <Search size={18} color="var(--color-outline)" strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Buscar por nombre o código ISO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '14px', fontWeight: 500, color: 'var(--color-on-surface)' }}
              />
            </div>
          </div>
        </div>

      {/* Grid de Idiomas */}
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
                height: '140px'
              }}>
                <div style={{ padding: '16px', flex: 1 }}>
                  <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '10px', marginBottom: '12px' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="skeleton" style={{ width: '100px', height: '20px', borderRadius: '4px' }}></div>
                    <div className="skeleton" style={{ width: '30px', height: '16px', borderRadius: '6px' }}></div>
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
        ) : paginatedIdiomas.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '64px 32px', color: 'var(--color-outline)' }}>
            <Globe size={48} strokeWidth={1.5} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>
              {searchTerm ? 'No se encontraron idiomas con esa búsqueda' : 'Aún no hay idiomas registrados'}
            </p>
            <p style={{ fontSize: '13px', margin: 0 }}>
              {searchTerm ? 'Intenta con otra búsqueda' : 'Crea el primer idioma haciendo clic en "Agregar Nuevo Idioma"'}
            </p>
          </div>
        ) : (
          paginatedIdiomas.map((idioma, i) => {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
            const BACKEND_HOST = API_URL.replace('/api/v1', '');
            const getImageUrl = (path) => {
              if (!path) return null;
              if (path.startsWith('http')) return path;
              const cleanPath = path.startsWith('/') ? path : `/${path}`;
              return cleanPath.startsWith('/public') ? `${BACKEND_HOST}${cleanPath}` : `${BACKEND_HOST}/public${cleanPath}`;
            };
            return (
              <IdiomaCard 
                key={idioma.idioma_id || idioma.id || i}
                idioma={idioma}
                getImageUrl={getImageUrl}
                handleOpenEdit={handleOpenEdit}
                handleDelete={handleDelete}
              />
            );
          })
        )}
      </div>

      {/* Paginación */}
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
            boxShadow: 'var(--shadow-level-3)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)' }}>
                {modalMode === 'create' ? 'Nuevo Idioma' : 'Editar Idioma'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(handlePreSubmit)} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Campo Nombre */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Nombre del Idioma</label>
                  <input 
                    {...register('nombres', { required: 'El nombre es obligatorio' })}
                    placeholder="Portugués"
                    style={{ 
                      padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)',
                      backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '14px', outline: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-surface-variant)'}
                  />
                  {errors.nombre && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.nombre.message}</span>}
                </div>

                {/* Campo ISO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Código ISO</label>
                  <input 
                    {...register('codigo_iso', { required: 'El código ISO es obligatorio' })}
                    placeholder="pt"
                    style={{ 
                      padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)',
                      backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', fontSize: '14px', outline: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--color-surface-variant)'}
                  />
                  {errors.codigo_iso && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.codigo_iso.message}</span>}
                </div>

                {/* Campo Ícono (File Upload) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Ícono / Bandera</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '64px', height: '64px', borderRadius: '12px', 
                      backgroundColor: 'var(--color-surface-container)', 
                      border: '1px dashed var(--color-outline)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {flagPreview ? (
                        <img src={flagPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                              toast.error('El archivo es demasiado grande. El límite es 5MB.');
                              e.target.value = '';
                              return;
                            }
                            setFlagFile(file);
                            setFlagPreview(URL.createObjectURL(file));
                          }
                        }}
                        style={{ display: 'none' }}
                        id="flag-upload"
                      />
                      <label 
                        htmlFor="flag-upload"
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
                  {modalMode === 'create' ? 'Crear Idioma' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar idioma?" itemName={itemToDelete?.nombres || itemToDelete?.nombre} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />

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
              {modalMode === 'create' ? `¿Crear ${confirmData.nombres}?` : `¿Guardar cambios?`}
            </h2>
            <p style={{ margin: '0 0 24px 0', color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: '1.5' }}>
              {modalMode === 'create' 
                ? `Estás a punto de crear el nuevo idioma "${confirmData.nombres}".` 
                : `Estás cambiando el idioma "${originalIdioma?.nombres}" por "${confirmData.nombres}".`}
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
