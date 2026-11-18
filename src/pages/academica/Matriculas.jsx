import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Search, Plus, Edit2, Trash2, X, BookOpen, Calendar, CheckCircle, XCircle, Clock, ChevronDown } from 'lucide-react';
import { getMatriculas, createMatricula, updateMatricula, deleteMatricula } from '../../services/matriculaService';
import { getCursos } from '../../services/cursoService';
import { getUsuarios, buscarUsuarios } from '../../services/userService';
import { resolveMediaUrl } from '../../services/api';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { RimaqSelect } from '../../components/RimaqSelect';
import { PageHeader, EmptyState, Pagination } from '../../components/PageKit';

const ITEMS_PER_PAGE = 5;
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const ESTADOS = {
  activo: { label: 'Activo', tone: 'success', icon: CheckCircle },
  completado: { label: 'Completado', tone: 'secondary', icon: CheckCircle },
  pausado: { label: 'Pausado', tone: 'warning', icon: Clock },
  cancelado: { label: 'Cancelado', tone: 'danger', icon: XCircle },
};
const ESTADO_OPTIONS = Object.entries(ESTADOS).map(([value, e]) => ({ value, label: e.label }));

const list = (r) => (Array.isArray(r) ? r : r?.data || []);
const matriculaId = (m) => m?.matricula_id || m?.matriculas_id || m?.id;
const usuarioId = (u) => u?.usuarios_id || u?.usuario_id || u?.id;
const cursoId = (c) => c?.curso_id || c?.cursos_id || c?.id;
const fullName = (u) => `${u?.nombres || u?.nombre || ''} ${u?.apellidos || u?.apellido || ''}`.trim();
const emailOf = (u) => u?.email || u?.correo || '';
const isStudent = (u) => !u.rol || u.rol.toLowerCase() === 'estudiante' || u.rol_id === 2;
const cursoLabel = (c) => (c ? `${c.nombre || `Curso #${cursoId(c)}`} · ${c.nivel || 'A1'}` : '');
const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
};

const Avatar = ({ user, fallback }) => {
  const [failed, setFailed] = useState(false);
  const src = resolveMediaUrl(user?.url_foto_perfil);
  return (
    <span className="rq-person__avatar" style={{ width: 32, height: 32 }} aria-hidden="true">
      {src && !failed
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={() => setFailed(true)} />
        : (fullName(user) || fallback || 'U')[0].toUpperCase()}
    </span>
  );
};

