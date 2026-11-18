#!/usr/bin/env node
/**
 * Smoke test productivo / pre-despliegue para el panel administrativo RimaqMasiEDU.
 *
 * Uso:
 *   npm run smoke                                    # Verifica https://admin.rimaqmasi.com + API
 *   ADMIN_URL=http://127.0.0.1:4173 npm run smoke    # Verifica build local (vite preview)
 *   STRICT_HEADERS=true npm run smoke                # Exige cabeceras de seguridad (CSP, HSTS, etc.)
 */

const ADMIN_URL = (process.env.ADMIN_URL || 'https://admin.rimaqmasi.com').replace(/\/+$/, '');
const API_URL = (process.env.API_URL || 'https://api.rimaqmasi.com').replace(/\/+$/, '');
const STRICT_HEADERS = process.env.STRICT_HEADERS === 'true';
const IS_HTTPS = ADMIN_URL.startsWith('https://');

const checks = [];

function record(name, status, detail) {
  checks.push({ name, status, detail });
  const icon = status === 'PASS' ? 'OK  ' : status === 'WARN' ? 'WARN' : 'FAIL';
  console.log(`[${icon}] ${name} — ${detail}`);
}

async function fetchSafe(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { redirect: 'follow', signal: controller.signal, ...opts });
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`\nSmoke test RimaqMasiEDU Admin`);
  console.log(`- Panel: ${ADMIN_URL}`);
  console.log(`- API:   ${API_URL}`);
  console.log(`- Modo cabeceras estrictas: ${STRICT_HEADERS ? 'sí' : 'no'}\n`);

  // 1. Raíz del panel
  let homeRes;
  let homeHtml = '';
  try {
    homeRes = await fetchSafe(`${ADMIN_URL}/`);
    homeHtml = await homeRes.text();
    const isHtml = (homeRes.headers.get('content-type') || '').includes('text/html');
    const hasRoot = homeHtml.includes('id="root"');
    if (homeRes.status === 200 && isHtml && hasRoot) {
      record('Raíz del panel (/)', 'PASS', `HTTP 200, HTML SPA con #root (${homeHtml.length} bytes)`);
    } else {
      record('Raíz del panel (/)', 'FAIL', `HTTP ${homeRes.status}, content-type=${homeRes.headers.get('content-type')}`);
    }
  } catch (err) {
    record('Raíz del panel (/)', 'FAIL', err.message);
  }

  // 2. Fallback SPA en rutas protegidas y públicas
  for (const route of ['/login', '/dashboard', '/gamificacion/logros']) {
    try {
      const res = await fetchSafe(`${ADMIN_URL}${route}`);
      const body = await res.text();
      if (res.status === 200 && body.includes('id="root"')) {
        record(`Ruta SPA (${route})`, 'PASS', 'HTTP 200 con fallback a index.html');
      } else {
        record(`Ruta SPA (${route})`, 'FAIL', `HTTP ${res.status}`);
      }
    } catch (err) {
      record(`Ruta SPA (${route})`, 'FAIL', err.message);
    }
  }

  // 3. Asset principal del bundle accesible
  const scriptMatch = homeHtml.match(/<script[^>]+src="([^"]+)"/i);
  if (scriptMatch) {
    const assetPath = scriptMatch[1].startsWith('http')
      ? scriptMatch[1]
      : `${ADMIN_URL}${scriptMatch[1].startsWith('/') ? '' : '/'}${scriptMatch[1]}`;
    try {
      const res = await fetchSafe(assetPath);
      const cacheControl = res.headers.get('cache-control') || 'sin Cache-Control';
      if (res.status === 200) {
        record('Bundle JS principal', 'PASS', `${scriptMatch[1]} -> HTTP 200 (${cacheControl})`);
      } else {
        record('Bundle JS principal', 'FAIL', `${scriptMatch[1]} -> HTTP ${res.status}`);
      }
    } catch (err) {
      record('Bundle JS principal', 'FAIL', err.message);
    }
  } else {
    record('Bundle JS principal', 'FAIL', 'No se encontró etiqueta <script src="..."> en index.html');
  }

  // 4. Bloqueo de archivos ocultos sensibles (.env)
  try {
    const envRes = await fetchSafe(`${ADMIN_URL}/.env`);
    const envText = await envRes.text();
    const looksExposed = envRes.status === 200 && /VITE_|JWT_|DB_|SECRET/i.test(envText);
    if (!looksExposed && (envRes.status === 403 || envRes.status === 404 || envText.includes('id="root"'))) {
      record('Protección de /.env', 'PASS', `No expuesto (HTTP ${envRes.status})`);
    } else {
      record('Protección de /.env', 'FAIL', `Posible exposición de /.env (HTTP ${envRes.status})`);
    }
  } catch (err) {
    record('Protección de /.env', 'WARN', err.message);
  }

  // 5. Cabeceras de seguridad HTTP (en HTTPS / hosting productivo)
  if (homeRes && IS_HTTPS) {
    const requiredHeaders = [
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy',
      'permissions-policy',
      'strict-transport-security',
    ];
    for (const h of requiredHeaders) {
      const val = homeRes.headers.get(h);
      if (val) {
        record(`Cabecera ${h}`, 'PASS', val.slice(0, 90));
      } else {
        record(
          `Cabecera ${h}`,
          STRICT_HEADERS ? 'FAIL' : 'WARN',
          'Ausente en servidor remoto (requiere subir el public/.htaccess actualizado)'
        );
      }
    }
  }

  // 6. Conectividad con API de producción
  try {
    const healthRes = await fetchSafe(`${API_URL}/health`);
    if (healthRes.status === 200) {
      record('API /health', 'PASS', 'HTTP 200 operativo');
    } else {
      record('API /health', 'FAIL', `HTTP ${healthRes.status}`);
    }
  } catch (err) {
    record('API /health', 'FAIL', err.message);
  }

  const failed = checks.filter((c) => c.status === 'FAIL');
  const warned = checks.filter((c) => c.status === 'WARN');
  console.log(`\nResumen: ${checks.length - failed.length - warned.length} PASS · ${warned.length} WARN · ${failed.length} FAIL`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
