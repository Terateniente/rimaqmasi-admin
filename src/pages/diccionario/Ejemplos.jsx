import React, { useEffect, useState } from 'react';
import { getPalabras, addEjemplo, updateEjemplo, deleteEjemplo, updateEjemploStatus } from '../../services/diccionarioService';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, X, MessageSquareQuote, Volume2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { RimaqSelect } from '../../components/RimaqSelect';

export const Ejemplos = () => {
  const [palabras, setPalabras] = useState([]);
  const [ejemplos, setEjemplos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentId, setCurrentId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [selectedPalabraId, setSelectedPalabraId] = useState('');
  const [audioFile, setAudioFile] = useState(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const selectedDefinicionId = watch('definicion_id');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const BACKEND_HOST = API_URL.replace('/api/v1', '');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getPalabras();
      const list = res.data || res || [];
      setPalabras(list);
      
      const flatEjs = [];
      list.forEach(p => {
        if (p.definiciones) {
          p.definiciones.forEach(d => {
            if (d.ejemplos) {
              d.ejemplos.forEach(e => {
                flatEjs.push({ 
                  ...e, 
                  palabra_termino: p.termino, 
                  definicion_texto: d.definicion,
                  definicion_id: d.definiciones_palabra_id || d.id
                });
              });
            }
          });
        }
      });
      setEjemplos(flatEjs);
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
    setSelectedPalabraId('');
    setAudioFile(null);
    reset({ definicion_id: '', ejemplo_texto: '', traduccion_ejemplo: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ej) => {
    setModalMode('edit');
    setCurrentId(ej.ejemplos_palabra_id || ej.id);
    setAudioFile(null);
    
    const word = palabras.find(p => p.definiciones && p.definiciones.some(d => (d.definiciones_palabra_id || d.id) === ej.definicion_id));
    if (word) setSelectedPalabraId(word.palabras_id || word.id);

    reset({
      definicion_id: ej.definicion_id,
      ejemplo_texto: ej.ejemplo_texto,
      traduccion_ejemplo: ej.traduccion_ejemplo
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    const toastId = toast.loading(modalMode === 'create' ? 'Creando...' : 'Actualizando...');
    try {
      const payload = {
        ejemplo_texto: data.ejemplo_texto,
        traduccion_ejemplo: data.traduccion_ejemplo
      };
      if (audioFile) payload.audio = audioFile;

      if (modalMode === 'create') {
        await addEjemplo(data.definicion_id, payload);
        toast.success('Ejemplo creado', { id: toastId });
      } else {
        await updateEjemplo(currentId, payload);
        toast.success('Ejemplo actualizado', { id: toastId });
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
      await deleteEjemplo(itemToDelete.ejemplos_palabra_id || itemToDelete.id);
      toast.success('Eliminado', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const filtered = ejemplos.filter(e => 
    matchesSearch(e.ejemplo_texto, searchTerm) || 
    matchesSearch(e.palabra_termino, searchTerm)
  );

  const availableDefs = selectedPalabraId 
    ? (palabras.find(p => (p.palabras_id || p.id).toString() === selectedPalabraId.toString())?.definiciones || [])
    : [];

  const playAudio = (path) => {
    if (!path) return;
    const url = path.startsWith('http') ? path : `${BACKEND_HOST}${path.startsWith('/') ? path : '/' + path}`;
    const audio = new Audio(url);
    audio.play().catch(e => toast.error('No se pudo reproducir el audio'));
  };

  const handleToggleEstado = async (ej) => {
    const id = ej.ejemplos_palabra_id || ej.id;
    const nuevoEstado = ej.estado === 'aprobado' ? 'rechazado' : 'aprobado';
    const toastId = toast.loading(`Cambiando estado a ${nuevoEstado}...`);
    try {
      await updateEjemploStatus(id, nuevoEstado);
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
              Ejemplos
            </h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Gestiona de forma plana todos los ejemplos del diccionario.
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
          Nuevo Ejemplo
        </button>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '24px', backgroundColor: 'var(--color-surface)', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', border: '1px solid var(--color-surface-variant)' }}>
        <Search size={18} color="var(--color-outline)" />
        <input 
          type="text" 
          placeholder="Buscar ejemplo o palabra..." 
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
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>EJEMPLO</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>TRADUCCIÓN</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>AUDIO</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>ESTADO</th>
                <th style={{ padding: '16px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                </>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--color-outline)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <MessageSquareQuote size={32} color="var(--color-outline)" style={{ marginBottom: '16px' }} />
                    {searchTerm ? 'No se encontraron ejemplos.' : 'Comienza creando el primer ejemplo.'}
                  </div>
                </td></tr>
              ) : (
                filtered.map((ej) => (
                  <tr key={ej.ejemplos_palabra_id || ej.id} style={{ borderBottom: '1px solid var(--color-surface-variant)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-lowest)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-on-surface)', fontWeight: 600 }}>{ej.palabra_termino}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-on-surface)' }}>{ej.ejemplo_texto}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-on-surface-variant)' }}>{ej.traduccion_ejemplo || '-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {ej.url_audio ? (
                        <button onClick={() => playAudio(ej.url_audio)} style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                          <Volume2 size={14} /> Reproducir
                        </button>
                      ) : <span style={{ color: 'var(--color-outline)', fontSize: '12px' }}>Sin audio</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button 
                        onClick={() => handleToggleEstado(ej)}
                        style={{
                          padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase',
                          backgroundColor: ej.estado === 'aprobado' ? '#dcfce7' : ej.estado === 'rechazado' ? '#fee2e2' : 'var(--color-surface-variant)',
                          color: ej.estado === 'aprobado' ? '#166534' : ej.estado === 'rechazado' ? '#dc2626' : 'var(--color-on-surface-variant)'
                        }}
                      >
                        {ej.estado || 'pendiente'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                        <button onClick={() => handleOpenEdit(ej)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: 0 }} title="Editar">
                          <Edit2 size={20} strokeWidth={2} />
                        </button>
                        <button onClick={() => { setItemToDelete(ej); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: 0 }} title="Eliminar">
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
            maxHeight: '90vh',
            width: '100%', maxWidth: '540px'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)' }}>
                {modalMode === 'edit' ? 'Editar Ejemplo' : 'Nuevo Ejemplo'}
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
                  <div style={{ marginTop: '4px' }}>
                    <RimaqSelect
                      value={String(selectedPalabraId || '')}
                      onValueChange={(val) => {
                        setSelectedPalabraId(val);
                        setValue('definicion_id', '', { shouldValidate: true });
                      }}
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
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Definición</label>
                  <input type="hidden" {...register('definicion_id', { required: true })} />
                  <div style={{ marginTop: '4px' }}>
                    <RimaqSelect
                      value={String(selectedDefinicionId || '')}
                      onValueChange={(val) => setValue('definicion_id', val, { shouldValidate: true })}
                      placeholder="Seleccione definición..."
                      disabled={modalMode === 'edit' || !selectedPalabraId}
                      options={availableDefs.map(d => ({
                        value: String(d.definiciones_palabra_id || d.id),
                        label: d.definicion
                      }))}
                      className="rimaq-select--full-width"
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Ejemplo de Texto</label>
                  <textarea {...register('ejemplo_texto', { required: true })} rows={2} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-outline)', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Traducción</label>
                  <textarea {...register('traduccion_ejemplo')} rows={2} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-outline)', marginTop: '4px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Audio (Opcional)</label>
                  <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} style={{ width: '100%', marginTop: '4px', fontSize: '12px' }} />
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

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar ejemplo?" itemName={itemToDelete?.ejemplo_texto || itemToDelete?.texto_ejemplo} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
};
