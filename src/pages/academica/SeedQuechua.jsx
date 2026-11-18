import React, { useState, useEffect, useRef } from 'react';
import { login as apiLogin } from '../../services/authService';
import { getCursos } from '../../services/cursoService';
import { getUnidads, createUnidad, deleteUnidad } from '../../services/unidadService';
import { getSesiones, createSesion, deleteSesion } from '../../services/sesionService';
import { getLecciones, createLeccion, deleteLeccion } from '../../services/leccionService';
import {
  getPalabras, deletePalabra, createPalabra,
  getCategorias, deleteCategoria, createCategoria
} from '../../services/diccionarioService';
import { toast } from 'sonner';
import { COLOR_FAMILIES, getColorByOrder } from '../../utils/colorPalette';
import dictionaryData from './dictionary.json';

const curriculum = [
  {
    nombre: "Introduccion al quechua", orden: 1, color: COLOR_FAMILIES.rojo[3],
    sesiones: [
      { titulo: "El quechua, origen y caracteristicas", orden_clasificacion: 1, color: COLOR_FAMILIES.rojo[2],
        lecciones: [
          { titulo: "El origen del quechua", descripcion: "Aprende los origenes historicos y geograficos del idioma quechua.", color: COLOR_FAMILIES.rojo[1] },
          { titulo: "Caracteristicas del quechua", descripcion: "Conoce la estructura basica y tipologia de esta lengua aglutinante.", color: COLOR_FAMILIES.rojo[2] }
        ]
      },
      { titulo: "Alfabeto del quechua sureno", orden_clasificacion: 2, color: COLOR_FAMILIES.rojo[3],
        lecciones: [
          { titulo: "Alfabeto quechua sureno", descripcion: "Una vision general de las letras que componen el quechua chanca y collao.", color: COLOR_FAMILIES.rojo[0] },
          { titulo: "Vocales del quechua (A, I y U)", descripcion: "Aprende sobre las 3 vocales del quechua y como cambian su sonido.", color: COLOR_FAMILIES.rojo[1] },
          { titulo: "Grafias simples", descripcion: "Las consonantes de pronunciacion suave.", color: COLOR_FAMILIES.rojo[2] },
          { titulo: "Grafias aspiradas", descripcion: "Aprende a pronunciar las consonantes con aire adicional.", color: COLOR_FAMILIES.rojo[3] },
          { titulo: "Grafias glotales", descripcion: "Domina los sonidos explosivos del quechua.", color: COLOR_FAMILIES.rojo[4] }
        ]
      }
    ]
  },
  {
    nombre: "Mi familia", orden: 2, color: COLOR_FAMILIES.verde[3],
    sesiones: [
      { titulo: "Vocabulario basico I", orden_clasificacion: 1, color: COLOR_FAMILIES.verde[2],
        lecciones: [
          { titulo: "Familia-Ayllu", descripcion: "Vocabulario para identificar a los miembros de la familia.", color: COLOR_FAMILIES.verde[0] },
          { titulo: "Animales-Uywakuna", descripcion: "Aprende los nombres de los animales mas comunes.", color: COLOR_FAMILIES.verde[1] },
          { titulo: "Plantas-Qachukuna/Yurakuna", descripcion: "Vocabulario relacionado con la flora andina.", color: COLOR_FAMILIES.verde[2] },
          { titulo: "Numeros-Yupaykuna", descripcion: "Aprende a contar en quechua del 1 al 10.", color: COLOR_FAMILIES.verde[3] },
          { titulo: "Colores-Llimpikuna", descripcion: "Descubre como se dicen los colores principales.", color: COLOR_FAMILIES.verde[4] },
          { titulo: "Fenomenos naturales-Pachamama munaynin", descripcion: "Terminos para el clima y la naturaleza.", color: COLOR_FAMILIES.verde[5] }
        ]
      },
      { titulo: "Vocabulario basico II", orden_clasificacion: 2, color: COLOR_FAMILIES.verde[3],
        lecciones: [
          { titulo: "Alimentos_Mikuykuna", descripcion: "Comidas y productos basicos de la dieta andina.", color: COLOR_FAMILIES.verde[0] },
          { titulo: "Metales-Chuqikuna", descripcion: "Terminos para metales y minerales.", color: COLOR_FAMILIES.verde[1] },
          { titulo: "El cuerpo_Ukhunchikmanta", descripcion: "Aprende las partes del cuerpo humano.", color: COLOR_FAMILIES.verde[2] },
          { titulo: "Objetos-Kaqkunamanta", descripcion: "Cosas cotidianas y herramientas.", color: COLOR_FAMILIES.verde[3] },
          { titulo: "Dias de la semana_Punchawkuna", descripcion: "Como nombrar los dias de la semana en quechua contemporaneo.", color: COLOR_FAMILIES.verde[4] },
          { titulo: "Meses del ano-Wata killakuna", descripcion: "Conoce el ciclo anual quechua.", color: COLOR_FAMILIES.verde[5] }
        ]
      },
      { titulo: "Palabra quechua", orden_clasificacion: 3, color: COLOR_FAMILIES.verde[4],
        lecciones: [
          { titulo: "Palabras simples", descripcion: "La unidad basica de significado.", color: COLOR_FAMILIES.verde[1] },
          { titulo: "Silaba", descripcion: "Como se estructuran las silabas en quechua.", color: COLOR_FAMILIES.verde[2] },
          { titulo: "Raiz", descripcion: "El nucleo de toda palabra aglutinada.", color: COLOR_FAMILIES.verde[3] },
          { titulo: "Sufijos", descripcion: "Las piezas que dan vida y contexto al quechua.", color: COLOR_FAMILIES.verde[4] },
          { titulo: "Palabras compuestas", descripcion: "Formando nuevos conceptos uniendo palabras.", color: COLOR_FAMILIES.verde[5] }
        ]
      }
    ]
  },
  {
    nombre: "Nuestra comunidad", orden: 3, color: COLOR_FAMILIES.azul[3],
    sesiones: [
      { titulo: "Sustantivo quechua", orden_clasificacion: 1, color: COLOR_FAMILIES.azul[2],
        lecciones: [
          { titulo: "Sustantivos", descripcion: "Que son los sustantivos (Sutikuna).", color: COLOR_FAMILIES.azul[1] },
          { titulo: "Sustantivos propios", descripcion: "Nombres de lugares y personas.", color: COLOR_FAMILIES.azul[2] },
          { titulo: "Sustantivos comunes", descripcion: "Cosas generales de nuestro entorno.", color: COLOR_FAMILIES.azul[3] }
        ]
      },
      { titulo: "Genero y numero", orden_clasificacion: 2, color: COLOR_FAMILIES.azul[3],
        lecciones: [
          { titulo: "Genero en las personas", descripcion: "Como distinguir masculino y femenino en humanos.", color: COLOR_FAMILIES.azul[2] },
          { titulo: "Genero en los animales", descripcion: "Diferenciar machos y hembras en los animales.", color: COLOR_FAMILIES.azul[3] },
          { titulo: "Numero", descripcion: "El sufijo pluralizador -kuna.", color: COLOR_FAMILIES.azul[4] }
        ]
      },
      { titulo: "Adjetivo quechua", orden_clasificacion: 3, color: COLOR_FAMILIES.azul[4],
        lecciones: [
          { titulo: "Adjetivos en personas", descripcion: "Cualidades para describir gente.", color: COLOR_FAMILIES.azul[0] },
          { titulo: "Adjetivos en animales", descripcion: "Describiendo la fauna.", color: COLOR_FAMILIES.azul[1] },
          { titulo: "Adjetivos en cosas u objetos", descripcion: "Atributos para los objetos.", color: COLOR_FAMILIES.azul[2] },
          { titulo: "Adjetivos en productos", descripcion: "Calificando alimentos y cosechas.", color: COLOR_FAMILIES.azul[3] },
          { titulo: "Adjetivos en plantas", descripcion: "Describiendo la flora.", color: COLOR_FAMILIES.azul[4] },
          { titulo: "Adjetivos en partes del cuerpo", descripcion: "Descripciones fisicas anatomicas.", color: COLOR_FAMILIES.azul[5] }
        ]
      }
    ]
  },
  {
    nombre: "Nuestras actividades", orden: 4, color: COLOR_FAMILIES.naranja[3],
    sesiones: [
      { titulo: "Verbos I", orden_clasificacion: 1, color: COLOR_FAMILIES.naranja[2],
        lecciones: [
          { titulo: "Verbos usados en la escuela", descripcion: "Acciones de aprendizaje y estudio.", color: COLOR_FAMILIES.naranja[0] },
          { titulo: "Verbos usados en la cocina", descripcion: "Acciones para preparar alimentos.", color: COLOR_FAMILIES.naranja[1] },
          { titulo: "Verbos usados en la chacra", descripcion: "Acciones del trabajo agricola.", color: COLOR_FAMILIES.naranja[2] },
          { titulo: "Verbos usados en la crianza", descripcion: "Verbos para el cuidado de animales.", color: COLOR_FAMILIES.naranja[3] },
          { titulo: "Verbos usados en el juego", descripcion: "Acciones recreativas y ludicas.", color: COLOR_FAMILIES.naranja[4] },
          { titulo: "Verbos usados en la casa", descripcion: "Labores y rutinas hogarenas.", color: COLOR_FAMILIES.naranja[5] }
        ]
      },
      { titulo: "Verbos II", orden_clasificacion: 2, color: COLOR_FAMILIES.naranja[3],
        lecciones: [
          { titulo: "Verbos usados en emociones", descripcion: "Expresando sentimientos en quechua.", color: COLOR_FAMILIES.naranja[0] },
          { titulo: "Verbos usados en construccion", descripcion: "Acciones de construir y reparar.", color: COLOR_FAMILIES.naranja[1] },
          { titulo: "Verbos usados en caza y pesca", descripcion: "Supervivencia y recoleccion en el campo.", color: COLOR_FAMILIES.naranja[2] },
          { titulo: "Verbos usados en la danza y canto", descripcion: "Expresiones artisticas.", color: COLOR_FAMILIES.naranja[3] },
          { titulo: "Verbos usados en cosecha", descripcion: "Recolectando los frutos de la tierra.", color: COLOR_FAMILIES.naranja[4] },
          { titulo: "Otros verbos", descripcion: "Verbos variados de alta frecuencia.", color: COLOR_FAMILIES.naranja[5] }
        ]
      }
    ]
  }
];