/** Combobox de estudiantes con búsqueda en servidor (debounce 500 ms). */
const StudentPicker = ({ usuarios, value, onChange, invalid }) => {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const selected = usuarios.concat(results).find((u) => String(usuarioId(u)) === String(value));

  useEffect(() => {
    if (!term.trim()) {
      setResults(usuarios.filter(isStudent));
      return undefined;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(list(await buscarUsuarios(term)).filter(isStudent));
      } catch (err) {
        console.error('Error al buscar estudiantes:', err);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [term, usuarios]);

  const close = () => { setOpen(false); setTerm(''); };

  return (
    <div className="rq-combobox" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) close(); }}>
      <button
        type="button"
        className={`rq-field__input rq-combobox__trigger${invalid ? ' rq-field__input--error' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className={selected ? '' : 'rq-muted'}>
          {selected ? `${fullName(selected)} (${emailOf(selected)})` : 'Seleccionar estudiante'}
        </span>
        <ChevronDown size={16} className={open ? 'is-open' : ''} aria-hidden="true" />
      </button>

      {open && (
        <div className="rq-combobox__panel">
          <div className="rq-search-box" style={{ margin: 8, height: 36, minHeight: 36 }}>
            <Search size={14} aria-hidden="true" />
            <input
              autoFocus
              type="search"
              placeholder="Buscar por nombre completo..."
              aria-label="Buscar estudiante"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <div className="rq-combobox__list" role="listbox" aria-label="Estudiantes">
            {searching ? (
              <p className="rq-combobox__note">Buscando...</p>
            ) : results.length === 0 ? (
              <p className="rq-combobox__note">No se encontraron estudiantes</p>
            ) : results.map((u) => {
              const id = usuarioId(u);
              const isSelected = String(id) === String(value);
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="rq-combobox__option"
                  onClick={() => { onChange(id); close(); }}
                >
                  <strong>{fullName(u)}</strong>
                  <small>{emailOf(u)}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const Matriculas = () => {
  const [matriculas, setMatriculas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nueva, matrícula = edición
  const [itemToDelete, setItemToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();
  const isCreate = editing && !matriculaId(editing);

  const findUsuario = (m) => usuarios.find((u) => String(usuarioId(u)) === String(m.usuarios_id || m.usuario_id)) || m.usuario;
  const findCurso = (m) => cursos.find((c) => String(cursoId(c)) === String(m.cursos_id || m.curso_id)) || m.curso;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [m, c, u] = await Promise.all([getMatriculas(), getCursos(), getUsuarios()]);
      setMatriculas(list(m));
      setCursos(list(c));
      setUsuarios(list(u));
    } catch {
      toast.error('No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const openForm = (matricula = {}) => {
    reset(matriculaId(matricula)
      ? { estado: matricula.estado, fecha_fin: matricula.fecha_fin ? matricula.fecha_fin.split('T')[0] : '' }
      : { usuarios_id: '', cursos_id: '' });
    setEditing(matricula);
  };

  const confirmDelete = async () => {
    const toastId = toast.loading('Eliminando matrícula...');
    try {
      await deleteMatricula(matriculaId(itemToDelete));
      toast.success('Matrícula eliminada exitosamente', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const onSubmit = async (data) => {
    const toastId = toast.loading(`${isCreate ? 'Creando' : 'Actualizando'} matrícula...`);
    try {
      if (isCreate) {
        await createMatricula({ usuarios_id: parseInt(data.usuarios_id, 10), cursos_id: parseInt(data.cursos_id, 10) });
      } else {
        const fechaFin = data.fecha_fin ? new Date(data.fecha_fin) : (data.estado === 'completado' ? new Date() : null);
        await updateMatricula(matriculaId(editing), { estado: data.estado, ...(fechaFin && { fecha_fin: fechaFin.toISOString() }) });
      }
      toast.success(`Matrícula ${isCreate ? 'creada' : 'actualizada'} exitosamente`, { id: toastId });
      setEditing(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${isCreate ? 'crear' : 'actualizar'} la matrícula`, { id: toastId });
    }
  };

  const filtered = matriculas
    .filter((m) => {
      const u = findUsuario(m);
      const textOk = [fullName(u), emailOf(u), findCurso(m)?.nombre].some((t) => matchesSearch(t, searchTerm));
      return textOk && (statusFilter === 'all' || m.estado === statusFilter);
    })
    .sort((a, b) => new Date(b.created_at || b.fecha_inicio || 0) - new Date(a.created_at || a.fecha_inicio || 0));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const visible = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      <PageHeader
        title="Matrículas"
        description="Administra las inscripciones de los estudiantes a los cursos."
        actions={(
          <button type="button" className="rq-button rq-button--primary" onClick={() => openForm()}>
            <Plus size={18} strokeWidth={2.5} /> Nueva Matrícula
          </button>
        )}
      />

      <div className="rq-toolbar">
        <div className="rq-filter">
          <label htmlFor="matricula-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input id="matricula-search" type="search" placeholder="Nombre o correo del estudiante..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="rq-filter">
          <label>Estado de matrícula</label>
          <RimaqSelect
            ariaLabel="Estado de matrícula"
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={[
              { value: 'all', label: 'Todos los estados' },
              { value: 'activo', label: 'Activos' },
              { value: 'completado', label: 'Completados' },
              { value: 'pausado', label: 'Pausados' },
              { value: 'cancelado', label: 'Cancelados' },
            ]}
          />
        </div>
      </div>

      <div className="rq-table-card">
        <div className="table-responsive-container">
          <table className="rq-table" aria-busy={loading}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th>Estudiante</th>
                <th>Curso</th>
                <th>Fechas</th>
                <th>Estado</th>
                <th className="rq-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} aria-hidden="true">
                    {[40, 180, 160, 110, 90, 60].map((w, j) => (
                      <td key={j}><div className="skeleton" style={{ width: w, height: 20, borderRadius: 6 }} /></td>
                    ))}
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan="6" className="rq-empty-cell">
                    <EmptyState icon={BookOpen} title="No se encontraron matrículas" hint="Modifica los filtros o agrega una nueva matrícula" />
                  </td>
                </tr>
              ) : (
                visible.map((m, i) => {
                  const id = matriculaId(m);
                  const usuario = findUsuario(m);
                  const curso = findCurso(m);
                  const estado = ESTADOS[m.estado];
                  const StatusIcon = estado?.icon || Clock;
                  const nombre = fullName(usuario) || `Usuario #${m.usuarios_id || m.usuario_id}`;
                  return (
                    <tr key={id || i} className={m.estado === 'cancelado' ? 'is-muted' : ''}>
                      <td><span className="rq-badge">#{String(id).padStart(3, '0')}</span></td>
                      <td>
                        <div className="rq-person" style={{ marginTop: 0, gap: 12 }}>
                          <Avatar user={usuario} />
                          <div>
                            <strong>{nombre}</strong>
                            <small>{emailOf(usuario) || '—'}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rq-inline" style={{ gap: 12 }}>
                          <span className="rq-icon-chip rq-icon-chip--primary" aria-hidden="true"><BookOpen size={18} /></span>
                          <div className="rq-cell-stack">
                            <span className="rq-route__target">{curso?.nombre || `Curso #${m.cursos_id || m.curso_id}`}</span>
                            <span className="rq-muted">{curso?.nivel || 'A1'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rq-cell-stack rq-muted">
                          <span className="rq-inline" style={{ gap: 6 }}><Calendar size={12} aria-hidden="true" /> Inicio: {formatDate(m.fecha_inicio)}</span>
                          {m.fecha_fin && <span className="rq-inline" style={{ gap: 6 }}><CheckCircle size={12} aria-hidden="true" /> Fin: {formatDate(m.fecha_fin)}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="rq-cell-stack" style={{ gap: 8 }}>
                          <span className={`rq-badge rq-badge--${estado?.tone || 'neutral'}`}>
                            <StatusIcon size={12} aria-hidden="true" /> {estado?.label || m.estado || 'Desconocido'}
                          </span>
                          {m.progresoCurso && (
                            <span className="rq-progress" title={`Progreso ${Number(m.progresoCurso.porcentaje).toFixed(0)}%`}>
                              <span className="rq-progress__track">
                                <span className={`rq-progress__fill rq-progress__fill--${estado?.tone || 'neutral'}`} style={{ width: `${m.progresoCurso.porcentaje}%` }} />
                              </span>
                              {Number(m.progresoCurso.porcentaje).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="rq-col-actions">
                        <div>
                          <button type="button" className="rq-icon-btn" onClick={() => openForm(m)} title="Editar" aria-label={`Editar matrícula de ${nombre}`}><Edit2 size={17} /></button>
                          <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => setItemToDelete(m)} title="Eliminar" aria-label={`Eliminar matrícula de ${nombre}`}><Trash2 size={17} /></button>
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

      <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />

      {editing && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="matricula-modal-title">
          <div className="modal-content-responsive rq-modal-dialog">
            <div className="rq-modal-header">
              <h2 id="matricula-modal-title" className="rq-modal-header__title">{isCreate ? 'Nueva Matrícula' : 'Editar Matrícula'}</h2>
              <button type="button" className="rq-icon-close" onClick={() => setEditing(null)} aria-label="Cerrar modal"><X size={18} /></button>
            </div>

            <form className="rq-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="rq-stack" style={{ gap: 20 }}>
                {isCreate ? (
                  <>
                    <div className="rq-field">
                      <span className="rq-field__label">Estudiante</span>
                      <StudentPicker
                        usuarios={usuarios}
                        value={watch('usuarios_id')}
                        invalid={Boolean(errors.usuarios_id)}
                        onChange={(id) => setValue('usuarios_id', id, { shouldValidate: true })}
                      />
                      <input type="hidden" {...register('usuarios_id', { required: 'Selecciona un estudiante' })} />
                      {errors.usuarios_id && <span className="rq-field__error">{errors.usuarios_id.message}</span>}
                    </div>
                    <div className="rq-field">
                      <span className="rq-field__label">Curso</span>
                      <RimaqSelect
                        ariaLabel="Curso"
                        value={String(watch('cursos_id') || '')}
                        onValueChange={(val) => setValue('cursos_id', val, { shouldValidate: true })}
                        placeholder="Seleccionar curso"
                        options={cursos.map((c) => ({ value: String(cursoId(c)), label: cursoLabel(c) }))}
                        className="rimaq-select--full-width"
                      />
                      <input type="hidden" {...register('cursos_id', { required: 'Selecciona un curso' })} />
                      {errors.cursos_id && <span className="rq-field__error">{errors.cursos_id.message}</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rq-field">
                      <span className="rq-field__label">Estado de la Matrícula</span>
                      <input type="hidden" {...register('estado', { required: 'Requerido' })} />
                      <RimaqSelect
                        ariaLabel="Estado de la matrícula"
                        value={String(watch('estado') || 'activo')}
                        onValueChange={(val) => setValue('estado', val, { shouldValidate: true })}
                        options={ESTADO_OPTIONS}
                        className="rimaq-select--full-width"
                      />
                    </div>
                    <div className="rq-field">
                      <label htmlFor="matricula-fecha-fin" className="rq-field__label">Fecha de Finalización (Opcional)</label>
                      <input id="matricula-fecha-fin" type="date" {...register('fecha_fin')} className="rq-field__input" />
                      <p className="rq-field__hint">Si marcas la matrícula como completada sin fecha, se usará la fecha de hoy.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="rq-form__actions">
                <button type="button" className="rq-button rq-button--ghost" onClick={() => setEditing(null)}>Cancelar</button>
                <button type="submit" className="rq-button rq-button--primary">{isCreate ? 'Crear Matrícula' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        open={Boolean(itemToDelete)}
        title="¿Eliminar matrícula?"
        itemName={itemToDelete ? `Matrícula #${matriculaId(itemToDelete)}` : ''}
        description="Se eliminará la inscripción del estudiante a este curso. Esta acción es irreversible."
        onCancel={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
