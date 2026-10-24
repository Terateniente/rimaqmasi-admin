import React, { useEffect, useState } from 'react';
import { getPalabras, addDefinicion, updateDefinicion, deleteDefinicion, updateDefinicionStatus, addEjemplo, updateEjemplo } from '../../services/diccionarioService';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, X, Save, BookType } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { RimaqSelect } from '../../components/RimaqSelect';

export const Definiciones = () => {
  const [palabras, setPalabras] = useState([]);
  const [definiciones, setDefiniciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentId, setCurrentId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const selectedPalabraId = watch('palabra_id');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getPalabras();
      const list = res.data || res || [];
      setPalabras(list);
      
      const flatDefs = [];
      list.forEach(p => {
        if (p.definiciones) {
          p.definiciones.forEach(d => {
            flatDefs.push({ ...d, palabra_termino: p.termino, palabra_id: p.palabras_id });
          });
        }
      });
      setDefiniciones(flatDefs);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    reset({ palabra_id: '', definicion: '', orden_acepcion: 1, ejemplo_texto: '', traduccion_ejemplo: '', ejemplo_id: null });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (def) => {
    setModalMode('edit');
    setCurrentId(def.definiciones_palabra_id || def.id);
    const primerEjemplo = (def.ejemplos && def.ejemplos.length > 0) ? def.ejemplos[0] : null;
    
    reset({
      palabra_id: def.palabra_id,
      definicion: def.definicion,
      orden_acepcion: def.orden_acepcion,
      ejemplo_texto: primerEjemplo ? primerEjemplo.ejemplo_texto : '',
      traduccion_ejemplo: primerEjemplo ? primerEjemplo.traduccion_ejemplo : '',
      ejemplo_id: primerEjemplo ? (primerEjemplo.ejemplos_palabra_id || primerEjemplo.id) : null
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    const isDuplicateOrder = definiciones.some(
      d => String(d.palabra_id) === String(data.palabra_id) &&
           String(d.orden_acepcion) === String(data.orden_acepcion) &&
           String(d.definiciones_palabra_id || d.id) !== String(currentId)
    );

    if (isDuplicateOrder) {
      toast.error(`Ya existe una definición con el orden de acepción ${data.orden_acepcion} para esta palabra.`);
      return;
    }

    const toastId = toast.loading(modalMode === 'create' ? 'Creando...' : 'Actualizando...');
    try {
      const payload = {
        definicion: data.definicion,
        parte_discurso: '-',
        orden_acepcion: parseInt(data.orden_acepcion, 10)
      };

      if (modalMode === 'create') {
        const defRes = await addDefinicion(data.palabra_id, payload);
        const newDefId = defRes.data?.definiciones_palabra_id || defRes.data?.id;
        if (newDefId && data.ejemplo_texto) {
          await addEjemplo(newDefId, {
            ejemplo_texto: data.ejemplo_texto,
            traduccion_ejemplo: data.traduccion_ejemplo || ''
          });
        }
        toast.success('Definición y ejemplo creados', { id: toastId });
      } else {
        await updateDefinicion(currentId, payload);
        if (data.ejemplo_id && data.ejemplo_texto) {
          await updateEjemplo(data.ejemplo_id, {
            ejemplo_texto: data.ejemplo_texto,
            traduccion_ejemplo: data.traduccion_ejemplo || ''
          });
        } else if (!data.ejemplo_id && data.ejemplo_texto) {
          await addEjemplo(currentId, {
             ejemplo_texto: data.ejemplo_texto,
             traduccion_ejemplo: data.traduccion_ejemplo || ''
          });
        }
        toast.success('Definición actualizada', { id: toastId });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Error al guardar', { id: toastId });
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const toastId = toast.loading('Eliminando...');
    try {
      await deleteDefinicion(itemToDelete.definiciones_palabra_id || itemToDelete.id);
      toast.success('Eliminado', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleToggleEstado = async (def) => {
    const id = def.definiciones_palabra_id || def.id;
    const nuevoEstado = def.estado === 'aprobado' ? 'rechazado' : 'aprobado';
    const toastId = toast.loading(`Cambiando estado a ${nuevoEstado}...`);
    try {
      await updateDefinicionStatus(id, nuevoEstado);
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

  const filtered = definiciones.filter(d => 
    (matchesSearch(d.definicion, searchTerm) || 
    matchesSearch(d.palabra_termino, searchTerm)) &&
    (d.estado === 'pendiente' || d.estado === 'revision')
  );

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
            <h1 className="rq-page-heading__title">
              Definiciones
            </h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Gestiona de forma plana todas las definiciones del diccionario.
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
          Nueva Definición
        </button>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '24px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', border: '1px solid var(--color-surface-variant)' }}>
        <Search size={18} color="var(--color-outline)" />
        <input 
          type="text" 
          placeholder="Buscar definición o palabra..." 
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
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>PALABRA</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>DEFINICIÓN</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>ORDEN</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>ESTADO</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                </>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--color-outline)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <BookType size={32} color="var(--color-outline)" style={{ marginBottom: '16px' }} />
                    {searchTerm ? 'No se encontraron definiciones.' : 'Comienza creando la primera definición.'}
                  </div>
                </td></tr>
              ) : (
                filtered.map((def) => (
                  <tr key={def.definiciones_palabra_id || def.id} style={{ borderBottom: '1px solid var(--color-surface-variant)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-lowest)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-on-surface)', fontWeight: 600 }}>{def.palabra_termino}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-on-surface)' }}>{def.definicion}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-on-surface-variant)' }}>{def.orden_acepcion}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button 
                        onClick={() => handleToggleEstado(def)}
                        style={{
                          padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase',
                          backgroundColor: def.estado === 'aprobado' ? '#dcfce7' : def.estado === 'rechazado' ? '#fee2e2' : 'var(--color-surface-variant)',
                          color: def.estado === 'aprobado' ? '#166534' : def.estado === 'rechazado' ? '#dc2626' : 'var(--color-on-surface-variant)'
                        }}
                      >
                        {def.estado || 'pendiente'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                        <button onClick={() => handleOpenEdit(def)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }} title="Editar">
                          <Edit2 size={20} strokeWidth={2} />
                        </button>
                        <button onClick={() => { setItemToDelete(def); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: 0 }} title="Eliminar">
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

      {/* Modal Form */}
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
            maxHeight: '90vh', width: '100%', maxWidth: '540px'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)' }}>
                {modalMode === 'edit' ? 'Editar Definición' : 'Nueva Definición'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'var(--color-surface-variant)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-on-surface-variant)', transition: 'background 0.2s' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Palabra</label>
                  <input type="hidden" {...register('palabra_id', { required: true })} />
                  <div style={{ marginTop: '4px' }}>
                    <RimaqSelect
                      value={String(selectedPalabraId || '')}
                      onValueChange={(val) => setValue('palabra_id', val, { shouldValidate: true })}
                      placeholder="Seleccione palabra..."
                      disabled={modalMode === 'edit'}
                      options={palabras.map(p => ({
                        value: String(p.palabras_id || p.id),
                        label: p.termino
                      }))}
                      className="rimaq-select--full-width"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Definición *</label>
                  <textarea {...register('definicion', { required: true })} placeholder="Que es agradable a los sentidos o tiene bondad..." rows={3} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-outline)', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Ejemplo de Uso *</label>
                  <textarea {...register('ejemplo_texto', { required: true })} placeholder="Allinllachu kachkanki?" rows={2} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-outline)', marginTop: '4px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '12px', borderLeft: '2px solid var(--color-primary)' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Traducción del Ejemplo</label>
                  <textarea {...register('traduccion_ejemplo')} placeholder="Hola, ¿cómo estás?" rows={2} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-outline)', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Orden</label>
                  <input type="number" {...register('orden_acepcion', { required: true })} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-outline)', marginTop: '4px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '8px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar definición?" itemName={itemToDelete?.definicion} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
};
