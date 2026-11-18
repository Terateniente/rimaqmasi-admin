import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Search, Plus, Edit2, Trash2, X, MessageSquareQuote, Volume2 } from 'lucide-react';
import { getPalabras, addEjemplo, updateEjemplo, deleteEjemplo, updateEjemploStatus } from '../../services/diccionarioService';
import { resolveMediaUrl } from '../../services/api';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { RimaqSelect } from '../../components/RimaqSelect';
import { PageHeader, EmptyState } from '../../components/PageKit';

const ESTADO_TONE = { aprobado: 'success', rechazado: 'danger' };
const palabraId = (p) => p?.palabra_id || p?.palabras_id || p?.id;
const definicionId = (d) => d?.definicion_id || d?.definiciones_palabra_id || d?.id;
const ejemploId = (e) => e?.ejemplo_id || e?.ejemplos_palabra_id || e?.id;
const ejemploTexto = (e) => e?.ejemplo_texto || e?.texto_ejemplo;
const ejemploTraduccion = (e) => e?.traduccion_ejemplo || e?.texto_significado;

/** Aplana palabra → definición → ejemplo en una sola lista. */
const flattenEjemplos = (palabras) => palabras.flatMap((p) => (p.definiciones || []).flatMap((d) => (d.ejemplos || []).map((e) => ({
  ...e,
  palabra_termino: p.termino,
  definicion_id: definicionId(d),
}))));