/* ── helpers ── */
const uniqueCategoriesJSON = [...new Set(dictionaryData.map(w => w.categoria))];
const getCatId = (c) => c.categoria_id || c.categorias_vocabulario_id || c.categorias_id || c.id;

/* ── styles ── */
const G = '#00ff41';
const R = '#ff0033';
const BG = '#0d0d0d';
const glowG = `0 0 4px ${G}`;
const glowR = `0 0 4px ${R}`;

const base = {
  fontFamily: '"Fira Code", "Cascadia Code", "Courier New", monospace',
  backgroundColor: BG,
  color: G,
};

const inputS = {
  ...base, border: `1px solid ${G}33`, padding: '10px 14px',
  width: '100%', boxSizing: 'border-box', outline: 'none', fontSize: '14px',
};

const btnG = {
  ...base, border: `1px solid ${G}`, padding: '12px 18px', cursor: 'pointer',
  width: '100%', textAlign: 'left', fontWeight: 'bold', fontSize: '13px',
  transition: 'all .15s', boxShadow: glowG,
};

const btnR = { ...btnG, color: R, borderColor: R, boxShadow: glowR };

const sectionBox = {
  border: `1px solid ${G}22`, padding: '18px', marginBottom: '16px', backgroundColor: '#0a120a',
};

