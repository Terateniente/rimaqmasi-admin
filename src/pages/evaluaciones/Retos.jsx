import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, BookOpenCheck, BrainCircuit, CheckCircle2, Edit2, Eye, FileText, Image, Layers3, Library, Plus, RefreshCw, Save, Search, Settings2, Shuffle, Sparkles, Trash2, Trophy, WandSparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { getCursos } from '../../services/cursoService';
import { getUnidads } from '../../services/unidadService';
import { getSesiones } from '../../services/sesionService';
import { getLecciones } from '../../services/leccionService';
import {
  createReto, deleteReto, generateRetos, getResumenRetos,
  updateLessonChallengeConfig, updateLessonGuide, updateReto,
} from '../../services/retoService';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { ModernPageSkeleton } from '../../components/ModernPageSkeleton';
import { RimaqSelect } from '../../components/RimaqSelect';
import './Retos.css';

const TYPES = [
  ['opcion_multiple', 'Opción múltiple'], ['completar', 'Completar'], ['ordenar_palabras', 'Ordenar palabras'],
  ['relacionar', 'Relacionar'], ['traducir', 'Traducir'], ['escuchar_escribir', 'Escuchar y escribir'],
  ['pronunciar', 'Pronunciar'], ['lectura', 'Lectura'], ['conversacion', 'Conversación'], ['respuesta_imagen', 'Respuesta con imagen'],
];
const TYPE_LABEL = Object.fromEntries(TYPES);
const unwrap = (response) => Array.isArray(response) ? response : response?.data ?? [];
const idOf = (item, names) => names.map((name) => item?.[name]).find((value) => value !== undefined && value !== null);
const field = { padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-surface-variant)', background: 'var(--color-surface)', color: 'var(--color-on-surface)', width: '100%', boxSizing: 'border-box' };
const card = { background: 'var(--color-surface)', border: '1px solid var(--color-surface-variant)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-level-1)' };
const button = { border: 0, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'center' };
const iconButton = (color, background) => ({ border: '1px solid var(--color-surface-variant)', borderRadius: 8, width: 34, height: 34, display: 'inline-grid', placeItems: 'center', cursor: 'pointer', color, background });
const mediaUrl = (url) => {
  if (!url || url.startsWith('http')) return url;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  return `${apiUrl.replace('/api/v1', '')}/public${url.startsWith('/') ? url : `/${url}`}`;
};
const isChoiceType = (type) => ['opcion_multiple', 'respuesta_imagen'].includes(type);
const ROUTE_STORAGE_KEY = 'rimaqmasi:admin:retos-route';
const EMPTY_SELECTION = { course: '', unit: '', session: '', lesson: '' };
const readSavedRoute = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(ROUTE_STORAGE_KEY) || 'null');
    return saved && typeof saved === 'object' ? { ...EMPTY_SELECTION, ...saved } : EMPTY_SELECTION;
  } catch {
    return EMPTY_SELECTION;
  }
};
const SAVED_ROUTE = readSavedRoute();

const emptyForm = {
  tipo: 'opcion_multiple', instruccion: '', contenido: '', opcion1: '', opcion2: '', opcion3: '', opcion4: '',
  correcta: '1', respuestas: '', pista: '', puntos: 15, dificultad: 1, tiempo_limite_seg: 30, estado: 'publicado', disponible_seleccion: true,
};

