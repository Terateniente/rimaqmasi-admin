# Matriz QA de Compatibilidad Multi-navegador y Resoluciones (ADM-10)

**Fecha de ejecución:** 18 de noviembre de 2026  
**Suite automatizada:** [`e2e/compatibility.spec.js`](../e2e/compatibility.spec.js) + [`e2e/auth-permissions.spec.js`](../e2e/auth-permissions.spec.js)  
**Comando completo (Chrome/Chromium + Firefox + Edge):**
```powershell
$env:PLAYWRIGHT_EDGE='true'; npx playwright test e2e/compatibility.spec.js e2e/auth-permissions.spec.js
```

## 1. Matriz de navegadores y resoluciones objetivo

| Navegador / Motor | Desktop FHD (`1440×900`) | Desktop HD (`1280×800`) | Tableta horizontal (`1024×768`) | Tableta vertical (`768×1024`) | Autenticación y permisos (5 flujos) |
|---|---|---|---|---|---|
| **Google Chrome / Chromium** (Playwright) | PASS | PASS | PASS | PASS | 5/5 PASS |
| **Microsoft Edge** (`channel: msedge`) | PASS | PASS | PASS | PASS | 5/5 PASS |
| **Mozilla Firefox** (Playwright Firefox 159) | PASS | PASS | PASS | PASS | 5/5 PASS |

## 2. Criterios verificados por combinación

En cada navegador y resolución se validó automáticamente:

1. **Cero desbordamiento horizontal (`scrollWidth <= clientWidth + 2px`)** en `<html>` y `<body>` en rutas representativas de alta densidad:
   - `/dashboard` (gráficos Recharts, tarjetas KPI, botones de exportación)
   - `/usuarios` (tabla de gestión, filtros y acciones por fila)
   - `/academica/cursos` (tarjetas/listado con pares de idioma y portadas)
   - `/gamificacion/logros` (grilla de tarjetas, filtros y modal con carga de medalla)
2. **Navegación adaptativa:**
   - En `1440×900`, `1280×800` y `1024×768`: barra lateral (`#admin-sidebar`) visible y operativa.
   - En `768×1024` (tableta vertical): botón hamburguesa (`.rq-topbar__menu`) visible, apertura de cajón `#admin-sidebar.open` y cierre funcional.
3. **Integridad de modales:** apertura del modal `Nuevo logro` con botón de guardado visible y contenido dentro de los límites del viewport (sin recorte horizontal ni vertical).
4. **Flujos de seguridad por navegador:** redirección sin sesión, rechazo de rol `estudiante`, restricción de `/usuarios` para `admin`, acceso y logout completo para `super_admin`, y expiración automática ante `401`.

## 3. Integración continua

- En [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), el job `e2e` instala `chromium` y `firefox` para validar compatibilidad multi-motor en cada `push` y `pull_request`.
- En Windows local, `PLAYWRIGHT_EDGE=true` habilita adicionalmente el proyecto `edge` sobre el binario oficial de Microsoft Edge.

## 4. Conclusión

**27/27 pruebas de compatibilidad y autenticación aprobadas** (9 en Chromium, 9 en Firefox y 9 en Microsoft Edge) sin defectos bloqueantes.