const dangerBox = { ...sectionBox, borderColor: `${R}33`, backgroundColor: '#120a0a' };

const labelS = {
  fontSize: '11px', color: `${G}88`, textTransform: 'uppercase',
  letterSpacing: '2px', marginBottom: '8px', display: 'block',
};

export const SeedQuechua = () => {
  const logRef = useRef(null);

  const [cursos, setCursos] = useState([]);
  const [selectedCurso, setSelectedCurso] = useState('');
  const [dbCats, setDbCats] = useState([]);
  const [catSeed, setCatSeed] = useState('');
  const [catDel, setCatDel] = useState('');

  // Auth - real API login
  const [auth, setAuth] = useState(false);
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(1);

  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState([]);

  // After real login, load data
  useEffect(() => {
    if (!auth) return;
    getCursos()
      .then(r => setCursos(Array.isArray(r) ? r : (r?.data ?? [])))
      .catch(() => setCursos([]));
    reloadCats();
  }, [auth]);

  // Auto-scroll terminal
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const reloadCats = () => {
    getCategorias()
      .then(r => setDbCats(Array.isArray(r) ? r : (r?.data ?? [])))
      .catch(() => setDbCats([]));
  };

  const log = (m) => setLogs(p => [...p.slice(-80), m]);

  /* ══════════ REAL API LOGIN ══════════ */
  const doLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    log('Connecting to remote server...');
    try {
      const response = await apiLogin(correo, contrasena);

      // Extract token & user from response
      const token = response.token || response.data?.token;
      const usuario = response.usuario || response.data?.usuario || {};

      if (!token) {
        log('AUTH_FAIL: no token received');
        setAuthLoading(false);
        return;
      }

      // Store token in localStorage so axios interceptor picks it up
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(usuario));

      // Save the user ID for creado_por_id
      setCurrentUserId(usuario.usuario_id || usuario.id || 1);

      log('AUTH_OK: token acquired');
      log(`session: ${usuario.correo || correo} (${usuario.rol || 'admin'})`);
      setAuth(true);
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Connection failed';
      log(`AUTH_DENIED: ${msg}`);
    } finally {
      setAuthLoading(false);
    }
  };

  /* ────── SEED: curriculum ────── */
  const seedCurriculum = async () => {
    if (!selectedCurso) { log('ERR: select a course first'); return; }
    setBusy(true);
    log('INIT curriculum_inject...');
    try {
      for (const u of curriculum) {
        log(`mkdir UNIDAD "${u.nombre}"`);
        const unitColor = u.color || getColorByOrder(COLOR_FAMILIES.rojo[3], u.orden);
        const cu = await createUnidad({ curso_id: parseInt(selectedCurso), codigo: null, nombre: u.nombre, orden: u.orden, color: unitColor, estado: 'activo', creado_por_id: currentUserId });
        log(`  -> response: ${JSON.stringify(cu).substring(0, 120)}`);
        const uid = cu.data?.unidad_id || cu.data?.id || cu.unidad_id || cu.id;
        if (!uid) { log(`  ERR: no unidad ID in response`); continue; }
        for (const s of u.sesiones) {
          log(`  mkdir SESION "${s.titulo}"`);
          const sesionColor = s.color || getColorByOrder(unitColor, s.orden_clasificacion);
          const cs = await createSesion({ unidad_id: parseInt(uid), titulo: s.titulo, orden: s.orden_clasificacion, color: sesionColor, url_imagen: null, estado: 'activo', creado_por_id: currentUserId });
          log(`    -> response: ${JSON.stringify(cs).substring(0, 120)}`);
          const sid = cs.data?.sesion_id || cs.data?.id || cs.sesion_id || cs.id;
          if (!sid) { log(`    ERR: no sesion ID in response`); continue; }
          let o = 1;
          for (const l of s.lecciones) {
            const leccionOrder = o++;
            const leccionColor = l.color || getColorByOrder(sesionColor, leccionOrder);
            log(`    touch LECCION "${l.titulo}"`);
            const cl = await createLeccion({ sesion_id: parseInt(sid), titulo: l.titulo, descripcion: l.descripcion, orden: leccionOrder, xp_recompensa: 100, color: leccionColor, url_icono: null, estado: 'activo', creado_por_id: currentUserId });
            log(`      -> response: ${JSON.stringify(cl).substring(0, 100)}`);
          }
        }
      }
      log('OK curriculum_inject complete');
      toast.success('Curriculum inyectado');
    } catch (e) {
      log(`FATAL: ${e.message}`);
      if (e.response?.data) log(`  DETAIL: ${JSON.stringify(e.response.data).substring(0, 200)}`);
    }
    finally { setBusy(false); }
  };

  /* ────── SEED: all categories ────── */
  const seedAllCats = async () => {
    setBusy(true);
    log('INIT category_inject...');
    try {
      for (const name of uniqueCategoriesJSON) {
        log(`inject cat "${name}"`);
        try {
          await createCategoria({ nombre: name, descripcion: `Palabras: ${name}`, estado: 'publicado', creado_por_id: currentUserId });
        } catch { log(`  WARN: "${name}" might already exist`); }
      }
      log('OK category_inject complete');
      toast.success('Categorias inyectadas');
      reloadCats();
    } catch (e) { log(`FATAL: ${e.message}`); }
    finally { setBusy(false); }
  };

  /* ────── SEED: words by category ────── */
  const seedWordsByCat = async () => {
    if (!selectedCurso) { log('ERR: select course'); return; }
    if (!catSeed) { log('ERR: select category'); return; }

    const curso = cursos.find(c => String(c.curso_id || c.id) === String(selectedCurso));
    const langId = curso?.idioma_destino_id || curso?.idioma_destino?.id;
    if (!langId) { log('ERR: cannot resolve language'); return; }

    const dbCat = dbCats.find(c => c.nombre === catSeed);
    const cid = dbCat ? getCatId(dbCat) : null;
    if (!cid) { log('ERR: category not in DB. Inject categories first.'); return; }

    const words = dictionaryData.filter(w => w.categoria === catSeed);
    setBusy(true);
    log(`INIT word_inject for "${catSeed}" (${words.length} words)...`);
    try {
      for (const w of words) {
        log(`  upload "${w.palabra}"`);
        try {
          const srcLangId = curso?.idioma_origen_id || curso?.idioma_origen?.id || curso?.idioma_origen?.idioma_id || 1;
          await createPalabra({
            idioma_id: parseInt(langId, 10),
            idiomas_id: parseInt(langId, 10), // Some endpoints expect plural
            termino: w.palabra.trim(),
            transcripcion_fonetica: w.fonetica.trim(),
            nivel_dificultad: 1,
            categorias_ids: [parseInt(cid, 10)],
            traducciones: w.traducciones.map((translation) => {
              const data = typeof translation === 'string' ? { termino: translation } : translation;
              const terminoTraducido = String(data.termino || data.traduccion || '').trim();
              return {
                idioma_destino_id: parseInt(srcLangId, 10),
                idiomas_destino_id: parseInt(srcLangId, 10),
                termino_traducido: terminoTraducido,
                // El modelo todavía acepta definiciones; los propios términos
                // mantienen compatibilidad sin añadir contenido artificial.
                definicion_origen: String(data.definicion_origen || w.palabra).trim(),
                definicion_destino: String(data.definicion_destino || terminoTraducido).trim(),
                ejemplo_origen: String(data.ejemplo_origen || `Kay simiqa «${w.palabra}» nisqami.`).trim(),
                ejemplo_traduccion: String(data.ejemplo_traduccion || `Esta palabra se traduce como «${terminoTraducido}».`).trim()
              };
            })
          });
        } catch (e) { 
          log(`  FAIL "${w.palabra}": ${e.message}`);
          if (e.response?.data) {
            log(`  DETAIL: ${JSON.stringify(e.response.data)}`);
          }
        }
      }
      log('OK word_inject complete');
      toast.success(`${words.length} palabras inyectadas`);
    } catch (e) { log(`FATAL: ${e.message}`); }
    finally { setBusy(false); }
  };

  /* ────── DELETE: curriculum ────── */
  const delCurriculum = async () => {
    setBusy(true);
    log('INIT rm -rf curriculum/*');
    try {
      const ll = await getLecciones().then(r => Array.isArray(r) ? r : (r?.data ?? []));
      for (const l of ll) { log(`  rm leccion ${l.leccion_id || l.id}`); await deleteLeccion(l.leccion_id || l.id).catch(() => {}); }
      const ss = await getSesiones().then(r => Array.isArray(r) ? r : (r?.data ?? []));
      for (const s of ss) { log(`  rm sesion ${s.sesion_id || s.id}`); await deleteSesion(s.sesion_id || s.id).catch(() => {}); }
      const uu = await getUnidads().then(r => Array.isArray(r) ? r : (r?.data ?? []));
      for (const u of uu) { log(`  rm unidad ${u.unidad_id || u.id}`); await deleteUnidad(u.unidad_id || u.id).catch(() => {}); }
      log('OK curriculum purged');
      toast.success('Curriculum eliminado');
    } catch (e) { log(`FATAL: ${e.message}`); }
    finally { setBusy(false); }
  };

  /* ────── DELETE: words by category ────── */
  const delWordsByCat = async () => {
    if (!catDel) { log('ERR: select a category to purge'); return; }
    setBusy(true);
    log(`INIT rm words where cat=${catDel}...`);
    try {
      const all = await getPalabras().then(r => Array.isArray(r) ? r : (r?.data ?? []));
      let n = 0;
      for (const p of all) {
        const cats = p.categorias || [];
        if (cats.some(c => String(getCatId(c)) === String(catDel))) {
          log(`  rm "${p.termino || p.palabra}"`);
          await deletePalabra(p.palabra_id || p.id).catch(() => {});
          n++;
        }
      }
      log(`OK purged ${n} words`);
      toast.success(`${n} palabras eliminadas`);
    } catch (e) { log(`FATAL: ${e.message}`); }
    finally { setBusy(false); }
  };

  /* ────── DELETE: all words ────── */
  const delAllWords = async () => {
    setBusy(true);
    log('INIT rm -rf words/*');
    try {
      const all = await getPalabras().then(r => Array.isArray(r) ? r : (r?.data ?? []));
      for (const p of all) { log(`  rm "${p.termino || p.palabra}"`); await deletePalabra(p.palabra_id || p.id).catch(() => {}); }
      log('OK all words purged');
      toast.success('Palabras eliminadas');
    } catch (e) { log(`FATAL: ${e.message}`); }
    finally { setBusy(false); }
  };

  /* ────── DELETE: all categories ────── */
  const delAllCats = async () => {
    setBusy(true);
    log('INIT rm -rf categories/*');
    try {
      const all = await getCategorias().then(r => Array.isArray(r) ? r : (r?.data ?? []));
      for (const c of all) { log(`  rm "${c.nombre}"`); await deleteCategoria(getCatId(c)).catch(() => {}); }
      log('OK all categories purged');
      toast.success('Categorias eliminadas');
      reloadCats();
    } catch (e) { log(`FATAL: ${e.message}`); }
    finally { setBusy(false); }
  };

  /* ══════════════════ LOGIN SCREEN ══════════════════ */
  if (!auth) {
    return (
      <div style={{ ...base, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={doLogin} style={{ width: 400, border: `1px solid ${G}33`, padding: 32, backgroundColor: '#0a120a' }}>
          <pre style={{ color: G, fontSize: 12, marginBottom: 24, textAlign: 'center', lineHeight: 1.3 }}>{`
 _____ _____ _____ ____
|  _  |     |  _  |  _ |
|    _|  |  |     |  | |
|__|__|_____|__|__|____|
  RIMAQMASI  OVERRIDE
`}</pre>
          <div style={{ marginBottom: 16 }}>
            <label style={labelS}>correo</label>
            <input
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              style={inputS}
              autoFocus
              placeholder="admin@correo.com"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelS}>password</label>
            <input
              type="password"
              value={contrasena}
              onChange={e => setContrasena(e.target.value)}
              style={inputS}
            />
          </div>
          <button
            type="submit"
            disabled={authLoading}
            style={{ ...btnG, opacity: authLoading ? 0.5 : 1, textAlign: 'center' }}
          >
            {authLoading ? 'CONNECTING...' : '> AUTHENTICATE'}
          </button>
          {logs.length > 0 && (
            <div style={{ marginTop: 16, fontSize: 12, maxHeight: 100, overflowY: 'auto' }}>
              {logs.map((l, i) => (
                <div key={i} style={{ color: l.includes('DENIED') || l.includes('FAIL') ? R : G, marginBottom: 2 }}>{l}</div>
              ))}
            </div>
          )}
        </form>
      </div>
    );
  }

  /* ══════════════════ MAIN PANEL ══════════════════ */
  return (
    <div style={{ ...base, minHeight: '100vh', padding: '24px 20px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* header */}
        <div style={{ borderBottom: `1px solid ${G}22`, paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: G, letterSpacing: 3 }}>RIMAQMASI://ROOT</h1>
            <span style={{ fontSize: 11, color: `${G}66` }}>seed &amp; purge terminal v2.0</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: G, boxShadow: glowG, display: 'inline-block' }} />
            ONLINE (token active)
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>

          {/* ─── LEFT: CONTROLS ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: '85vh', overflowY: 'auto' }}>

            {/* course select */}
            <div style={sectionBox}>
              <label style={labelS}>target course</label>
              <select value={selectedCurso} onChange={e => setSelectedCurso(e.target.value)} style={inputS}>
                <option value="">-- none --</option>
                {cursos.map(c => (
                  <option key={c.curso_id || c.id} value={c.curso_id || c.id}>
                    {c.idioma_origen?.nombre || '?'} {'->'} {c.idioma_destino?.nombre || '?'}
                  </option>
                ))}
              </select>
            </div>

            {/* inject section */}
            <div style={sectionBox}>
              <label style={labelS}>inject routines</label>
              <button disabled={busy} onClick={seedCurriculum} style={{ ...btnG, marginBottom: 8, opacity: busy ? .4 : 1 }}>
                {'>'} seed_curriculum (4u/10s/48l)
              </button>
              <button disabled={busy} onClick={seedAllCats} style={{ ...btnG, marginBottom: 12, opacity: busy ? .4 : 1 }}>
                {'>'} seed_all_categories
              </button>

              <label style={{ ...labelS, marginTop: 8 }}>inject words by category</label>
              <select value={catSeed} onChange={e => setCatSeed(e.target.value)} style={{ ...inputS, marginBottom: 8 }}>
                <option value="">-- select json category --</option>
                {uniqueCategoriesJSON.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button disabled={busy} onClick={seedWordsByCat} style={{ ...btnG, opacity: busy ? .4 : 1 }}>
                {'>'} seed_words_for_category
              </button>
            </div>

            {/* destroy section */}
            <div style={dangerBox}>
              <label style={{ ...labelS, color: `${R}88` }}>destroy routines</label>

              <button disabled={busy} onClick={delCurriculum} style={{ ...btnR, marginBottom: 8, opacity: busy ? .4 : 1 }}>
                {'>'} purge_all_curriculum
              </button>

              <label style={{ ...labelS, color: `${R}88`, marginTop: 8 }}>purge words by db category</label>
              <select value={catDel} onChange={e => setCatDel(e.target.value)} style={{ ...inputS, color: R, borderColor: `${R}33`, marginBottom: 8 }}>
                <option value="">-- select db category --</option>
                {dbCats.map(c => <option key={getCatId(c)} value={getCatId(c)}>{c.nombre}</option>)}
              </select>
              <button disabled={busy} onClick={delWordsByCat} style={{ ...btnR, marginBottom: 12, opacity: busy ? .4 : 1 }}>
                {'>'} purge_words_in_category
              </button>

              <div style={{ borderTop: `1px dashed ${R}33`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button disabled={busy} onClick={delAllWords} style={{ ...btnR, opacity: busy ? .4 : 1 }}>
                  {'>'} purge_all_words
                </button>
                <button disabled={busy} onClick={delAllCats} style={{ ...btnR, opacity: busy ? .4 : 1 }}>
                  {'>'} purge_all_categories
                </button>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: TERMINAL ─── */}
          <div style={{ border: `1px solid ${G}22`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${G}22`, fontSize: 11, display: 'flex', justifyContent: 'space-between', color: `${G}88` }}>
              <span>SYSTEM_OUTPUT</span>
              {busy && <span style={{ color: G }}>PROCESSING...</span>}
            </div>
            <div
              ref={logRef}
              style={{
                flex: 1, backgroundColor: '#030803', padding: 16,
                overflowY: 'auto', minHeight: '70vh', maxHeight: '80vh',
                fontSize: 13, lineHeight: 1.6,
              }}
            >
              {logs.length === 0
                ? <div style={{ color: `${G}44` }}>{'>'} awaiting_command...</div>
                : logs.map((l, i) => (
                    <div key={i} style={{ color: l.includes('FATAL') || l.includes('ERR') || l.includes('FAIL') || l.includes('DENIED') ? R : l.includes('OK ') ? '#00ffaa' : G }}>
                      {l}
                    </div>
                  ))
              }
              {busy && <div style={{ color: G, marginTop: 4 }}>_</div>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