export const Retos = () => {
  const [catalogs, setCatalogs] = useState({ courses: [], units: [], sessions: [], lessons: [] });
  const [selection, setSelection] = useState(SAVED_ROUTE);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('banco');
  const [loading, setLoading] = useState(Boolean(SAVED_ROUTE.lesson));
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedWords, setSelectedWords] = useState([]);
  const [wordSearch, setWordSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [generationTypes, setGenerationTypes] = useState(['opcion_multiple', 'completar', 'traducir']);
  const [config, setConfig] = useState({ cantidad: 10, aprobacion: 70, opcion_multiple: 40, completar: 30, traducir: 30 });
  const [guide, setGuide] = useState({ titulo: 'Guía de repaso', descripcion: '', contenido: '' });
  const [routeSaved, setRouteSaved] = useState(Boolean(SAVED_ROUTE.lesson));

  const applySummary = useCallback((data) => {
    setSummary(data);
    setSelectedWords(data.palabras_disponibles.filter((word) => word.vinculada).map((word) => Number(word.palabra_id)));
    const adaptive = data.leccion.configuracion_adaptativa ?? {};
    setConfig({
      cantidad: data.leccion.cantidad_retos_intento ?? 10,
      aprobacion: Number(data.leccion.porcentaje_aprobacion ?? 70),
      opcion_multiple: adaptive.tipos?.opcion_multiple ?? 40,
      completar: adaptive.tipos?.completar ?? 30,
      traducir: adaptive.tipos?.traducir ?? 30,
    });
    const mandatory = data.leccion.recursos.find((resource) => resource.obligatorio);
    setGuide(mandatory ? { titulo: mandatory.titulo ?? '', descripcion: mandatory.descripcion ?? '', contenido: mandatory.contenido ?? '' } : { titulo: 'Guía de repaso', descripcion: '', contenido: '' });
  }, []);

  useEffect(() => {
    Promise.all([getCursos(), getUnidads(), getSesiones(), getLecciones()])
      .then(([courses, units, sessions, lessons]) => setCatalogs({ courses: unwrap(courses), units: unwrap(units), sessions: unwrap(sessions), lessons: unwrap(lessons) }))
      .catch(() => toast.error('No se pudieron cargar los catálogos académicos'))
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    if (!SAVED_ROUTE.lesson) return undefined;
    let active = true;
    getResumenRetos(SAVED_ROUTE.lesson)
      .then((response) => { if (active) applySummary(response.data); })
      .catch(() => { if (active) toast.error('No se pudo cargar la ruta académica guardada'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applySummary]);

  const filteredUnits = useMemo(() => catalogs.units.filter((item) => !selection.course || String(idOf(item, ['curso_id', 'cursos_id'])) === String(selection.course)), [catalogs.units, selection.course]);
  const filteredSessions = useMemo(() => catalogs.sessions.filter((item) => !selection.unit || String(idOf(item, ['unidad_id', 'unidads_id', 'etapas_id'])) === String(selection.unit)), [catalogs.sessions, selection.unit]);
  const filteredLessons = useMemo(() => catalogs.lessons.filter((item) => !selection.session || String(idOf(item, ['sesion_id', 'sesiones_id'])) === String(selection.session)), [catalogs.lessons, selection.session]);

  const loadSummary = async (lessonId = selection.lesson) => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const response = await getResumenRetos(lessonId);
      applySummary(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message ?? 'No se pudo cargar el banco de retos');
    } finally { setLoading(false); }
  };

  const updateSelection = (key, value) => {
    const resets = key === 'course' ? { unit: '', session: '', lesson: '' } : key === 'unit' ? { session: '', lesson: '' } : key === 'session' ? { lesson: '' } : {};
    setCategoryFilter('');
    setSummary(null);
    setRouteSaved(false);
    setSelection((current) => ({ ...current, [key]: value, ...resets }));
    if (key === 'lesson' && value) void loadSummary(value);
  };

  const saveAcademicRoute = () => {
    if (!selection.lesson) return;
    localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(selection));
    setRouteSaved(true);
    toast.success('Ruta académica guardada para la próxima visita');
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, correcta: String(Math.floor(Math.random() * 4) + 1) });
    setModal(true);
  };
  const openEdit = (reto) => {
    const options = Array.isArray(reto.opciones) ? reto.opciones : [];
    const accepted = reto.solucion?.respuestas_aceptadas
      ?? reto.solucion?.orden
      ?? reto.solucion?.pares?.map((pair) => `${pair.origen}=${pair.destino}`)
      ?? (reto.solucion?.texto_esperado ? [reto.solucion.texto_esperado] : []);
    setEditing(reto);
    setForm({
      tipo: reto.tipo, instruccion: reto.instruccion, contenido: reto.contenido?.imagen ?? reto.contenido?.texto ?? reto.contenido?.texto_esperado ?? '',
      opcion1: options[0]?.texto ?? '', opcion2: options[1]?.texto ?? '', opcion3: options[2]?.texto ?? '', opcion4: options[3]?.texto ?? '',
      correcta: String(reto.solucion?.opcion_id ?? '1'), respuestas: accepted.join(', '),
      pista: reto.pistas?.nivel_1?.texto ?? '', puntos: reto.puntos, dificultad: reto.dificultad, tiempo_limite_seg: reto.tiempo_limite_seg ?? 30,
      estado: reto.estado, disponible_seleccion: reto.disponible_seleccion,
    });
    setModal(true);
  };

  const buildPayload = () => {
    const isChoice = isChoiceType(form.tipo);
    const options = [form.opcion1, form.opcion2, form.opcion3, form.opcion4].filter(Boolean).map((texto, index) => ({ id: String(index + 1), texto }));
    const accepted = form.respuestas.split(',').map((value) => value.trim()).filter(Boolean);
    if (isChoice && options.length !== 4) throw new Error('Completa las cuatro opciones');
    if (isChoice && new Set(options.map((option) => option.texto.trim().toLocaleLowerCase('es'))).size !== 4) throw new Error('Las cuatro opciones deben ser diferentes');
    if (!isChoice && !accepted.length) throw new Error('Agrega la solución o las respuestas aceptadas');
    let contenido = editing?.contenido ? { ...editing.contenido, texto: form.contenido } : { texto: form.contenido };
    let solucion = { respuestas_aceptadas: accepted };
    if (form.tipo === 'respuesta_imagen') {
      contenido = editing?.contenido ? { ...editing.contenido, imagen: form.contenido } : { imagen: form.contenido };
    } else if (form.tipo === 'ordenar_palabras') {
      contenido = { palabras: form.contenido.split(/\s+/).filter(Boolean).sort(() => Math.random() - 0.5) };
      solucion = { orden: accepted };
    } else if (form.tipo === 'relacionar') {
      const pares = accepted.map((pair) => pair.split('=').map((value) => value.trim())).filter((pair) => pair.length === 2).map(([origen, destino]) => ({ origen, destino }));
      if (!pares.length) throw new Error('Escribe las relaciones como origen=destino, separadas por coma');
      contenido = { elementos: pares.flatMap((pair) => [pair.origen, pair.destino]).sort(() => Math.random() - 0.5) };
      solucion = { pares };
    } else if (form.tipo === 'pronunciar') {
      contenido = { texto_esperado: form.contenido };
      solucion = { texto_esperado: form.contenido, puntaje_minimo: 70 };
    }
    return {
      leccion_id: Number(selection.lesson), tipo: form.tipo, instruccion: form.instruccion,
      contenido, opciones: isChoice ? options : null,
      solucion: isChoice ? { opcion_id: form.correcta } : solucion,
      pistas: { nivel_1: { texto: form.pista } }, puntos: Number(form.puntos), dificultad: Number(form.dificultad), tiempo_limite_seg: Number(form.tiempo_limite_seg),
      estado: form.estado, disponible_seleccion: form.disponible_seleccion,
    };
  };

  const saveChallenge = async (event) => {
    event.preventDefault();
    try {
      const payload = buildPayload();
      if (editing) await updateReto(editing.reto_id, payload); else await createReto(payload);
      toast.success(editing ? 'Reto actualizado' : 'Reto creado');
      setModal(false); await loadSummary();
    } catch (error) { toast.error(error.response?.data?.message ?? error.message ?? 'No se pudo guardar'); }
  };

  const removeChallenge = (reto) => {
    setConfirmDelete(reto);
  };

  const executeRemoveChallenge = async (mode) => {
    if (!confirmDelete) return;
    try { const result = await deleteReto(confirmDelete.reto_id, mode); toast.success(result?.message || 'Reto eliminado'); await loadSummary(); }
    catch (error) { toast.error(error.response?.data?.message ?? 'No se pudo eliminar'); }
    finally { setConfirmDelete(null); }
  };

  const runGeneration = async () => {
    if (!selectedWords.length) return toast.error('Selecciona al menos una palabra');
    if (!generationTypes.length) return toast.error('Selecciona al menos un tipo');
    const id = toast.loading('Generando retos desde el diccionario...');
    try {
      const response = await generateRetos({ leccion_id: Number(selection.lesson), palabra_ids: selectedWords, tipos: generationTypes });
      const reasons = response.data.motivos_omitidos ?? {};
      const detail = [
        reasons.sin_traduccion && `${reasons.sin_traduccion} sin traducción publicada`,
        reasons.sin_imagen && `${reasons.sin_imagen} sin imagen`,
        reasons.sin_audio && `${reasons.sin_audio} sin audio`,
        reasons.sin_distractores_categoria && `${reasons.sin_distractores_categoria} sin 3 opciones de la misma categoría`,
        reasons.ya_existe && `${reasons.ya_existe} ya existentes`,
        reasons.palabra_no_disponible && `${reasons.palabra_no_disponible} palabras no disponibles en el idioma del curso`,
      ].filter(Boolean).join(' · ');
      const message = `${response.data.creados} retos creados; ${response.data.omitidos} omitidos${detail ? ` (${detail})` : ''}`;
      response.data.creados > 0 ? toast.success(message, { id, duration: 7000 }) : toast.error(message, { id, duration: 9000 });
      await loadSummary(); setTab('banco');
    } catch (error) { toast.error(error.response?.data?.message ?? 'No se pudieron generar', { id }); }
  };

  const saveConfig = async () => {
    const total = Number(config.opcion_multiple) + Number(config.completar) + Number(config.traducir);
    if (total !== 100) return toast.error('Los porcentajes de tipos deben sumar 100%');
    try {
      await updateLessonChallengeConfig(selection.lesson, {
        cantidad_retos_intento: Number(config.cantidad), porcentaje_aprobacion: Number(config.aprobacion),
        tipos: { opcion_multiple: Number(config.opcion_multiple), completar: Number(config.completar), traducir: Number(config.traducir) },
        dimensiones: { VOCABULARIO: 80, PRONUNCIACION: 20 }, considerar_errores_historicos: true, considerar_errores_del_intento: true,
      });
      toast.success('Configuración adaptativa guardada'); await loadSummary();
    } catch (error) { toast.error(error.response?.data?.message ?? 'No se pudo guardar la configuración'); }
  };

  const saveGuide = async () => {
    try { await updateLessonGuide(selection.lesson, guide); toast.success('Guía obligatoria guardada'); await loadSummary(); }
    catch (error) { toast.error(error.response?.data?.message ?? 'No se pudo guardar la guía'); }
  };

  const toggleWord = (id) => setSelectedWords((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const toggleType = (type) => setGenerationTypes((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type]);
  const shuffleFormOptions = () => {
    const currentCorrect = Number(form.correcta) - 1;
    const entries = [1, 2, 3, 4].map((number, index) => ({
      texto: form[`opcion${number}`],
      correcta: index === currentCorrect,
    }));
    for (let index = entries.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [entries[index], entries[swapIndex]] = [entries[swapIndex], entries[index]];
    }
    const shuffled = { ...form, correcta: String(entries.findIndex((entry) => entry.correcta) + 1) };
    entries.forEach((entry, index) => { shuffled[`opcion${index + 1}`] = entry.texto; });
    setForm(shuffled);
  };
  const availableCategories = useMemo(() => {
    if (!summary) return [];
    return [...new Set(summary.palabras_disponibles.map((word) => word.categoria?.nombre).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'es'));
  }, [summary]);
  const visibleWords = useMemo(() => {
    if (!summary) return [];
    const query = wordSearch.trim().toLocaleLowerCase('es');
    return summary.palabras_disponibles.filter((word) => {
      if (categoryFilter && word.categoria?.nombre !== categoryFilter) return false;
      if (!query) return true;
      const translation = word.traduccionesOrigen?.[0]?.palabraDestino?.termino ?? word.definiciones?.[0]?.definicion ?? '';
      return [word.termino, word.termino_normalizado, translation, word.categoria?.nombre]
        .some((value) => String(value ?? '').toLocaleLowerCase('es').includes(query));
    });
  }, [summary, wordSearch, categoryFilter]);
  const selectVisibleWords = () => setSelectedWords((current) => [...new Set([...current, ...visibleWords.map((word) => Number(word.palabra_id))])]);
  const clearVisibleWords = () => {
    const visibleIds = new Set(visibleWords.map((word) => Number(word.palabra_id)));
    setSelectedWords((current) => current.filter((id) => !visibleIds.has(id)));
  };

  const contextFields = [
    { key: 'course', label: 'Curso', value: selection.course, options: catalogs.courses, disabled: false, idNames: ['curso_id', 'cursos_id', 'id'], getLabel: (item) => item.nombre ?? `${item.idioma_origen?.nombre ?? ''} → ${item.idioma_destino?.nombre ?? ''}` },
    { key: 'unit', label: 'Unidad', value: selection.unit, options: filteredUnits, disabled: !selection.course, idNames: ['unidad_id', 'unidads_id', 'id'], getLabel: (item) => item.nombre ?? item.titulo },
    { key: 'session', label: 'Sesión', value: selection.session, options: filteredSessions, disabled: !selection.unit, idNames: ['sesion_id', 'sesiones_id', 'id'], getLabel: (item) => item.titulo },
    { key: 'lesson', label: 'Lección', value: selection.lesson, options: filteredLessons, disabled: !selection.session, idNames: ['leccion_id', 'lecciones_id', 'id'], getLabel: (item) => item.titulo },
  ];

  const tabs = [
    ['banco', 'Banco de retos', Library],
    ['generar', 'Generar desde palabras', WandSparkles],
    ['config', 'Configuración', Settings2],
    ['guia', 'Guía obligatoria', BookOpenCheck],
  ];
  const completedContext = Object.values(selection).filter(Boolean).length;
  const nextContext = contextFields.find((context) => !context.value);
  const distributionTotal = Number(config.opcion_multiple || 0) + Number(config.completar || 0) + Number(config.traducir || 0);
  const distributionValid = distributionTotal === 100;
  const guideChecks = [
    ['Título definido', Boolean(guide.titulo.trim())],
    ['Descripción agregada', Boolean(guide.descripcion.trim())],
    ['Contenido preparado', Boolean(guide.contenido.trim())],
  ];
  const guideCompletion = guideChecks.filter(([, ready]) => ready).length;

  if (catalogLoading) {
    return <div className="retos-page"><ModernPageSkeleton cards={4} /></div>;
  }

  return <div className="retos-page">
    <div className="retos-page-header">
      <div className="retos-page-header__content">
        <div className="rq-page-heading">
          <div className="rq-page-heading__accent" />
          <h1 className="rq-page-heading__title">Gestión de retos</h1>
        </div>
        <p>Diseña, genera y organiza las actividades que resolverán los estudiantes en cada lección.</p>
      </div>
      {selection.lesson && <button className="retos-refresh-button" onClick={() => loadSummary()} disabled={loading}><RefreshCw className={loading ? 'spinning' : ''} size={16}/><span>{loading ? 'Actualizando…' : 'Actualizar datos'}</span></button>}
    </div>

    <section className="retos-context-card">
      <div className="retos-section-heading">
        <div className="retos-section-icon"><Layers3 size={18} /></div>
        <div><strong>Ruta académica</strong><span>Selecciona dónde se publicarán y evaluarán los retos.</span></div>
        <div className="retos-context-actions">
          <div className="retos-context-progress" aria-label={`${completedContext} de 4 niveles seleccionados`}>
            <span>{completedContext}/4 completados</span>
            <div><i style={{ transform: `scaleX(${completedContext / 4})` }} /></div>
          </div>
          <button type="button" className={`retos-save-route ${routeSaved ? 'is-saved' : ''}`} disabled={!selection.lesson} onClick={saveAcademicRoute}>{routeSaved ? <CheckCircle2 size={16}/> : <Save size={16}/>}<span>{routeSaved ? 'Ruta guardada' : 'Guardar ruta'}</span></button>
        </div>
      </div>
      <div className="retos-context-grid">
        {contextFields.map((context, index) => (
          <label className={`retos-context-field ${context.value ? 'is-complete' : ''}`} key={context.key}>
            <span><b>{context.value ? <CheckCircle2 size={13} /> : index + 1}</b>{context.label}</span>
            <div id={`retos-${context.key}`}>
              <RimaqSelect
                value={context.value}
                onValueChange={(value) => updateSelection(context.key, value)}
                disabled={context.disabled}
                ariaLabel={`Seleccionar ${context.label.toLowerCase()}`}
                placeholder={`Seleccionar ${context.label.toLowerCase()}`}
                options={context.options.map((item) => {
                const itemId = idOf(item, context.idNames);
                  return { value: String(itemId), label: context.getLabel(item) };
                })}
              />
            </div>
          </label>
        ))}
      </div>
    </section>

    {!selection.lesson ? <div className="retos-selection-empty"><div className="retos-selection-empty__icon"><BrainCircuit size={34}/></div><span className="retos-selection-empty__step">Paso {Math.min(completedContext + 1, 4)} de 4</span><h3>{nextContext ? `Selecciona ${nextContext.label.toLowerCase()}` : 'Selecciona una lección'}</h3><p>Completa la ruta académica para visualizar y administrar el banco de retos.</p>{nextContext && <button type="button" className="retos-empty-action" onClick={() => document.querySelector(`#retos-${nextContext.key} button`)?.focus()}>Continuar con {nextContext.label.toLowerCase()}</button>}</div> : loading && !summary ? <ModernPageSkeleton cards={4} showHeading={false} compact /> : summary && <>
      <div className="retos-metrics-grid">
        {[
          ['Banco total', summary.estadisticas.banco_total, 'retos disponibles', Library],
          ['Publicados', summary.estadisticas.publicados, 'visibles para estudiantes', BadgeCheck],
          ['Por intento', summary.leccion.cantidad_retos_intento, 'retos seleccionados', BrainCircuit],
          ['XP máxima', summary.estadisticas.xp_maxima_aproximada, 'experiencia estimada', Trophy],
        ].map(([label, value, detail, Icon]) => <article className="retos-metric" key={label}><div className="retos-metric__icon"><Icon size={19}/></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>)}
      </div>
      <nav className="retos-tabs" role="tablist" aria-label="Secciones del módulo de retos">
        {tabs.map(([key, label, Icon]) => <button id={`retos-tab-${key}`} role="tab" aria-selected={tab === key} aria-controls={`retos-panel-${key}`} className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}><Icon size={17}/><span>{label}</span></button>)}
      </nav>

      {tab === 'banco' && <section id="retos-panel-banco" role="tabpanel" aria-labelledby="retos-tab-banco" className="retos-panel">
        <header className="retos-panel__header"><div><span className="retos-panel__eyebrow">Banco seleccionado</span><h2>Retos de la lección</h2><p>{summary.leccion.titulo}</p></div>{summary.leccion.retos.length > 0 && <button className="retos-new-button" onClick={openCreate}><Plus size={18}/><span>Agregar nuevo reto</span></button>}</header>
        <div className="table-responsive-container retos-table"><table><thead><tr>{['#', 'Instrucción', 'Tipo', 'Elemento', 'Puntos', 'Estado', 'Acciones'].map((name) => <th key={name}>{name}</th>)}</tr></thead><tbody>
          {summary.leccion.retos.map((reto) => {
            const isPublished = reto.estado === 'publicado' && reto.disponible_seleccion;
            return <tr key={reto.reto_id} style={{ borderBottom: '1px solid var(--color-surface-variant)' }}><td style={{ padding: 12 }}>{reto.orden}</td><td style={{ padding: 12, maxWidth: 380 }}><strong>{reto.instruccion}</strong><div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>{reto.origen} · dificultad {reto.dificultad} · 2 intentos</div></td><td style={{ padding: 12 }}>{TYPE_LABEL[reto.tipo] ?? reto.tipo}</td><td style={{ padding: 12 }}>{reto.elementos?.[0]?.elemento?.palabra?.termino ?? reto.elementos?.[0]?.elemento?.contenido ?? 'Manual'}</td><td style={{ padding: 12 }}>{reto.puntos}</td><td style={{ padding: 12 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: isPublished ? '#137333' : 'var(--color-on-surface-variant)', background: isPublished ? '#e6f4ea' : 'var(--color-surface-container-high)' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: isPublished ? '#1e9e4a' : 'var(--color-outline)' }}/>{reto.estado}</span></td><td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 7, alignItems: 'center' }}><button aria-label="Ver reto" title="Ver reto" onClick={() => setPreview(reto)} style={iconButton('var(--color-primary)', 'color-mix(in srgb, var(--color-primary) 8%, white)')}><Eye size={17}/></button><button aria-label="Editar reto" title="Editar reto" onClick={() => openEdit(reto)} style={iconButton('var(--color-secondary)', 'color-mix(in srgb, var(--color-secondary) 8%, white)')}><Edit2 size={17}/></button><button aria-label="Retirar reto" title="Retirar reto" onClick={() => removeChallenge(reto)} style={iconButton('var(--color-error)', 'var(--color-error-container)')}><Trash2 size={17}/></button></div></td></tr>;
          })}
          {!summary.leccion.retos.length && <tr><td colSpan="7"><div className="retos-empty"><div className="retos-empty__icon"><BrainCircuit size={28}/></div><strong>Todavía no hay retos</strong><p>Crea el primero manualmente o genéralos usando las palabras de esta lección.</p><button className="retos-new-button" onClick={openCreate}><Plus size={18}/><span>Agregar nuevo reto</span></button></div></td></tr>}
        </tbody></table></div>
      </section>}

      {tab === 'generar' && <section id="retos-panel-generar" role="tabpanel" aria-labelledby="retos-tab-generar" className="retos-panel retos-workspace">
        <header className="retos-workspace__header"><div className="retos-workspace__icon"><Sparkles size={21}/></div><div><h2>Generar desde palabras</h2><p>Elige los tipos y las palabras; el sistema preparará retos compatibles con sus recursos.</p></div></header>
        <div className="retos-workspace__label"><span>1</span><div><strong>Tipos de reto</strong><small>Selecciona uno o más formatos para la generación.</small></div></div>
        <div className="retos-type-grid">{TYPES.filter(([type]) => ['opcion_multiple', 'completar', 'traducir', 'respuesta_imagen', 'escuchar_escribir', 'pronunciar'].includes(type)).map(([type, label]) => <label className={generationTypes.includes(type) ? 'selected' : ''} key={type}><input type="checkbox" checked={generationTypes.includes(type)} onChange={() => toggleType(type)}/> {label}</label>)}</div>
        <div className="retos-workspace__label"><span>2</span><div><strong>Palabras disponibles</strong><small>Busca y selecciona el contenido que deseas convertir en actividades.</small></div></div>
        <div className="retos-word-toolbar">
          <div style={{ position: 'relative', flex: '1 1 300px' }}><Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)' }}/><input style={{ ...field, paddingLeft: 40 }} value={wordSearch} onChange={(e) => setWordSearch(e.target.value)} placeholder="Buscar por palabra o traducción..."/></div>
          <div className="retos-category-select"><RimaqSelect ariaLabel="Filtrar por categoría" value={categoryFilter || '__all__'} onValueChange={(value) => setCategoryFilter(value === '__all__' ? '' : value)} options={[{ value: '__all__', label: 'Todas las categorías' }, ...availableCategories.map((category) => ({ value: category, label: category }))]} /></div>
          <button type="button" onClick={selectVisibleWords} style={{ ...button, background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}>Seleccionar visibles</button>
          <button type="button" onClick={clearVisibleWords} style={{ ...button, background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}>Limpiar visibles</button>
          <span className="retos-result-count">{visibleWords.length} resultado{visibleWords.length === 1 ? '' : 's'}</span>
        </div>
        {visibleWords.length > 0 ? <div className="retos-word-grid">{visibleWords.map((word) => { const selected = selectedWords.includes(Number(word.palabra_id)); return <label className={`retos-word-card ${selected ? 'selected' : ''}`} key={word.palabra_id}><input type="checkbox" checked={selected} onChange={() => toggleWord(Number(word.palabra_id))}/> <strong>{word.termino}</strong><div>{word.traduccionesOrigen?.[0]?.palabraDestino?.termino ?? word.definiciones?.[0]?.definicion ?? 'Sin traducción'} · {word.categoria?.nombre ?? 'Sin categoría'}</div><small>{word.url_audio ? 'Con audio' : 'Sin audio'} · {word.url_imagen ? 'Con imagen' : 'Sin imagen'}</small></label>; })}</div> : <div className="retos-word-empty"><Search size={24}/><strong>Sin coincidencias</strong><span>Prueba otra palabra o cambia la categoría seleccionada.</span></div>}
        <div className="retos-generation-footer"><span><b>{selectedWords.length}</b> palabra{selectedWords.length === 1 ? '' : 's'} seleccionada{selectedWords.length === 1 ? '' : 's'}</span><button className="retos-generate-button" onClick={runGeneration} disabled={!selectedWords.length}><Sparkles size={17}/>Generar retos</button></div>
      </section>}

      {tab === 'config' && <section id="retos-panel-config" role="tabpanel" aria-labelledby="retos-tab-config" className="retos-panel retos-settings-panel">
        <header className="retos-workspace__header"><div className="retos-workspace__icon"><Settings2 size={21}/></div><div><h2>Configuración adaptativa</h2><p>Define la exigencia del intento y la combinación de actividades.</p></div><button type="button" onClick={saveConfig} disabled={!distributionValid} className="retos-header-save"><Save size={16}/>Guardar</button></header>
        <div className="retos-settings-layout">
          <div className="retos-settings-main">
            <section className="retos-settings-section">
              <div className="retos-settings-section__heading"><span>1</span><div><strong>Reglas del intento</strong><small>Controla la extensión y el criterio de aprobación.</small></div></div>
              <div className="retos-settings-primary-grid">
                <label><span>Retos por intento</span><small>Cantidad presentada en cada sesión</small><div className="retos-number-field"><input type="number" min="1" max="30" value={config.cantidad} onChange={(e) => setConfig({ ...config, cantidad: e.target.value })}/><b>retos</b></div></label>
                <label><span>Porcentaje de aprobación</span><small>Puntaje mínimo para superar la lección</small><div className="retos-number-field"><input type="number" min="1" max="100" value={config.aprobacion} onChange={(e) => setConfig({ ...config, aprobacion: e.target.value })}/><b>%</b></div></label>
              </div>
            </section>
            <section className="retos-settings-section">
              <div className="retos-settings-section__heading"><span>2</span><div><strong>Distribución de actividades</strong><small>Los tres porcentajes deben sumar exactamente 100%.</small></div><b className={distributionValid ? 'is-valid' : 'is-invalid'}>{distributionTotal}%</b></div>
              <div className="retos-distribution-grid">
                {[
                  ['opcion_multiple', 'Opción múltiple'],
                  ['completar', 'Completar'],
                  ['traducir', 'Traducir'],
                ].map(([key, label]) => <label key={key}><span>{label}</span><div className="retos-number-field"><input type="number" min="0" max="100" value={config[key]} onChange={(e) => setConfig({ ...config, [key]: e.target.value })}/><b>%</b></div></label>)}
              </div>
              <div className={`retos-distribution-status ${distributionValid ? 'is-valid' : 'is-invalid'}`} aria-live="polite"><i style={{ transform: `scaleX(${Math.min(distributionTotal, 100) / 100})` }} /></div>
              {!distributionValid && <p className="retos-settings-error">Ajusta la distribución: actualmente suma {distributionTotal}% y debe llegar a 100%.</p>}
            </section>
          </div>
          <aside className="retos-settings-aside">
            <div className="retos-settings-aside__icon"><BrainCircuit size={22}/></div>
            <strong>Adaptación automática</strong>
            <p>El motor utiliza estas reglas para preparar un intento distinto y equilibrado para cada estudiante.</p>
            <ul><li><CheckCircle2 size={15}/>Considera errores anteriores</li><li><CheckCircle2 size={15}/>Evita retos repetidos</li><li><CheckCircle2 size={15}/>Activa la pista en el segundo intento</li></ul>
          </aside>
        </div>
        <div className="retos-form-actions"><span className={distributionValid ? 'retos-save-state is-ready' : 'retos-save-state'}>{distributionValid ? 'Configuración lista para guardar' : 'Revisa la distribución antes de guardar'}</span><button onClick={saveConfig} disabled={!distributionValid} className="retos-primary-button"><Save size={17}/>Guardar configuración</button></div>
      </section>}

      {tab === 'guia' && <section id="retos-panel-guia" role="tabpanel" aria-labelledby="retos-tab-guia" className="retos-panel retos-guide-panel">
        <header className="retos-workspace__header"><div className="retos-workspace__icon"><FileText size={21}/></div><div><h2>Guía obligatoria</h2><p>Prepara el material de recuperación que verá el estudiante cuando necesite reforzar la lección.</p></div><button type="button" onClick={saveGuide} className="retos-header-save"><Save size={16}/>Guardar</button></header>
        <div className="retos-guide-layout">
          <div className="retos-guide-form">
            <label><strong>Título</strong><span>Nombre breve y reconocible</span><input style={field} placeholder="Ejemplo: Repaso de vocabulario básico" value={guide.titulo} onChange={(e) => setGuide({ ...guide, titulo: e.target.value })}/></label>
            <label><strong>Descripción</strong><span>Explica qué aprenderá el estudiante</span><input style={field} placeholder="Resume el objetivo de esta guía" value={guide.descripcion} onChange={(e) => setGuide({ ...guide, descripcion: e.target.value })}/></label>
            <label className="retos-guide-content"><strong>Contenido</strong><span>Incluye ejemplos, reglas y recomendaciones claras</span><textarea style={{ ...field, fontFamily: 'inherit' }} placeholder="Escribe aquí el material de refuerzo…" value={guide.contenido} onChange={(e) => setGuide({ ...guide, contenido: e.target.value })}/><small>{guide.contenido.length} caracteres</small></label>
          </div>
          <aside className="retos-guide-aside">
            <div className="retos-guide-progress"><strong>{guideCompletion}/3</strong><span>secciones completas</span></div>
            <ul>{guideChecks.map(([label, ready]) => <li className={ready ? 'is-ready' : ''} key={label}><CheckCircle2 size={16}/><span>{label}</span></li>)}</ul>
            <div className="retos-guide-tip"><Sparkles size={17}/><div><strong>Una buena guía</strong><p>Explica primero la regla, muestra un ejemplo y termina con una recomendación práctica.</p></div></div>
          </aside>
        </div>
        <div className="retos-form-actions"><span className={guideCompletion === 3 ? 'retos-save-state is-ready' : 'retos-save-state'}>{guideCompletion === 3 ? 'Guía completa y lista' : `Faltan ${3 - guideCompletion} secciones por completar`}</span><button onClick={saveGuide} className="retos-primary-button"><Save size={17}/>Guardar guía</button></div>
      </section>}
    </>}

    {preview && <div className="retos-modal-backdrop" onClick={() => setPreview(null)}><div className="retos-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="reto-preview-title" onClick={(event) => event.stopPropagation()} style={{ ...card, width: 'min(860px, 100%)', maxHeight: '96vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}><div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-surface-variant)', flexShrink: 0 }}><div><div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 800, textTransform: 'uppercase' }}>Vista previa del reto</div><h2 id="reto-preview-title" style={{ margin: '3px 0 0' }}>{TYPE_LABEL[preview.tipo] ?? preview.tipo}</h2></div><button aria-label="Cerrar vista previa" onClick={() => setPreview(null)} style={iconButton('var(--color-on-surface)', 'var(--color-surface-container-high)')}><X size={18}/></button></div><div style={{ padding: 24, overflowY: 'auto', minHeight: 0 }}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>{[['Reto', `#${preview.orden}`], ['Dificultad', `${preview.dificultad}/5`], ['XP', `${preview.puntos}`], ['Intentos', `${preview.max_intentos ?? 2}`]].map(([label, value]) => <span key={label} style={{ padding: '6px 10px', borderRadius: 999, background: 'var(--color-surface-container-high)', fontSize: 12 }}><strong>{label}:</strong> {value}</span>)}</div><div style={{ padding: 22, borderRadius: 14, background: 'var(--color-surface-container-low)', border: '1px solid var(--color-surface-variant)' }}><div style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 8 }}>Pregunta</div><h3 style={{ fontSize: 21, margin: 0 }}>{preview.instruccion}</h3>{preview.contenido?.texto && <p style={{ fontSize: 20, fontWeight: 700, margin: '16px 0 0' }}>{preview.contenido.texto}</p>}{preview.contenido?.imagen && <img src={mediaUrl(preview.contenido.imagen)} alt="Contenido del reto" style={{ display: 'block', width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 10, marginTop: 16 }}/>}<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 18 }}>{Array.isArray(preview.opciones) && preview.opciones.map((option) => { const correct = String(option.id) === String(preview.solucion?.opcion_id); return <div key={option.id} style={{ padding: 13, borderRadius: 10, border: `2px solid ${correct ? '#1e9e4a' : 'var(--color-surface-variant)'}`, background: correct ? '#e6f4ea' : 'var(--color-surface)' }}>{option.texto}{correct && <CheckCircle2 size={16} color="#1e9e4a" style={{ float: 'right' }}/>}</div>; })}</div></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 16 }}><div style={{ padding: 15, borderRadius: 10, background: '#e6f4ea', color: '#14532d' }}><strong>Solución</strong><div style={{ marginTop: 6 }}>{preview.solucion?.respuestas_aceptadas?.join(', ') ?? preview.solucion?.orden?.join(' → ') ?? preview.solucion?.texto_esperado ?? (preview.solucion?.opcion_id ? `Opción ${preview.solucion.opcion_id}` : JSON.stringify(preview.solucion))}</div></div><div style={{ padding: 15, borderRadius: 10, background: '#fff7e0', color: '#713f12' }}><strong>Pista del segundo intento</strong><div style={{ marginTop: 6 }}>{preview.pistas?.nivel_1?.texto ?? 'Sin pista registrada'}</div></div></div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, flexWrap: 'wrap' }}><button onClick={() => { setPreview(null); openEdit(preview); }} style={{ ...button, background: 'var(--color-primary)', color: 'white' }}><Edit2 size={16}/>Editar este reto</button><button onClick={() => setPreview(null)} style={{ ...button, background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}>Cerrar</button></div></div></div></div>}

    {modal && <div className="retos-modal-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}
    >
      <form className="modal-content-responsive retos-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="reto-editor-title" onSubmit={saveChallenge} style={{ ...card, maxHeight: '96vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="retos-editor-dialog__header" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderBottom: '1px solid var(--color-surface-variant)' }}>
          <div>
            <div style={{ color: 'var(--color-primary)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>{editing ? `Reto #${editing.orden}` : 'Crear pregunta'}</div>
            <h2 id="reto-editor-title" style={{ margin: '4px 0 2px' }}>{editing ? 'Editar reto' : 'Nuevo reto'}</h2>
            <div style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>Define la pregunta, marca la respuesta correcta y revisa su dificultad.</div>
          </div>
          <button aria-label="Cerrar" type="button" onClick={() => setModal(false)} style={iconButton('var(--color-on-surface)', 'var(--color-surface-container-high)')}><X size={19}/></button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', minHeight: 0 }}>
          <section style={{ padding: 18, border: '1px solid var(--color-surface-variant)', borderRadius: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 13 }}>1. Contenido de la pregunta</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Tipo de reto</span>
                <RimaqSelect
                  value={form.tipo}
                  onValueChange={(tipo) => {
                    setForm({ ...form, tipo, ...(isChoiceType(tipo) && !isChoiceType(form.tipo) ? { puntos: 18, dificultad: 3 } : {}) });
                  }}
                  options={TYPES.map(([value, label]) => ({ value, label }))}
                  className="rimaq-select--full-width"
                />
              </div>
              <label style={{ fontSize: 13, fontWeight: 700 }}>
                {form.tipo === 'respuesta_imagen' ? 'URL o ruta de la imagen' : 'Contenido principal'}
                <input required={form.tipo === 'respuesta_imagen'} style={{ ...field, marginTop: 6 }} placeholder={form.tipo === 'respuesta_imagen' ? '/images/ejemplo.png' : 'Palabra, frase o contenido de apoyo'} value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })}/>
              </label>
            </div>
            {form.tipo === 'respuesta_imagen' && form.contenido && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, background: 'var(--color-surface-container-low)' }}>
              <Image size={19} color="var(--color-primary)"/>
              <img src={mediaUrl(form.contenido)} alt="Vista previa" style={{ width: 86, height: 62, objectFit: 'contain', borderRadius: 8, background: 'white' }}/>
              <small style={{ color: 'var(--color-on-surface-variant)' }}>Comprueba que la imagen representa claramente la respuesta.</small>
            </div>}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginTop: 14 }}>Instrucción para el estudiante
              <input required style={{ ...field, marginTop: 6, fontSize: 15 }} placeholder="Selecciona la palabra que corresponde a la imagen" value={form.instruccion} onChange={(e) => setForm({ ...form, instruccion: e.target.value })}/>
            </label>
          </section>

          {isChoiceType(form.tipo) ? <section style={{ padding: 18, border: '1px solid var(--color-surface-variant)', borderRadius: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 13 }}>
              <div>
                <div style={{ fontWeight: 800 }}>2. Opciones de respuesta</div>
                <small style={{ color: 'var(--color-on-surface-variant)' }}>Haz clic en una tarjeta para marcarla como correcta.</small>
              </div>
              <button type="button" onClick={shuffleFormOptions} style={{ ...button, padding: '8px 12px', background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}><Shuffle size={16}/>Barajar opciones</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
              {[1, 2, 3, 4].map((number) => {
                const correct = String(form.correcta) === String(number);
                return <label key={number} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', alignItems: 'center', gap: 9, padding: 11, borderRadius: 12, cursor: 'pointer', border: `2px solid ${correct ? '#1e9e4a' : 'var(--color-surface-variant)'}`, background: correct ? '#e6f4ea' : 'var(--color-surface)' }}>
                  <input type="radio" name="opcion-correcta" checked={correct} onChange={() => setForm({ ...form, correcta: String(number) })} style={{ width: 18, height: 18, accentColor: '#1e9e4a', justifySelf: 'center' }}/>
                  <span>
                    <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: correct ? '#137333' : 'var(--color-on-surface-variant)', marginBottom: 5 }}>OPCIÓN {number}{correct && <span>RESPUESTA CORRECTA</span>}</span>
                    <input required style={{ ...field, background: 'white' }} placeholder={`Escribe la opción ${number}`} value={form[`opcion${number}`]} onClick={(event) => event.stopPropagation()} onChange={(e) => setForm({ ...form, [`opcion${number}`]: e.target.value })}/>
                  </span>
                </label>;
              })}
            </div>
          </section> : <section style={{ padding: 18, border: '1px solid var(--color-surface-variant)', borderRadius: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>2. Respuesta esperada</div>
            <small style={{ color: 'var(--color-on-surface-variant)' }}>Puedes registrar varias respuestas válidas separándolas con comas.</small>
            <input required style={{ ...field, marginTop: 10 }} placeholder="Respuesta principal, variante aceptada" value={form.respuestas} onChange={(e) => setForm({ ...form, respuestas: e.target.value })}/>
          </section>}

          <section style={{ padding: 18, border: '1px solid var(--color-surface-variant)', borderRadius: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 13 }}>3. Ayuda y configuración</div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Pista del segundo intento
              <textarea required style={{ ...field, minHeight: 76, marginTop: 6, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Da una pista útil sin revelar directamente la respuesta" value={form.pista} onChange={(e) => setForm({ ...form, pista: e.target.value })}/>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>Puntos<input required style={{ ...field, marginTop: 6 }} type="number" min="1" value={form.puntos} onChange={(e) => setForm({ ...form, puntos: e.target.value })}/></label>
              <label style={{ fontSize: 13, fontWeight: 700 }}>Dificultad (1–5)<input required style={{ ...field, marginTop: 6 }} type="number" min="1" max="5" value={form.dificultad} onChange={(e) => setForm({ ...form, dificultad: e.target.value })}/></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Estado</span>
                <RimaqSelect
                  value={form.estado}
                  onValueChange={(estado) => setForm({ ...form, estado })}
                  options={[
                    { value: 'borrador', label: 'Borrador' },
                    { value: 'revision', label: 'Revisión' },
                    { value: 'publicado', label: 'Publicado' },
                    { value: 'archivado', label: 'Archivado' }
                  ]}
                  className="rimaq-select--full-width"
                />
              </div>
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, padding: 12, borderRadius: 10, background: 'var(--color-surface-container-low)', cursor: 'pointer' }}><input type="checkbox" checked={form.disponible_seleccion} onChange={(e) => setForm({ ...form, disponible_seleccion: e.target.checked })}/> <span><strong>Disponible para selección aleatoria</strong><small style={{ display: 'block', color: 'var(--color-on-surface-variant)' }}>El reto podrá aparecer en los intentos del estudiante.</small></span></label>
          </section>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--color-surface-variant)', background: 'var(--color-surface)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setModal(false)} style={{ ...button, background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}>Cancelar</button>
          <button type="submit" style={{ ...button, background: 'var(--color-primary)', color: 'white', minWidth: 150 }}><Save size={17}/>{editing ? 'Guardar cambios' : 'Crear reto'}</button>
        </div>
      </form>
    </div>}

    <DeleteConfirmationModal open={Boolean(confirmDelete)} title="¿Qué deseas hacer con el reto?" itemName={confirmDelete?.instruccion} description={<>Puedes archivarlo para conservar su historial o eliminarlo definitivamente junto con todos sus resultados asociados.</>} onCancel={() => setConfirmDelete(null)} secondaryLabel="Archivar" onSecondary={() => executeRemoveChallenge('archive')} confirmLabel="Eliminar definitivamente" onConfirm={() => executeRemoveChallenge('force')} />
  </div>;
};
