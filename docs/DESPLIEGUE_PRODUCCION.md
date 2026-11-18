# Configuración de Producción, Cabeceras y Smoke Test — Panel Administrativo (ADM-09)

**Dominio productivo:** `https://admin.rimaqmasi.com`  
**API productiva:** `https://api.rimaqmasi.com/api/v1`  
**Servidor web detectado:** LiteSpeed (compatible con `.htaccess` de Apache).

## 1. Endurecimiento de hosting (`public/.htaccess`)

El archivo [`public/.htaccess`](../public/.htaccess) se copia automáticamente a `dist/.htaccess` durante `npm run build` e incluye:

- **Redirección forzada a HTTPS** (`301`) para `admin.rimaqmasi.com`.
- **Deshabilitación de listado de directorios** (`Options -MultiViews -Indexes`).
- **Bloqueo de archivos ocultos sensibles** (`/.env`, `/.git`, etc., devolviendo `403`, preservando `/.well-known`).
- **Enrutamiento SPA (React Router):** todas las rutas protegidas y profundas (`/login`, `/dashboard`, `/gamificacion/logros`, etc.) conservan archivos reales y resuelven a `/index.html`.
- **Cabeceras de seguridad HTTP:**
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Content-Security-Policy`: restringida a `'self'`, `https://api.rimaqmasi.com`, `https://api.iconify.design`, `https://translate.googleapis.com`, `data:` y `blob:` (sin `object-src` ni `frame-ancestors` externos).
- **Compresión y caché:**
  - `mod_deflate` para HTML, CSS, JS, JSON y SVG.
  - `/assets/*` (hashes inmutables de Vite): `Cache-Control: public, max-age=31536000, immutable`.
  - Recursos estáticos (`webp`, `jpg`, `png`, `svg`, `ico`, `woff2`): `Cache-Control: public, max-age=2592000`.
  - `*.html`: `Cache-Control: no-cache, no-store, must-revalidate`.

## 2. Empaquetado y despliegue reproducible

```powershell
# Genera dist/, valida .htaccess + cabeceras + URL del API y crea ../deploy/admin-rimaqmasi.zip
npm run deploy:package
```

Script: [`scripts/build-deploy.ps1`](../scripts/build-deploy.ps1).

## 3. Smoke test post-despliegue

```powershell
# Verificación estándar contra https://admin.rimaqmasi.com y https://api.rimaqmasi.com/health
npm run smoke

# Verificación estricta (exige las 6 cabeceras de seguridad activas en el servidor remoto)
$env:STRICT_HEADERS='true'; npm run smoke

# Verificación previa contra un build local (vite preview)
$env:ADMIN_URL='http://127.0.0.1:4173'; npm run smoke
```

Script: [`scripts/smoke-test.mjs`](../scripts/smoke-test.mjs).

## 4. Resultado de ejecución en producción (18/11/2026)

| Comprobación | Estado actual en `https://admin.rimaqmasi.com` | Observación |
|---|---|---|
| Raíz `/` (HTTPS 200 + `#root`) | **PASS** | Operativo (`HTTP 200`) |
| Rutas SPA (`/login`, `/dashboard`, `/gamificacion/logros`) | **PASS** | Fallback a `index.html` funcional (`HTTP 200`) |
| Bundle JS principal | **PASS** | Accesible (`HTTP 200`) |
| Bloqueo de `/.env` | **PASS** | Protegido (`HTTP 403`) |
| Conectividad `https://api.rimaqmasi.com/health` | **PASS** | Operativo (`HTTP 200`) |
| Cabeceras HTTP (`CSP`, `HSTS`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) y `Cache-Control` | **WARN (pendiente de subir ZIP)** | Ya configuradas y validadas en `public/.htaccess` y `dist/.htaccess`; se activarán al subir el nuevo paquete `deploy/admin-rimaqmasi.zip` al hosting LiteSpeed. |
