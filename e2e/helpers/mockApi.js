const nowIso = () => new Date().toISOString();

export function createInitialState() {
  return {
    idiomas: [
      { idioma_id: 1, id: 1, nombre: 'Español', nombres: 'Español', codigo_iso: 'es', url_icono_bandera: null, activo: true },
      { idioma_id: 2, id: 2, nombre: 'Quechua', nombres: 'Quechua', codigo_iso: 'qu', url_icono_bandera: null, activo: true },
    ],
    usuarios: [
      { id: 1, usuario_id: 1, nombres: 'ADMI', apellidos: 'Super Admin', correo: 'admin@rimaqmasi.com', rol: 'super_admin', estado: 'activo', xp_total: 0, racha_actual: 0, creado_en: nowIso() },
      { id: 2, usuario_id: 2, nombres: 'Baltazhar', apellidos: 'Drago', correo: 'baltazhar@unamba.edu.pe', rol: 'admin', estado: 'activo', xp_total: 0, racha_actual: 0, creado_en: nowIso() },
      { id: 3, usuario_id: 3, nombres: 'Kusi', apellidos: 'Quispe', correo: 'kusi@unamba.edu.pe', rol: 'estudiante', estado: 'activo', xp_total: 1450, racha_actual: 7, creado_en: nowIso() },
    ],
    cursos: [
      {
        curso_id: 1,
        id: 1,
        idioma_origen_id: 1,
        idioma_destino_id: 2,
        nombre: 'Quechua Sureño desde Español',
        nivel: 'A1',
        url_imagen_portada: null,
        estado: 'activo',
        creado_por_id: 1,
        creado_en: nowIso(),
        idioma_origen: { idioma_id: 1, nombre: 'Español', nombres: 'Español', codigo_iso: 'es' },
        idioma_destino: { idioma_id: 2, nombre: 'Quechua', nombres: 'Quechua', codigo_iso: 'qu' },
      },
    ],
    unidades: [
      {
        unidad_id: 1,
        id: 1,
        curso_id: 1,
        nombre: 'Introduccion al quechua',
        titulo: 'Introduccion al quechua',
        orden: 1,
        color: '#b91c1c',
        url_imagen: null,
        estado: 'activo',
        creado_por_id: 1,
        creado_en: nowIso(),
      },
    ],
    sesiones: [
      {
        sesion_id: 1,
        id: 1,
        unidad_id: 1,
        titulo: 'El quechua, origen y caracteristicas',
        orden: 1,
        color: '#dc2626',
        url_imagen: null,
        estado: 'activo',
        creado_por_id: 1,
        creado_en: nowIso(),
      },
    ],
    lecciones: [
      {
        leccion_id: 1,
        id: 1,
        sesion_id: 1,
        sesiones_id: 1,
        titulo: 'El origen del quechua',
        descripcion: 'Aprende los origenes historicos y geograficos del idioma quechua.',
        contenido_lectura: null,
        orden: 1,
        color: '#ef4444',
        url_icono: null,
        xp_recompensa: 100,
        estado: 'activo',
        creado_por_id: 1,
        creado_en: nowIso(),
      },
    ],
    categorias: [
      { categoria_id: 1, id: 1, nombre: 'Familia y personas', descripcion: 'Miembros de la familia andina.', activo: true },
      { categoria_id: 2, id: 2, nombre: 'Animales', descripcion: 'Fauna andina y doméstica.', activo: true },
    ],
    palabras: [
      {
        palabra_id: 1,
        id: 1,
        idioma_id: 2,
        termino: 'Ayllu',
        transcripcion_fonetica: '/ˈaj.ʎu/',
        dificultad: 1,
        estado: 'publicado',
        categoria_id: 1,
        categoria: { categoria_id: 1, nombre: 'Familia y personas' },
        categorias: [{ categoria_id: 1, nombre: 'Familia y personas' }],
        idioma: { idioma_id: 2, nombre: 'Quechua', nombres: 'Quechua', codigo_iso: 'qu' },
        definiciones: [{ definicion_id: 1, idioma_definicion_id: 2, definicion: 'Ayllu' }],
        ejemplos: [{ ejemplo_id: 1, texto_ejemplo: 'Aylluywan tiyani.', texto_significado: 'Vivo con mi familia.', idioma_significado_id: 1 }],
        traduccionesOrigen: [
          {
            traduccion_palabra_id: 1,
            palabraDestino: {
              palabra_id: 101,
              idioma_id: 1,
              termino: 'Familia',
              idioma: { idioma_id: 1, nombre: 'Español', nombres: 'Español', codigo_iso: 'es' },
              definiciones: [{ definicion_id: 2, idioma_definicion_id: 1, definicion: 'Familia' }],
            },
          },
        ],
      },
    ],
    retos: [
      {
        reto_id: 1,
        leccion_id: 1,
        tipo: 'opcion_multiple',
        instruccion: '¿Cómo se dice "Familia" en quechua?',
        orden: 1,
        contenido: { pregunta: 'Familia' },
        opciones: ['Ayllu', 'Inti', 'Mayu', 'Rumi'],
        solucion: { indice_correcto: 0, texto_esperado: 'Ayllu' },
        pistas: ['Empieza con A'],
        puntos: 15,
        dificultad: 1,
        tiempo_limite_seg: 30,
        estado: 'publicado',
        disponible_seleccion: true,
      },
    ],
    logros: [
      {
        logros_id: 1,
        logro_id: 1,
        titulo: 'Semilla del Saber',
        descripcion: 'Completa tu primera lección.',
        metrica_requerida: 'lecciones_completadas',
        valor_requerido: 1,
        xp_recompensa: 25,
        url_imagen_medalla: null,
      },
    ],
  };
}

