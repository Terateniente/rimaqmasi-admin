<div align="center">
  <img src="public/RimaqMasi%20EDU.svg" alt="RimaqMasiEDU" width="360" />

  # RimaqMasiEDU Administración

  **Todo el ecosistema educativo en un solo panel.**

  Aplicación web para gestionar usuarios, currículo, diccionario, evaluaciones,
  gamificación y analítica de RimaqMasiEDU.

  ![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)
  ![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
  ![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?logo=axios&logoColor=white)
  ![Responsive](https://img.shields.io/badge/diseño-responsive-8F1D2C)
</div>

---

## Funcionalidades

### Gestión académica

- Idiomas, cursos y matrículas.
- Unidades, sesiones y lecciones.
- Publicación y ordenamiento del contenido educativo.
- Carga de imágenes, audios y recursos visuales.

### Diccionario

- Palabras, traducciones, definiciones y ejemplos.
- Categorías gramaticales y recursos multimedia.
- Revisión de contribuciones realizadas por estudiantes.
- Exportación de contenido en PDF.

### Evaluación y gamificación

- Retos, preguntas y alternativas.
- Logros, recompensas, vidas y rachas.
- Configuración de experiencia y criterios de desbloqueo.

### Usuarios y analítica

- Gestión de estudiantes y administradores.
- Control de estados y roles.
- Indicadores de actividad y participación.
- Gráficos, reportes y exportación de datos.

## Tecnologías

- React 19 y React Router.
- Vite 8.
- Axios para comunicación con la API.
- React Hook Form para formularios.
- Recharts para visualización de métricas.
- jsPDF, AutoTable y XLSX para exportaciones.
- Radix UI, Lucide React y Sonner.

## Inicio rápido

### Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- API de RimaqMasiEDU en ejecución.

### Instalación

```bash
git clone https://github.com/Terateniente/rimaqmasi-admin.git
cd rimaqmasi-admin
npm install
cp .env.example .env
npm run dev
```

La aplicación estará disponible en la dirección indicada por Vite,
normalmente `http://localhost:5173`.

## Configuración

```env
VITE_API_URL=http://localhost:3000/api/v1
```

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | Dirección base de la API de RimaqMasiEDU |

Usa `.env.example` para desarrollo o `.env.production.example` como referencia
de producción. Los archivos con credenciales reales no se incluyen en Git.

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el entorno de desarrollo |
| `npm run lint` | Revisa el código con ESLint |
| `npm run build` | Genera la aplicación optimizada en `dist/` |
| `npm run preview` | Previsualiza la compilación |
| `npm run deploy:package` | Crea el paquete limpio de despliegue |

## Estructura principal

```text
frontend - Admi/
├── public/              # Logos, iconos y recursos del diccionario
├── scripts/             # Automatización de despliegue
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── context/         # Sesión y autenticación
│   ├── hooks/           # Hooks compartidos
│   ├── pages/           # Módulos administrativos
│   ├── routes/          # Rutas y protección por rol
│   ├── services/        # Comunicación con la API
│   ├── styles/          # Sistema visual y diseño adaptable
│   └── utils/           # Exportaciones y utilidades
└── vite.config.js
```

## Validación

Antes de publicar una modificación:

```bash
npm run lint
npm run build
```

## Despliegue

```powershell
npm run deploy:package
```

El script genera una compilación de producción preparada para un servidor web
estático. `public/.htaccess` permite conservar las rutas internas en Apache o
cPanel.

---

<div align="center">
  Panel de gestión del proyecto académico <strong>RimaqMasiEDU</strong>.
</div>
