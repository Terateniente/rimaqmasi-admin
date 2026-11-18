# Guía de contribución

Gracias por aportar al panel de administración de **RimaqMasiEDU**. Esta guía establece los requisitos de entorno, flujo de trabajo, estándares de calidad y políticas de publicación del repositorio.

## Requisitos de entorno

- **Node.js:** `>= 20.19.0` (versión recomendada: **Node 22 LTS**, fijada en [`.nvmrc`](.nvmrc) y en `engines.node` de [`package.json`](package.json)).
- **npm:** `>= 10.x`.
- Instala las dependencias de forma reproducible con `npm ci`.

## Propietarios

El mantenimiento, revisión de código y aprobación de cambios hacia la rama principal están a cargo de los propietarios definidos en [`.github/CODEOWNERS`](.github/CODEOWNERS).

## Flujo de trabajo

1. Crea una rama descriptiva desde la rama base: `feat/...`, `fix/...`, `docs/...`, `test/...` o `chore/...`.
2. Realiza commits pequeños siguiendo [Conventional Commits](https://www.conventionalcommits.org/es/) en español (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`).
3. Antes de abrir un pull request, verifica localmente la batería completa de calidad:

   ```bash
   npm run lint
   npm test
   npm run test:e2e
   npm run build
   npm audit --omit=dev --audit-level=high
   ```

4. Abre el pull request describiendo qué cambia, por qué se realiza y cómo se verificó. Incluye capturas de pantalla ante cambios visuales o de experiencia de usuario.

## Criterios de aceptación

- **CI en verde:** lint sin errores, pruebas unitarias/componentes (Vitest), pruebas E2E/accesibilidad/compatibilidad (Playwright), compilación de producción (`vite build`) y auditoría sin vulnerabilidades altas/críticas en dependencias de producción.
- **Accesibilidad (WCAG 2.2 AA):** cero infracciones bloqueantes en `e2e/accessibility.spec.js`, navegación completa por teclado, foco visible y soporte para `prefers-reduced-motion` y `prefers-contrast`.
- **Compatibilidad:** sin desbordamiento horizontal ni controles inaccesibles en escritorios (`1440x900`, `1280x800`) y tabletas (`1024x768`, `820x1180`) en Chromium, Edge y Firefox.
- **Consistencia UX:** respetar los componentes compartidos (`PageKit`, `ModernPageSkeleton`, `EmptyState`, `DeleteConfirmationModal`, `ConfirmDialog`) y los mensajes amigables (`error.userMessage`) documentados en [`docs/INVENTARIO_UX_ESTADOS.md`](docs/INVENTARIO_UX_ESTADOS.md).
- **Seguridad:** nunca subir credenciales, tokens ni archivos `.env` locales con secretos; verificar que los permisos por rol (`administrador`, `editor`, `consultor`) se validen en rutas y acciones.

## Versionado

El proyecto adopta [Versionado Semántico](https://semver.org/lang/es/) (`MAYOR.MENOR.PARCHE`):

- **MAYOR:** cambios incompatibles de rutas, contrato de API o arquitectura del panel.
- **MENOR:** nuevos módulos administrativos, reportes o funcionalidades retrocompatibles.
- **PARCHE:** correcciones de errores, accesibilidad, rendimiento o documentación.

## Licencia

Al contribuir aceptas que tu aporte se rige por la [licencia del proyecto](LICENSE).