export const Ejemplos = () => {
  const [palabras, setPalabras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nuevo, ejemplo = edición
  const [selectedPalabraId, setSelectedPalabraId] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const audioRef = useRef(null);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const isCreate = editing && !ejemploId(editing);
  const ejemplos = flattenEjemplos(palabras);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getPalabras();
      setPalabras(res.data || res || []);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openForm = (ejemplo = {}) => {
    const word = palabras.find((p) => (p.definiciones || []).some((d) => String(definicionId(d)) === String(ejemplo.definicion_id)));
    setSelectedPalabraId(word ? String(palabraId(word)) : '');
    setAudioFile(null);
    reset({ definicion_id: ejemplo.definicion_id || '', ejemplo_texto: ejemploTexto(ejemplo) || '', traduccion_ejemplo: ejemploTraduccion(ejemplo) || '' });
    setEditing(ejemplo);
  };

  const onSubmit = async (data) => {
    const toastId = toast.loading(isCreate ? 'Creando...' : 'Actualizando...');
    try {
      const payload = { ejemplo_texto: data.ejemplo_texto, traduccion_ejemplo: data.traduccion_ejemplo, ...(audioFile && { audio: audioFile }) };
      if (isCreate) await addEjemplo(data.definicion_id, payload);
      else await updateEjemplo(ejemploId(editing), payload);
      toast.success(isCreate ? 'Ejemplo creado' : 'Ejemplo actualizado', { id: toastId });
      setEditing(null);
      fetchData();
    } catch {
      toast.error('Error al guardar', { id: toastId });
    }
  };

  const confirmDelete = async () => {
    const toastId = toast.loading('Eliminando...');
    try {
      await deleteEjemplo(ejemploId(itemToDelete));
      toast.success('Ejemplo eliminado', { id: toastId });
      fetchData();
    } catch {
      toast.error('Error al eliminar', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const toggleEstado = async (ej) => {
    const nuevo = ej.estado === 'aprobado' ? 'rechazado' : 'aprobado';
    const toastId = toast.loading(`Cambiando estado a ${nuevo}...`);
    try {
      await updateEjemploStatus(ejemploId(ej), nuevo);
      toast.success('Estado actualizado exitosamente', { id: toastId });
      fetchData();
    } catch {
      toast.error('Error al cambiar el estado', { id: toastId });
    }
  };

  const playAudio = (path) => {
    audioRef.current?.pause();
    audioRef.current = new Audio(resolveMediaUrl(path));
    audioRef.current.play().catch(() => toast.error('No se pudo reproducir el audio'));
  };

  const filtered = ejemplos.filter((e) => matchesSearch(ejemploTexto(e), searchTerm) || matchesSearch(e.palabra_termino, searchTerm));
  const availableDefs = palabras.find((p) => String(palabraId(p)) === String(selectedPalabraId))?.definiciones || [];

  return (
    <div>
      <PageHeader
        title="Ejemplos"
        description="Gestiona en una sola lista todos los ejemplos del diccionario."
        actions={<button type="button" className="rq-button rq-button--primary" onClick={() => openForm()}><Plus size={18} strokeWidth={2.5} /> Nuevo Ejemplo</button>}
      />

      <div className="rq-toolbar">
        <div className="rq-filter">
          <label htmlFor="ejemplo-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input id="ejemplo-search" type="search" placeholder="Buscar ejemplo o palabra..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rq-table-card">
        <div className="table-responsive-container">
          <table className="rq-table" aria-busy={loading}>
            <thead>
              <tr>
                <th>Palabra</th>
                <th>Ejemplo</th>
                <th>Traducción</th>
                <th>Audio</th>
                <th>Estado</th>
                <th className="rq-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }, (_, i) => (
                  <tr key={i} aria-hidden="true">
                    {[100, 220, 180, 90, 80, 70].map((w, j) => <td key={j}><div className="skeleton" style={{ width: w, height: 20, borderRadius: 6 }} /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="rq-empty-cell">
                    <EmptyState icon={MessageSquareQuote} title={searchTerm ? 'No se encontraron ejemplos' : 'Aún no hay ejemplos'} hint={searchTerm ? 'Intenta con otra búsqueda' : 'Comienza creando el primer ejemplo'} />
                  </td>
                </tr>
              ) : (
                filtered.map((ej) => (
                  <tr key={ejemploId(ej)}>
                    <td className="rq-strong">{ej.palabra_termino}</td>
                    <td>{ejemploTexto(ej)}</td>
                    <td className="rq-muted" style={{ fontSize: 13.5 }}>{ejemploTraduccion(ej) || '—'}</td>
                    <td>
                      {ej.url_audio
                        ? <button type="button" className="rq-text-btn" onClick={() => playAudio(ej.url_audio)}><Volume2 size={14} /> Reproducir</button>
                        : <span className="rq-muted">Sin audio</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`rq-badge rq-badge--${ESTADO_TONE[ej.estado] || 'neutral'} rq-badge--button`}
                        onClick={() => toggleEstado(ej)}
                        title={ej.estado === 'aprobado' ? 'Marcar como rechazado' : 'Marcar como aprobado'}
                      >
                        {ej.estado || 'pendiente'}
                      </button>
                    </td>
                    <td className="rq-col-actions">
                      <div>
                        <button type="button" className="rq-icon-btn" onClick={() => openForm(ej)} title="Editar" aria-label={`Editar ejemplo de ${ej.palabra_termino}`}><Edit2 size={17} /></button>
                        <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => setItemToDelete(ej)} title="Eliminar" aria-label={`Eliminar ejemplo de ${ej.palabra_termino}`}><Trash2 size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ejemplo-modal-title">
          <div className="modal-content-responsive rq-modal-dialog" style={{ maxWidth: 540 }}>
            <div className="rq-modal-header">
              <h2 id="ejemplo-modal-title" className="rq-modal-header__title">{isCreate ? 'Nuevo Ejemplo' : 'Editar Ejemplo'}</h2>
              <button type="button" className="rq-icon-close" onClick={() => setEditing(null)} aria-label="Cerrar modal"><X size={18} /></button>
            </div>
            <form className="rq-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="rq-stack">
                <div className="rq-field">
                  <span className="rq-field__label">Palabra</span>
                  <RimaqSelect
                    ariaLabel="Palabra"
                    value={selectedPalabraId}
                    onValueChange={(val) => { setSelectedPalabraId(val); setValue('definicion_id', '', { shouldValidate: true }); }}
                    placeholder="Seleccione palabra..."
                    disabled={!isCreate}
                    options={palabras.map((p) => ({ value: String(palabraId(p)), label: p.termino }))}
                    className="rimaq-select--full-width"
                  />
                </div>
                <div className="rq-field">
                  <span className="rq-field__label">Definición</span>
                  <input type="hidden" {...register('definicion_id', { required: 'Selecciona una definición' })} />
                  <RimaqSelect
                    ariaLabel="Definición"
                    value={String(watch('definicion_id') || '')}
                    onValueChange={(val) => setValue('definicion_id', val, { shouldValidate: true })}
                    placeholder="Seleccione definición..."
                    disabled={!isCreate || !selectedPalabraId}
                    options={availableDefs.map((d) => ({ value: String(definicionId(d)), label: d.definicion }))}
                    className="rimaq-select--full-width"
                  />
                  {errors.definicion_id && <span className="rq-field__error">{errors.definicion_id.message}</span>}
                </div>
                <div className="rq-field">
                  <label htmlFor="ejemplo-texto-input" className="rq-field__label">Ejemplo de texto</label>
                  <textarea id="ejemplo-texto-input" rows={2} {...register('ejemplo_texto', { required: 'Escribe el ejemplo' })} className={`rq-field__input rq-textarea${errors.ejemplo_texto ? ' rq-field__input--error' : ''}`} />
                  {errors.ejemplo_texto && <span className="rq-field__error">{errors.ejemplo_texto.message}</span>}
                </div>
                <div className="rq-field">
                  <label htmlFor="ejemplo-traduccion-input" className="rq-field__label">Traducción</label>
                  <textarea id="ejemplo-traduccion-input" rows={2} {...register('traduccion_ejemplo')} className="rq-field__input rq-textarea" />
                </div>
                <div className="rq-field">
                  <label htmlFor="ejemplo-audio-upload" className="rq-field__label">Audio (opcional)</label>
                  <input id="ejemplo-audio-upload" type="file" accept="audio/*" hidden onChange={(e) => setAudioFile(e.target.files[0] || null)} />
                  <div className="rq-inline">
                    <label htmlFor="ejemplo-audio-upload" className="rq-upload-pill" style={{ flex: 1, minWidth: 0 }}>
                      <span className="rq-upload-pill__icon"><Volume2 size={15} /></span>
                      <span className={`rq-upload-pill__name${audioFile ? ' rq-upload-pill__name--active' : ''}`}>{audioFile ? audioFile.name : 'Seleccionar archivo de audio...'}</span>
                      <span className="rq-upload-pill__badge">{audioFile ? 'Cambiar' : 'Subir audio'}</span>
                    </label>
                    {audioFile && <button type="button" className="rq-icon-close" onClick={() => setAudioFile(null)} aria-label="Quitar audio seleccionado"><X size={16} /></button>}
                  </div>
                </div>
              </div>
              <div className="rq-form__actions">
                <button type="button" className="rq-button rq-button--ghost" onClick={() => setEditing(null)}>Cancelar</button>
                <button type="submit" className="rq-button rq-button--primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar ejemplo?" itemName={ejemploTexto(itemToDelete)} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />
    </div>
  );
};
