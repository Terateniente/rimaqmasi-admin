import React, { useEffect, useState } from 'react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../../services/diccionarioService';
import { toast } from 'sonner';
import { Search, Plus, Trash2, Tag, X, Save, Edit2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';



export const Categorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getCategorias();
      const list = Array.isArray(res) ? res : (res.data || []);
      setCategorias(list);
    } catch (error) {
      toast.error('No se pudieron cargar las categorías');
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const handleOpenCreate = () => {
    reset({ nombre: '', descripcion: '' });
    setIsEditMode(false);
    setEditId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (categoria) => {
    reset({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || ''
    });
    setIsEditMode(true);
    setEditId(categoria.categoria_id || categoria.categorias_vocabulario_id || categoria.categorias_id || categoria.id);
    setIsModalOpen(true);
  };

  const handleDelete = (categoria) => {
    setItemToDelete(categoria);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const toastId = toast.loading(`Eliminando categoría "${itemToDelete.nombre}"...`);
    try {
      const idToDelete = itemToDelete.categoria_id || itemToDelete.categorias_vocabulario_id || itemToDelete.categorias_id || itemToDelete.id;
      await deleteCategoria(idToDelete);
      toast.success(`Categoría eliminada exitosamente`, { id: toastId });
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar la categoría', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handlePreSubmit = (data) => {
    setConfirmData(data);
  };

  const confirmSubmit = async () => {
    if (!confirmData) return;
    const isEditing = isEditMode;
    const actionText = isEditing ? 'Editando' : 'Creando';
    const successText = isEditing ? 'editada' : 'creada';
    
    const toastId = toast.loading(`${actionText} categoría "${confirmData.nombre}"...`);
    try {
      if (isEditing) {
        await updateCategoria(editId, confirmData);
      } else {
        await createCategoria(confirmData);
      }
      toast.success(`Categoría ${successText} exitosamente`, { id: toastId });
      setIsModalOpen(false);
      setConfirmData(null);
      setIsEditMode(false);
      setEditId(null);
      fetchData();
    } catch (error) {
      toast.error(`Error al ${isEditing ? 'editar' : 'crear'} la categoría`, { id: toastId });
    }
  };

  const filteredCategorias = categorias.filter(cat => 
    matchesSearch(cat.nombre, searchTerm) || 
    matchesSearch(cat.descripcion, searchTerm)
  );

  const totalPages = Math.ceil(filteredCategorias.length / itemsPerPage) || 1;
  const paginatedCategorias = filteredCategorias.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const SkeletonRow = ({ cols }) => (
    <tr style={{ borderBottom: '1px solid var(--color-surface-variant)' }}>
      {Array(cols).fill(0).map((_, i) => (
        <td key={i} style={{ padding: '16px' }}>
          <div style={{ height: '20px', backgroundColor: 'var(--color-surface-variant)', borderRadius: '4px', opacity: 0.6, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </td>
      ))}
    </tr>
  );

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      
      {/* Header */}
      <div className="flex-col-mobile" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div className="rq-page-heading">
            <div className="rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">
              Categorías
            </h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Administra las categorías de vocabulario del diccionario.
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
          Nueva Categoría
        </button>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '24px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', border: '1px solid var(--color-surface-variant)' }}>
        <Search size={18} color="var(--color-outline)" />
        <input 
          type="text" 
          placeholder="Buscar por nombre o descripción..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '14px', color: 'var(--color-on-surface)' }}
        />
      </div>

      {/* Table Content */}
      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-variant)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-level-1)' }}>
        <div className="table-responsive-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-container-low)', borderBottom: '2px solid var(--color-surface-variant)' }}>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>ID</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>NOMBRE</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>DESCRIPCIÓN</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow cols={4} />
                  <SkeletonRow cols={4} />
                  <SkeletonRow cols={4} />
                  <SkeletonRow cols={4} />
                  <SkeletonRow cols={4} />
                </>
              ) : filteredCategorias.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--color-outline)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Tag size={32} color="var(--color-outline)" style={{ marginBottom: '16px' }} />
                    {searchTerm ? 'No se encontraron categorías.' : 'Comienza creando la primera categoría.'}
                  </div>
                </td></tr>
              ) : (
                paginatedCategorias.map((categoria) => (
                  <tr key={categoria.categoria_id || categoria.categorias_vocabulario_id || categoria.categorias_id || categoria.id} style={{ borderBottom: '1px solid var(--color-surface-variant)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-lowest)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>{categoria.categoria_id || categoria.categorias_vocabulario_id || categoria.categorias_id || categoria.id}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-on-surface)', fontWeight: 600 }}>{categoria.nombre}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-on-surface-variant)' }}>{categoria.descripcion || '-'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                        <button onClick={() => handleOpenEdit(categoria)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }} title="Editar">
                          <Edit2 size={20} strokeWidth={2} />
                        </button>
                        <button onClick={() => handleDelete(categoria)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }} title="Eliminar">
                          <Trash2 size={20} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Moda Form */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '24px'
        }}>
          <div className="modal-content-responsive" style={{
            backgroundColor: 'var(--color-surface)', borderRadius: '24px', 
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            maxHeight: '90vh'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)' }}>
                {isEditMode ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'var(--color-surface-variant)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-on-surface-variant)', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)'}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <form id="categoriaForm" onSubmit={handleSubmit(handlePreSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                    Nombre de la Categoría <span style={{ color: 'var(--color-error)' }}>*</span>
                  </label>
                  <input 
                    type="text"
                    {...register('nombre', { required: 'El nombre es obligatorio' })}
                    placeholder="Animales, Saludos, Verbos..."
                    style={{
                      padding: '12px 16px', backgroundColor: 'var(--color-surface-container-low)',
                      border: `1px solid ${errors.nombre ? 'var(--color-error)' : 'var(--color-outline-variant)'}`,
                      borderRadius: '12px', fontSize: '14px', color: 'var(--color-on-surface)',
                      outline: 'none', transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => { if (!errors.nombre) e.target.style.borderColor = 'var(--color-primary)'; }}
                    onBlur={(e) => { if (!errors.nombre) e.target.style.borderColor = 'var(--color-outline-variant)'; }}
                  />
                  {errors.nombre && <span style={{ color: 'var(--color-error)', fontSize: '12px' }}>{errors.nombre.message}</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                    Descripción
                  </label>
                  <textarea 
                    {...register('descripcion')}
                    placeholder="Breve descripción de los términos que incluye esta categoría..."
                    rows={4}
                    style={{
                      padding: '12px 16px', backgroundColor: 'var(--color-surface-container-low)',
                      border: '1px solid var(--color-outline-variant)',
                      borderRadius: '12px', fontSize: '14px', color: 'var(--color-on-surface)',
                      outline: 'none', transition: 'border-color 0.2s', resize: 'vertical'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-outline-variant)'}
                  />
                </div>

              </form>
            </div>

            <div style={{ padding: '20px 24px', backgroundColor: 'var(--color-surface-container-low)', borderTop: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, backgroundColor: 'transparent', color: 'var(--color-on-surface-variant)', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="categoriaForm"
                style={{
                  padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                  backgroundColor: 'var(--color-primary)', color: 'white', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Save size={16} /> Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar categoría?" itemName={itemToDelete?.nombre} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />

      {confirmData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '24px'
        }}>
          <div className="modal-content-responsive" style={{
            backgroundColor: 'var(--color-surface)', borderRadius: '24px', padding: '32px',
            textAlign: 'center', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--color-primary-container)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
              <Tag size={32} color="var(--color-on-primary-container)" />
            </div>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              Confirmar Creación
            </h2>
            <p style={{ margin: '0 0 32px 0', fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: '1.5' }}>
              ¿Estás seguro de crear la categoría <strong>"{confirmData.nombre}"</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setConfirmData(null)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, backgroundColor: 'var(--color-surface-container)', color: 'var(--color-on-surface)', border: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmSubmit}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
