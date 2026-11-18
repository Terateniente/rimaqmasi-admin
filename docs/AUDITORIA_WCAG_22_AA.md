# Auditoría de Accesibilidad WCAG 2.2 AA — Panel Administrativo (ADM-05)

**Fecha de auditoría:** 18 de noviembre de 2026  
**Estándar evaluado:** WCAG 2.0 A/AA, WCAG 2.1 A/AA y WCAG 2.2 AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`)  
**Herramientas:** `@axe-core/playwright` (`axe-core 4.14`), Playwright (Chromium), validación de teclado, foco visible y contraste en modo oscuro y modo claro.  
**Suite automatizada:** [`e2e/accessibility.spec.js`](../e2e/accessibility.spec.js) (`npm run test:e2e:a11y`).

## 1. Cobertura auditada (19 pruebas automatizadas)

| Categoría | Rutas / Componentes auditados | Resultado Axe WCAG 2.2 AA |
|---|---|---|
| **Vistas públicas** | `/login`, `/recuperar-contrasena` | **0 infracciones** |
| **Analítica y reportes** | `/dashboard`, `/reportes/exportaciones` | **0 infracciones** |
| **Usuarios** | `/usuarios` | **0 infracciones** |
| **Gestión académica** | `/academica/idiomas`, `/academica/cursos`, `/academica/unidads`, `/academica/sesiones`, `/academica/lecciones`, `/academica/matriculas` | **0 infracciones** |
| **Diccionario** | `/diccionario/categorias`, `/diccionario/palabras`, `/diccionario/aportes` | **0 infracciones** |
| **Evaluaciones y gamificación** | `/evaluaciones/retos`, `/gamificacion/logros`, `/gamificacion/rachas` | **0 infracciones** |
| **Modales y diálogos críticos** | Modal de creación/edición en `Logros` (`role="dialog"`), `DeleteConfirmationModal` (`role="alertdialog"`) | **0 infracciones** |
| **Tema alternativo** | Modo claro (`rq_admin_theme=light`) en `/dashboard` y `/gamificacion/logros` | **0 infracciones** |

## 2. Hallazgos detectados y corregidos

Durante la auditoría automática con Axe-core y la revisión de estructura semántica se identificaron y corrigieron los siguientes defectos reales:

1. **Idioma del documento (`WCAG 3.1.1`):** [`index.html`](../index.html) declaraba `<html lang="en">` en una aplicación íntegramente en español. **Corrección:** cambiado a `<html lang="es">`.
2. **Contraste de botón de exportación a Excel (`WCAG 1.4.3`):** `.analytics-export--excel` en [`src/pages/analytics.css`](../src/pages/analytics.css) tenía `#FFFFFF` sobre `#16a34a` (ratio `3.29:1`, inferior al mínimo `4.5:1`). **Corrección:** ajustado a `#15803d` (ratio `5.14:1`, hover `#166534`).
3. **Coincidencia de nombre accesible con etiqueta visible (`WCAG 2.5.3`):** `.sidebar-brand` y `.sidebar-profile` en [`src/components/Sidebar.jsx`](../src/components/Sidebar.jsx) sobreescribían el texto visible con un `aria-label` distinto. **Corrección:** uso de `aria-label` solo en estado colapsado, `title` descriptivo y `aria-hidden="true"` en el avatar decorativo `.sidebar-avatar`.
4. **Atributo ARIA prohibido en elemento genérico (`WCAG 4.1.2`):** `<span class="rq-lang-pair__arrow" aria-label="hacia">` en [`src/pages/academica/Cursos.jsx`](../src/pages/academica/Cursos.jsx) carecía de rol semántico. **Corrección:** añadido `role="img"` en el contenedor y `aria-hidden="true"` en el ícono interno.

## 3. Controles de teclado, lector de pantalla y preferencias del usuario

- **Enlace de salto:** `<a class="rq-skip-link" href="#admin-main-content">Saltar al contenido</a>` presente en [`src/pages/Dashboard.jsx`](../src/pages/Dashboard.jsx).
- **Teclado y cierre con `Escape`:** menús móviles, `DeleteConfirmationModal` y modales del panel cierran con `Escape` y permiten navegación secuencial con `Tab` hacia elementos enfocables con contorno visible (`:focus-visible`).
- **Preferencias del sistema operativo:** reglas CSS activas en [`src/styles/responsive.css`](../src/styles/responsive.css) e [`src/index.css`](../src/index.css) para `prefers-reduced-motion`, `prefers-reduced-transparency` y `prefers-contrast: more` (bordes reforzados de `1.5px` en tablas, inputs, selects y barra lateral).
- **Regiones vivas:** estados de carga (`ModernPageSkeleton`) y notificaciones (`sonner`) anuncian cambios de estado sin secuestrar el foco del usuario.

## 4. Conclusión

El panel administrativo cumple **WCAG 2.2 AA sin infracciones críticas ni serias** en las 19 comprobaciones automatizadas integradas en CI (`npm run test:e2e`).
