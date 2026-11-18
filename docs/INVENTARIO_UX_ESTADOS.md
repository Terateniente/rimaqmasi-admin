# Inventario Visual y Consistencia de Estados UX — Panel Administrativo (ADM-12)

**Fecha de cierre:** 18 de noviembre de 2026  
**Alcance:** Todas las vistas públicas y administrativas de `src/pages/` y componentes base de `src/components/`.

## 1. Componentes estándar del sistema de diseño

| Estado / Patrón UX | Componente / Mecanismo unificado | Ubicación |
|---|---|---|
| **Encabezado de módulo** | `PageHeader` (acento visual, `<h1>`, descripción y zona de acciones) | [`src/components/PageKit.jsx`](../src/components/PageKit.jsx) |
| **Estado de carga (inicial y Suspense)** | `ModernPageSkeleton` (`aria-busy="true"`, `role="status"`, respeta `prefers-reduced-motion`) | [`src/components/ModernPageSkeleton.jsx`](../src/components/ModernPageSkeleton.jsx) |
| **Estado vacío (sin registros / sin resultados de búsqueda)** | `EmptyState` (ícono decorativo, título claro y sugerencia contextual) | [`src/components/PageKit.jsx`](../src/components/PageKit.jsx) |
| **Manejo de errores y retroalimentación** | Interceptor `error.userMessage` en Axios + notificaciones `toast.error` / `toast.success` / `toast.loading` (`sonner`) + `AppErrorBoundary` para fallos de renderizado | [`src/services/api.js`](../src/services/api.js), [`src/components/AppErrorBoundary.jsx`](../src/components/AppErrorBoundary.jsx) |
| **Confirmación de acciones destructivas** | `DeleteConfirmationModal` (`role="alertdialog"`, cierre con `Escape`, botón destructivo diferenciado; **0 usos** de `window.confirm` nativo) | [`src/components/DeleteConfirmationModal.jsx`](../src/components/DeleteConfirmationModal.jsx) |
| **Modales de formulario** | Estructura estándar `.rq-modal-overlay` / `.rq-modal` / `.rq-wizard-form` + `.rq-modal-body` con scroll interno + `.rq-modal-footer` fijo inferior | [`src/styles/components.css`](../src/styles/components.css) |
| **Tablas, ordenamiento y paginación** | `.rq-table-card`, `SortHeader` (`aria-sort`), `StatusSwitch` (`role="switch"`), `LevelBadge`, `Pagination` y `AuditPanel` | [`src/components/PageKit.jsx`](../src/components/PageKit.jsx) |

## 2. Inventario por módulo

| Módulo / Vista | Archivo | Carga | Vacío | Error | Confirmación destructiva | Modal / Formulario |
|---|---|---|---|---|---|---|
| **Inicio de sesión** | `Login.jsx` | Botón deshabilitado + spinner | N/A | Alerta inline + `userMessage` | N/A | Formulario centrado |
| **Recuperación de contraseña** | `PasswordRecovery.jsx` | Botón deshabilitado + estado | N/A | Alerta inline + `userMessage` | N/A | Flujo en 3 pasos |
| **Shell autenticado** | `Dashboard.jsx` | `Suspense` con `ModernPageSkeleton` | N/A | `AppErrorBoundary` | N/A | `ProfileModal` |
| **Dashboard / Analítica / Reportes / Exportaciones** | `AdminAnalytics.jsx` | `ModernPageSkeleton` | `EmptyState` / mensajes sin datos | `toast.error` + `userMessage` | N/A (solo lectura/exportación) | Filtros + descarga Excel/PDF |
| **Usuarios** | `usuarios/Usuarios.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal crear/editar/detalle |
| **Idiomas** | `academica/Idiomas.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal crear/editar |
| **Cursos** | `academica/Cursos.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal crear/editar/detalle |
| **Unidades** | `academica/Unidades.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal crear/editar/detalle |
| **Sesiones** | `academica/Sesiones.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal crear/editar/detalle |
| **Lecciones** | `academica/Lecciones.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal + editor lectura + `IconPicker` |
| **Matrículas** | `academica/Matriculas.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal asignar/editar |
| **Categorías** | `diccionario/Categorias.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal crear/editar |
| **Palabras** | `diccionario/Palabras.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal crear/editar + enlaces |
| **Detalle de palabra** | `diccionario/PalabraDetalle.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + redirección segura | N/A | Modales de traducción y audio + `ImageLightboxModal` |
| **Ejemplos** | `diccionario/Ejemplos.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal crear/editar |
| **Aportes comunitarios** | `diccionario/Contribuciones.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Revisión / aprobación / rechazo |
| **Gestión de retos** | `evaluaciones/Retos.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal dinámico por tipo de reto |
| **Logros** | `gamificacion/Logros.jsx` | `ModernPageSkeleton` | `EmptyState` | `toast.error` + `userMessage` | `DeleteConfirmationModal` | Modal `.rq-wizard-form` con footer fijo y carga `.rq-upload-card` |
| **Vidas y rachas** | `gamificacion/VidasRachas.jsx` | `ModernPageSkeleton` | Valores por defecto seguros | `toast.error` + `userMessage` | N/A (configuración global) | Formulario sincronizado horas/min + línea de tiempo |

## 3. Ajustes de cierre aplicados durante esta revisión

- **Modal de Logros (`Logros.jsx`):** reestructurado con `rq-wizard-form`, cuerpo con scroll interno (`academic-modal-scroll rq-modal-body`) y pie fijo (`rq-modal-footer`), eliminando el recorte de botones en pantallas de menor altura.
- **Unificación de mensajes de error (`VidasRachas.jsx` y `PasswordRecovery.jsx`):** priorizado `error.userMessage` del interceptor centralizado de `api.js` sobre el mensaje crudo de red.
- **Verificación de confirmaciones nativas:** comprobado `0` llamadas a `window.confirm` o `alert()` en `src/pages/**`.
