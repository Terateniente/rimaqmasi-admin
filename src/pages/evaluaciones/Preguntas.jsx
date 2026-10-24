import React, { useEffect, useState } from 'react';
import { getCursos } from '../../services/cursoService';
import { getUnidads } from '../../services/unidadService';
import { getLecciones } from '../../services/leccionService';
import { getSesiones } from '../../services/sesionService';
import { 
  getPreguntasByLeccion, 
  createPregunta, 
  updatePregunta, 
  deletePregunta, 
  updatePreguntaAudio,
  createOpcion,
  updateOpcion,
  deleteOpcion
} from '../../services/preguntaService';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, X, Save, FileQuestion, Volume2, List, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { RimaqSelect } from '../../components/RimaqSelect';

export const Preguntas = () => {
  const [cursos, setCursos] = useState([]);
  const [unidads, setUnidads] = useState([]);
  const [lecciones, setLecciones] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedUnidad, setSelectedUnidad] = useState('');
  const [selectedSesion, setSelectedSesion] = useState('');
  const [selectedLeccion, setSelectedLeccion] = useState('');

  // Estados de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentId, setCurrentId] = useState(null);
  
  // Opciones
  const [isOpcionesModalOpen, setIsOpcionesModalOpen] = useState(false);
  const [currentPregunta, setCurrentPregunta] = useState(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const watchTipoPregunta = watch('tipo_pregunta');
  
  // Opciones Form
  const { register: registerOpt, handleSubmit: handleSubmitOpt, reset: resetOpt } = useForm();
  const [editingOpcion, setEditingOpcion] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [cursosRes, unidadsRes, leccionesRes, sesionesRes] = await Promise.all([
        getCursos(),
        getUnidads(),
        getLecciones(),
        getSesiones()
      ]);
      setCursos(Array.isArray(cursosRes) ? cursosRes : (cursosRes.data || []));
      setUnidads(Array.isArray(unidadsRes) ? unidadsRes : (unidadsRes.data || []));
      setLecciones(Array.isArray(leccionesRes) ? leccionesRes : (leccionesRes.data || []));
      setSesiones(Array.isArray(sesionesRes) ? sesionesRes : (sesionesRes.data || []));
    } catch (error) {
      toast.error('Error al cargar datos iniciales');
    }
  };

  useEffect(() => {
    if (selectedLeccion) {
      fetchPreguntas();
    } else {
      setPreguntas([]);
    }
  }, [selectedLeccion]);

  const fetchPreguntas = async () => {
    try {
      setLoading(true);
      const res = await getPreguntasByLeccion(selectedLeccion);
      const data = Array.isArray(res) ? res : (res.data || []);
      setPreguntas(data);
      
      if (currentPregunta) {
        const updatedPregunta = data.find(p => (p.preguntas_id || p.id) === (currentPregunta.preguntas_id || currentPregunta.id));
        if (updatedPregunta) setCurrentPregunta(updatedPregunta);
      }
    } catch (error) {
      toast.error('Error al cargar preguntas');
      setPreguntas([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUnidads = unidads.filter(e => !selectedCurso || String(e.cursos_id) === String(selectedCurso));
  const filteredSesiones = sesiones.filter(s => !selectedUnidad || String(s.unidad_id) === String(selectedUnidad));
  const filteredLecciones = lecciones.filter(l => !selectedSesion || String(l.sesiones_id) === String(selectedSesion));

  const handleOpenCreate = () => {
    if (!selectedLeccion) {
      toast.error('Selecciona una lección primero');
      return;
    }
    setModalMode('create');
    setCurrentId(null);
    reset({
      tipo_pregunta: 'opcion_multiple',
      instruccion: '',
      contenido_principal: '',
      objetivo_fonema_ia: '',
      nivel_dificultad: 1,
      activo: true,
      audio: null
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pregunta) => {
    setModalMode('edit');
    setCurrentId(pregunta.preguntas_id || pregunta.id);
    reset({
      tipo_pregunta: pregunta.tipo_pregunta || 'opcion_multiple',
      instruccion: pregunta.instruccion || '',
      contenido_principal: pregunta.contenido_principal || '',
      objetivo_fonema_ia: pregunta.objetivo_fonema_ia || '',
      nivel_dificultad: pregunta.nivel_dificultad || 1,
      activo: pregunta.activo !== undefined ? pregunta.activo : true,
      audio: null // No pre-cargamos archivo en input file
    });
    setIsModalOpen(true);
  };

  const onSubmitPregunta = async (data) => {
    const toastId = toast.loading(modalMode === 'create' ? 'Creando pregunta...' : 'Actualizando pregunta...');
    try {
      if (modalMode === 'create') {
        const formData = new FormData();
        formData.append('lecciones_id', selectedLeccion);
        formData.append('tipo_pregunta', data.tipo_pregunta);
        formData.append('instruccion', data.instruccion);
        if (data.contenido_principal) formData.append('contenido_principal', data.contenido_principal);
        if (data.objetivo_fonema_ia) formData.append('objetivo_fonema_ia', data.objetivo_fonema_ia);
        if (data.nivel_dificultad) formData.append('nivel_dificultad', data.nivel_dificultad);
        formData.append('activo', data.activo);
        
        if (data.audio && data.audio[0]) {
          formData.append('audio', data.audio[0]);
        }
        
        await createPregunta(formData);
        toast.success('Pregunta creada exitosamente', { id: toastId });
      } else {
        const payload = {
          tipo_pregunta: data.tipo_pregunta,
          instruccion: data.instruccion,
          contenido_principal: data.contenido_principal,
          objetivo_fonema_ia: data.objetivo_fonema_ia,
          nivel_dificultad: parseInt(data.nivel_dificultad),
          activo: data.activo
        };
        await updatePregunta(currentId, payload);
        
        // Update audio if provided
        if (data.audio && data.audio[0]) {
          const audioForm = new FormData();
          audioForm.append('audio', data.audio[0]);
          await updatePreguntaAudio(currentId, audioForm);
        }
        toast.success('Pregunta actualizada exitosamente', { id: toastId });
      }
      setIsModalOpen(false);
      fetchPreguntas();
    } catch (error) {
      toast.error('Error al guardar la pregunta', { id: toastId });
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'pregunta') {
        await deletePregunta(deleteTarget.id);
        toast.success('Pregunta eliminada');
      } else {
        await deleteOpcion(deleteTarget.id);
        toast.success('Opción eliminada');
      }
      setDeleteTarget(null);
      fetchPreguntas();
    } catch (error) {
      toast.error(`Error al eliminar ${deleteTarget.type === 'pregunta' ? 'la pregunta' : 'la opción'}`);
    }
  };

  // --- OPCIONES ---
  const handleOpenOpciones = (pregunta) => {
    setCurrentPregunta(pregunta);
    setEditingOpcion(null);
    resetOpt({ texto_opcion: '', es_correcta: false });
    setIsOpcionesModalOpen(true);
  };

  const onSubmitOpcion = async (data) => {
    const toastId = toast.loading('Guardando opción...');
    try {
      const payload = {
        texto_opcion: data.texto_opcion,
        es_correcta: data.es_correcta
      };

      if (editingOpcion) {
        await updateOpcion(editingOpcion.opciones_respuesta_id || editingOpcion.id, payload);
        toast.success('Opción actualizada', { id: toastId });
      } else {
        await createOpcion(currentPregunta.preguntas_id || currentPregunta.id, payload);
        toast.success('Opción creada', { id: toastId });
      }
      setEditingOpcion(null);
      resetOpt({ texto_opcion: '', es_correcta: false });
      fetchPreguntas(); // Refresh to get updated options
      
      // Update currentPregunta state with new options by refetching it or from the refreshed list
      // For simplicity we will close and let the user reopen or just refresh the list.
    } catch (error) {
      toast.error('Error al guardar opción', { id: toastId });
    }
  };

  return (
    <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
      <div className="flex-col-mobile" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div className="rq-page-heading">
            <div className="rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">Gestión de Preguntas</h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Administra las preguntas y opciones de respuesta por lección.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          disabled={!selectedLeccion}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
            backgroundColor: selectedLeccion ? 'var(--color-primary)' : 'var(--color-surface-variant)',
            color: selectedLeccion ? 'var(--color-on-primary)' : 'var(--color-outline)',
            border: `2px solid ${selectedLeccion ? 'var(--color-primary)' : 'var(--color-surface-variant)'}`,
            borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: selectedLeccion ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease', whiteSpace: 'nowrap'
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
          Agregar Pregunta
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
          <RimaqSelect
            value={selectedCurso || '__all__'}
            onValueChange={(val) => {
              const cId = val === '__all__' ? '' : val;
              setSelectedCurso(cId);
              setSelectedUnidad('');
              setSelectedSesion('');
              setSelectedLeccion('');
            }}
            placeholder="1. Curso"
            options={[
              { value: '__all__', label: '1. Selecciona un Curso' },
              ...cursos.map(c => ({
                value: String(c.cursos_id || c.id),
                label: `${c.idioma_origen?.nombre || 'Origen'} → ${c.idioma_destino?.nombre || 'Destino'}`
              }))
            ]}
            className="rimaq-select--full-width"
          />
        </div>

        <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
          <RimaqSelect
            value={selectedUnidad || '__all__'}
            onValueChange={(val) => {
              const uId = val === '__all__' ? '' : val;
              setSelectedUnidad(uId);
              setSelectedSesion('');
              setSelectedLeccion('');
            }}
            disabled={!selectedCurso}
            placeholder="2. Unidad"
            options={[
              { value: '__all__', label: '2. Selecciona una Unidad' },
              ...filteredUnidads.map(e => ({
                value: String(e.unidad_id || e.id),
                label: e.titulo || e.nombre
              }))
            ]}
            className="rimaq-select--full-width"
          />
        </div>

        <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
          <RimaqSelect
            value={selectedSesion || '__all__'}
            onValueChange={(val) => {
              const sId = val === '__all__' ? '' : val;
              setSelectedSesion(sId);
              setSelectedLeccion('');
            }}
            disabled={!selectedUnidad}
            placeholder="3. Sesión"
            options={[
              { value: '__all__', label: '3. Selecciona una Sesión' },
              ...filteredSesiones.map(s => ({
                value: String(s.sesiones_id || s.id),
                label: s.titulo
              }))
            ]}
            className="rimaq-select--full-width"
          />
        </div>

        <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
          <RimaqSelect
            value={selectedLeccion || '__all__'}
            onValueChange={(val) => setSelectedLeccion(val === '__all__' ? '' : val)}
            disabled={!selectedSesion}
            placeholder="4. Lección"
            options={[
              { value: '__all__', label: '4. Selecciona una Lección' },
              ...filteredLecciones.map(l => ({
                value: String(l.lecciones_id || l.id),
                label: l.titulo
              }))
            ]}
            className="rimaq-select--full-width"
          />
        </div>
      </div>

      {/* Tabla */}
      <div style={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-surface-variant)', boxShadow: 'var(--shadow-level-1)', overflow: 'hidden', marginBottom: '32px' }}>
        <div className="table-responsive-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-container-low)', borderBottom: '1px solid var(--color-surface-variant)' }}>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Instrucción</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Tipo</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Opciones</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700 }}>Estado</th>
                <th style={{ padding: '16px', color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 700, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {Array.from({ length: 5 }, (_, rowIndex) => (
                    <tr key={`skeleton-${rowIndex}`}>
                      {Array.from({ length: 5 }, (_, cellIndex) => (
                        <td key={cellIndex} style={{ padding: '16px' }}>
                          <div className="skeleton" style={{ width: cellIndex === 0 ? '88%' : cellIndex === 4 ? '64px' : '72%', height: cellIndex === 3 ? '24px' : '16px', borderRadius: cellIndex === 3 ? '12px' : '6px', marginLeft: cellIndex === 4 ? 'auto' : 0 }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : !selectedLeccion ? (
                <tr>
                  <td colSpan="5" style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--color-outline)' }}>
                    <FileQuestion size={48} strokeWidth={1.5} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>Selecciona una lección</p>
                    <p style={{ fontSize: '13px', margin: 0 }}>Usa los filtros de arriba para seleccionar el curso, unidad y lección.</p>
                  </td>
                </tr>
              ) : preguntas.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--color-outline)' }}>
                    <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>No hay preguntas en esta lección</p>
                  </td>
                </tr>
              ) : (
                preguntas.map((pregunta, index) => {
                  const bgRow = index % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-container-low)';
                  const isActive = pregunta.activo;
                  return (
                    <tr key={pregunta.preguntas_id || pregunta.id} style={{ borderBottom: '1px solid var(--color-surface-variant)', backgroundColor: bgRow, transition: 'background-color 0.2s ease', opacity: isActive ? 1 : 0.75 }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-variant)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = bgRow}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-on-surface)' }}>{pregunta.instruccion}</span>
                          {pregunta.contenido_principal && <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>{pregunta.contenido_principal}</span>}
                          {pregunta.url_audio && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-secondary)' }}><Volume2 size={14} /><span style={{ fontSize: '11px' }}>Audio adjunto</span></div>}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ backgroundColor: 'var(--color-surface-variant)', color: 'var(--color-on-surface)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{pregunta.tipo_pregunta.replace('_', ' ')}</span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button onClick={() => handleOpenOpciones(pregunta)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-info-container)', color: 'var(--color-info)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                          <List size={14} />
                          Gestionar ({pregunta.opciones_respuesta ? pregunta.opciones_respuesta.length : 0})
                        </button>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isActive ? <CheckCircle size={16} color="var(--color-success)" /> : <XCircle size={16} color="var(--color-outline)" />}
                          <span style={{ fontSize: '12px', fontWeight: 600, color: isActive ? 'var(--color-success)' : 'var(--color-outline)' }}>{isActive ? 'Activo' : 'Inactivo'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                          <button onClick={() => handleOpenEdit(pregunta)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-secondary)', padding: '0' }} title="Editar">
                            <Edit2 size={16} strokeWidth={2.5} />
                          </button>
                          <button onClick={() => setDeleteTarget({ type: 'pregunta', id: pregunta.preguntas_id || pregunta.id, name: pregunta.instruccion })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-error)', padding: '0' }} title="Eliminar">
                            <Trash2 size={16} strokeWidth={2.5} />
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

      {/* Modal Pregunta */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-level-3)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)' }}>{modalMode === 'create' ? 'Nueva Pregunta' : 'Editar Pregunta'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmitPregunta)} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Tipo de Pregunta</label>
                  <input type="hidden" {...register('tipo_pregunta')} />
                  <RimaqSelect
                    value={watchTipoPregunta || 'opcion_multiple'}
                    onValueChange={(val) => setValue('tipo_pregunta', val, { shouldValidate: true })}
                    options={[
                      { value: 'opcion_multiple', label: 'Opción Múltiple' },
                      { value: 'completar_espacio', label: 'Completar Espacio' },
                      { value: 'verdadero_falso', label: 'Verdadero/Falso' },
                      { value: 'reconocimiento_voz', label: 'Reconocimiento de Voz' }
                    ]}
                    className="rimaq-select--full-width"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Instrucción *</label>
                  <input type="text" {...register('instruccion', { required: true })} placeholder="Selecciona la traducción correcta" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Contenido Principal</label>
                  <input type="text" {...register('contenido_principal')} placeholder="Allin p'unchay" style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Audio (.wav, .mp3)</label>
                  <input type="file" accept="audio/*" {...register('audio')} style={{ padding: '10px 0', color: 'var(--color-on-surface)' }} />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Nivel de Dificultad</label>
                    <input type="number" min="1" max="5" {...register('nivel_dificultad')} style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', color: 'var(--color-on-surface)', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, marginTop: '24px' }}>
                    <input type="checkbox" id="activoPreg" {...register('activo')} style={{ width: '18px', height: '18px' }} />
                    <label htmlFor="activoPreg" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-on-surface)' }}>Pregunta Activa</label>
                  </div>
                </div>
              </div>
              <div style={{ padding: '24px 0 0 0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 24px', background: 'var(--color-surface-container-high)', border: 'none', borderRadius: '8px', color: 'var(--color-on-surface)', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  <Save size={18} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Opciones */}
      {isOpcionesModalOpen && currentPregunta && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, backdropFilter: 'blur(4px)' }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-level-3)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)' }}>Opciones de Respuesta</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>{currentPregunta.instruccion}</p>
              </div>
              <button onClick={() => setIsOpcionesModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <form className="flex-col-mobile" onSubmit={handleSubmitOpt(onSubmitOpcion)} style={{ gap: '12px', alignItems: 'flex-start', marginBottom: '24px', backgroundColor: 'var(--color-surface-container-low)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <input type="text" {...registerOpt('texto_opcion', { required: true })} placeholder="Texto de la opción..." style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', outline: 'none', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                  <input type="checkbox" id="es_correcta" {...registerOpt('es_correcta')} style={{ width: '16px', height: '16px' }} />
                  <label htmlFor="es_correcta" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface)', cursor: 'pointer' }}>Correcta</label>
                </div>
                <button type="submit" style={{ padding: '10px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                  {editingOpcion ? 'Actualizar' : 'Agregar'}
                </button>
                {editingOpcion && (
                  <button type="button" onClick={() => { setEditingOpcion(null); resetOpt({ texto_opcion: '', es_correcta: false }); }} style={{ padding: '10px 12px', background: 'transparent', border: '1px solid var(--color-outline)', color: 'var(--color-on-surface)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                )}
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentPregunta.opciones_respuesta && currentPregunta.opciones_respuesta.length > 0 ? (
                  currentPregunta.opciones_respuesta.map((opcion) => (
                    <div key={opcion.opciones_respuesta_id || opcion.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--color-surface)', border: `1px solid ${opcion.es_correcta ? 'var(--color-success)' : 'var(--color-surface-variant)'}`, borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {opcion.es_correcta ? <CheckCircle size={18} color="var(--color-success)" /> : <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--color-outline)' }}></div>}
                        <span style={{ fontSize: '14px', color: 'var(--color-on-surface)', fontWeight: opcion.es_correcta ? 600 : 400 }}>{opcion.texto_opcion}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setEditingOpcion(opcion); resetOpt({ texto_opcion: opcion.texto_opcion, es_correcta: opcion.es_correcta }); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-secondary)' }} title="Editar"><Edit2 size={16} /></button>
                        <button onClick={() => setDeleteTarget({ type: 'opción', id: opcion.opciones_respuesta_id || opcion.id, name: opcion.texto_opcion })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-error)' }} title="Eliminar"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', color: 'var(--color-outline)', fontSize: '14px', padding: '24px 0' }}>No hay opciones agregadas a esta pregunta.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(deleteTarget)} title={`¿Eliminar ${deleteTarget?.type || 'elemento'}?`} itemName={deleteTarget?.name} onCancel={() => setDeleteTarget(null)} onConfirm={executeDelete} />

    </div>
  );
};