export async function setupMockApi(page, options = {}) {
  const state = createInitialState();
  const force401Paths = new Set(options.force401Paths || []);

  await page.route('**/api/v1/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname.replace(/^.*\/api\/v1/, '');
    const method = req.method().toUpperCase();

    const json = (data, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

    if (force401Paths.has(pathname)) {
      return json({ success: false, message: 'Token expirado' }, 401);
    }

    let body = {};
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const raw = req.postData();
      if (raw) {
        try { body = JSON.parse(raw); } catch { body = {}; }
      }
    }

    // AUTH
    if (pathname === '/auth/login' && method === 'POST') {
      const correo = String(body.correo || '').toLowerCase();
      if (correo === 'alumno@unamba.edu.pe') {
        return json({
          success: true,
          token: 'tok-student',
          refresh_token: 'ref-student',
          usuario: { id: 3, correo, nombres: 'Kusi', apellidos: 'Quispe', rol: 'estudiante' },
        });
      }
      if (correo === 'baltazhar@unamba.edu.pe') {
        return json({
          success: true,
          token: 'tok-admin',
          refresh_token: 'ref-admin',
          usuario: { id: 2, correo, nombres: 'Baltazhar', apellidos: 'Drago', rol: 'admin' },
        });
      }
      if (correo === 'admin@rimaqmasi.com' && body.contrasena === 'RimaqMasi2026!') {
        return json({
          success: true,
          token: 'tok-super',
          refresh_token: 'ref-super',
          usuario: { id: 1, correo, nombres: 'ADMI', apellidos: 'Super Admin', rol: 'super_admin' },
        });
      }
      return json({ success: false, message: 'Credenciales inválidas' }, 401);
    }
    if (pathname === '/auth/logout' && method === 'POST') {
      return json({ success: true });
    }
    if (pathname === '/auth/refresh' && method === 'POST') {
      return json({ success: false, message: 'Refresh expirado' }, 401);
    }

    // USUARIOS
    if (pathname === '/usuarios' && method === 'GET') {
      return json({ success: true, data: state.usuarios });
    }
    if (pathname === '/usuarios' && method === 'POST') {
      const id = state.usuarios.length + 1;
      const item = { id, usuario_id: id, estado: 'activo', xp_total: 0, racha_actual: 0, creado_en: nowIso(), ...body };
      state.usuarios.push(item);
      return json({ success: true, data: item }, 201);
    }
    if (/^\/usuarios\/\d+\/estado$/.test(pathname) && method === 'PATCH') {
      const id = Number(pathname.split('/')[2]);
      const found = state.usuarios.find((u) => u.id === id);
      if (found) found.estado = body.estado;
      return json({ success: true, data: found });
    }
    if (/^\/usuarios\/\d+$/.test(pathname) && method === 'DELETE') {
      const id = Number(pathname.split('/')[2]);
      state.usuarios = state.usuarios.filter((u) => u.id !== id);
      return json({ success: true });
    }

    // IDIOMAS
    if (pathname === '/idiomas' && method === 'GET') {
      return json({ success: true, data: state.idiomas });
    }

    // CURSOS
    if (pathname === '/cursos' && method === 'GET') {
      return json({ success: true, data: state.cursos });
    }
    if (/^\/cursos\/\d+$/.test(pathname) && method === 'GET') {
      const id = Number(pathname.split('/')[2]);
      return json({ success: true, data: state.cursos.find((c) => c.curso_id === id) });
    }
    if (pathname === '/cursos' && method === 'POST') {
      const id = state.cursos.length + 1;
      const origen = state.idiomas.find((i) => i.idioma_id === Number(body.idioma_origen_id));
      const destino = state.idiomas.find((i) => i.idioma_id === Number(body.idioma_destino_id));
      const item = { curso_id: id, id, estado: 'activo', creado_en: nowIso(), idioma_origen: origen, idioma_destino: destino, ...body };
      state.cursos.push(item);
      return json({ success: true, data: item }, 201);
    }

    // UNIDADES
    if (pathname === '/unidades' && method === 'GET') {
      return json({ success: true, data: state.unidades });
    }
    if (/^\/unidades\/curso\/\d+$/.test(pathname) && method === 'GET') {
      const cid = Number(pathname.split('/')[3]);
      return json({ success: true, data: state.unidades.filter((u) => u.curso_id === cid) });
    }
    if (pathname === '/unidades' && method === 'POST') {
      const id = state.unidades.length + 1;
      const item = { unidad_id: id, id, titulo: body.nombre, estado: 'activo', creado_en: nowIso(), ...body };
      state.unidades.push(item);
      return json({ success: true, data: item }, 201);
    }

    // SESIONES
    if (pathname === '/sesiones' && method === 'GET') {
      return json({ success: true, data: state.sesiones });
    }
    if (/^\/sesiones\/unidad\/\d+$/.test(pathname) && method === 'GET') {
      const uid = Number(pathname.split('/')[3]);
      return json({ success: true, data: state.sesiones.filter((s) => s.unidad_id === uid) });
    }
    if (pathname === '/sesiones' && method === 'POST') {
      const id = state.sesiones.length + 1;
      const item = { sesion_id: id, id, estado: 'activo', creado_en: nowIso(), ...body };
      state.sesiones.push(item);
      return json({ success: true, data: item }, 201);
    }

    // LECCIONES
    if (pathname === '/lecciones' && method === 'GET') {
      return json({ success: true, data: state.lecciones });
    }
    if (/^\/lecciones\/sesion\/\d+$/.test(pathname) && method === 'GET') {
      const sid = Number(pathname.split('/')[3]);
      return json({ success: true, data: state.lecciones.filter((l) => l.sesion_id === sid) });
    }
    if (pathname === '/lecciones' && method === 'POST') {
      const id = state.lecciones.length + 1;
      const item = { leccion_id: id, id, sesiones_id: body.sesion_id, estado: 'activo', creado_en: nowIso(), ...body };
      state.lecciones.push(item);
      return json({ success: true, data: item }, 201);
    }

    // DICCIONARIO
    if (pathname === '/dictionary/categories' && method === 'GET') {
      return json({ success: true, data: state.categorias });
    }
    if (pathname === '/dictionary/categories' && method === 'POST') {
      const id = state.categorias.length + 1;
      const item = { categoria_id: id, id, activo: true, ...body };
      state.categorias.push(item);
      return json({ success: true, data: item }, 201);
    }
    if (/^\/dictionary\/categories\/\d+$/.test(pathname) && method === 'DELETE') {
      const id = Number(pathname.split('/')[3]);
      state.categorias = state.categorias.filter((c) => c.categoria_id !== id);
      return json({ success: true });
    }
    if (pathname === '/dictionary/words' && method === 'GET') {
      return json({ success: true, data: state.palabras });
    }
    if (pathname === '/dictionary/words' && method === 'POST') {
      const id = state.palabras.length + 1;
      const cat = state.categorias.find((c) => c.categoria_id === Number(body.categorias_ids?.[0]));
      const trad = body.traducciones?.[0];
      const item = {
        palabra_id: id,
        id,
        idioma_id: Number(body.idioma_id || 2),
        termino: body.termino,
        transcripcion_fonetica: body.transcripcion_fonetica || '',
        dificultad: Number(body.nivel_dificultad || 1),
        estado: 'publicado',
        categoria: cat || null,
        categorias: cat ? [cat] : [],
        idioma: state.idiomas.find((i) => i.idioma_id === Number(body.idioma_id || 2)),
        definiciones: [],
        ejemplos: trad?.ejemplo_origen ? [{ ejemplo_id: id, texto_ejemplo: trad.ejemplo_origen, texto_significado: trad.ejemplo_traduccion }] : [],
        traduccionesOrigen: trad
          ? [{ traduccion_palabra_id: id, palabraDestino: { palabra_id: 200 + id, idioma_id: 1, termino: trad.termino_traducido } }]
          : [],
      };
      state.palabras.push(item);
      return json({ success: true, data: item }, 201);
    }
    if (pathname === '/dictionary/contributions' && method === 'GET') {
      return json({ success: true, data: [] });
    }

    // RETOS
    if (/^\/admin\/retos\/lecciones\/\d+\/resumen$/.test(pathname) && method === 'GET') {
      const lid = Number(pathname.split('/')[4]);
      const lec = state.lecciones.find((l) => l.leccion_id === lid) || state.lecciones[0];
      const lessonRetos = state.retos.filter((r) => r.leccion_id === lid);
      return json({
        success: true,
        data: {
          leccion: {
            ...lec,
            cantidad_retos_intento: 10,
            porcentaje_aprobacion: 70,
            configuracion_adaptativa: { tipos: { opcion_multiple: 40, completar: 30, traducir: 30 } },
            recursos: [],
            retos: lessonRetos,
          },
          palabras_disponibles: state.palabras.map((p) => ({
            ...p,
            vinculada: true,
          })),
          estadisticas: {
            banco_total: lessonRetos.length,
            publicados: lessonRetos.length,
            xp_maxima_aproximada: lessonRetos.reduce((acc, r) => acc + Number(r.puntos || 10), 0),
          },
        },
      });
    }
    if (pathname === '/admin/retos/retos' && method === 'POST') {
      const id = state.retos.length + 1;
      const item = { reto_id: id, orden: id, ...body };
      state.retos.push(item);
      return json({ success: true, data: item }, 201);
    }

    // LOGROS
    if (pathname === '/logros' && method === 'GET') {
      return json({ success: true, data: state.logros });
    }
    if (pathname === '/logros' && method === 'POST') {
      const id = state.logros.length + 1;
      const item = { logros_id: id, logro_id: id, url_imagen_medalla: null, ...body };
      state.logros.push(item);
      return json({ success: true, data: item }, 201);
    }
    if (/^\/logros\/\d+$/.test(pathname) && method === 'PUT') {
      const id = Number(pathname.split('/')[2]);
      const idx = state.logros.findIndex((l) => l.logros_id === id);
      if (idx >= 0) state.logros[idx] = { ...state.logros[idx], ...body };
      return json({ success: true, data: state.logros[idx] });
    }
    if (/^\/logros\/\d+$/.test(pathname) && method === 'DELETE') {
      const id = Number(pathname.split('/')[2]);
      state.logros = state.logros.filter((l) => l.logros_id !== id);
      return json({ success: true });
    }

    // VIDAS Y RACHAS
    if (pathname === '/vidas/configuracion' && method === 'GET') {
      return json({
        success: true,
        data: {
          vidas_maximas: 5,
          horas_por_recarga: 5,
          minutos_por_recarga: 300,
          pierde_vida_por_error: true,
          activo: true,
        },
      });
    }

    // ANALYTICS & EXPORTACIONES
    if (pathname === '/admin/analytics/overview' && method === 'GET') {
      return json({
        success: true,
        data: {
          totals: {
            usuarios: 3,
            estudiantes: 1,
            admins: 2,
            cursos: 1,
            unidades: 1,
            sesiones: 1,
            lecciones: 1,
            matriculas: 1,
            palabras: 1,
            intentos: 4,
            respuestas: 20,
            correctas: 17,
            precision_global: 85,
            logros_desbloqueados: 2,
          },
          distributions: {
            usuarios_estado: [{ key: 'activo', label: 'Activo', value: 1 }],
            cursos_estado: [{ key: 'activo', label: 'Activo', value: 1 }],
            palabras_estado: [{ key: 'publicado', label: 'Publicado', value: 1 }],
            retos_tipo: [{ key: 'opcion_multiple', label: 'Opción múltiple', value: 1 }],
          },
          trends: [
            { fecha: '2026-11-17', usuarios: 1, matriculas: 1, intentos: 2, respuestas: 10, correctas: 9 },
            { fecha: '2026-11-18', usuarios: 1, matriculas: 1, intentos: 2, respuestas: 10, correctas: 8 },
          ],
          recent_activity: [
            { tipo: 'usuario', titulo: 'Nuevo estudiante', detalle: 'Kusi Quispe', usuario: 'ADMI', fecha: nowIso() },
          ],
          export_counts: { users: 1, courses: 1, learning: 2, enrollments: 1, dictionary: 1, activity: 1 },
        },
      });
    }
    if (/^\/admin\/analytics\/export\//.test(pathname) && method === 'GET') {
      const dataset = pathname.split('/').pop();
      const rowsByDataset = {
        users: [{ ID: 3, Nombre: 'Kusi Quispe', Correo: 'kusi@unamba.edu.pe', Rol: 'estudiante', Estado: 'activo', XP: 1450 }],
        courses: [{ ID: 1, Curso: 'Quechua Sureño desde Español', Nivel: 'A1', Estado: 'activo' }],
        learning: [{ Fecha: '18/11/2026', Intentos: 2, Respuestas: 10, Correctas: 8 }],
        enrollments: [{ ID: 1, Estudiante: 'Kusi Quispe', Curso: 'Quechua Sureño desde Español', Progreso: '50%' }],
        dictionary: [{ ID: 1, Termino: 'Ayllu', Traduccion: 'Familia', Estado: 'publicado' }],
        activity: [{ Fecha: '18/11/2026', Modulo: 'Usuarios', Evento: 'Registro', Usuario: 'ADMI' }],
      };
      return json({ success: true, data: { dataset, rows: rowsByDataset[dataset] || rowsByDataset.users } });
    }

    return json({ success: true, data: [] });
  });

  return state;
}

export async function loginAs(page, role = 'super_admin') {
  const user =
    role === 'admin'
      ? { id: 2, correo: 'baltazhar@unamba.edu.pe', nombres: 'Baltazhar', apellidos: 'Drago', rol: 'admin' }
      : { id: 1, correo: 'admin@rimaqmasi.com', nombres: 'ADMI', apellidos: 'Super Admin', rol: 'super_admin' };

  await page.addInitScript((u) => {
    localStorage.setItem('token', `tok-${u.rol}`);
    localStorage.setItem('refresh_token', `ref-${u.rol}`);
    localStorage.setItem('user', JSON.stringify(u));
  }, user);
}
