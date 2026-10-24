# RimaqMasiEDU Administración

Panel web de administración para gestionar usuarios, currículo, contenidos,
matrículas, diccionario, evaluaciones, gamificación y analítica de la plataforma
RimaqMasiEDU. Desarrollado con React, Vite y Tailwind CSS.

## Requisitos

- Node.js 20 o superior.
- API de RimaqMasiEDU disponible.

## Configuración

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` como `.env` y configura la API:

   ```env
   VITE_API_URL=http://localhost:3000/api/v1
   ```

3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

## Comandos

- `npm run dev`: inicia Vite en modo desarrollo.
- `npm run lint`: analiza el código con ESLint.
- `npm run build`: genera la aplicación en `dist/`.
- `npm run preview`: sirve localmente la compilación.
- `npm run deploy:package`: crea el paquete de despliegue.

Los archivos `.env`, las dependencias y las compilaciones son locales y no se
incluyen en Git.
