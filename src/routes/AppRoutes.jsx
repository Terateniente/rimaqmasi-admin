import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute, RoleProtectedRoute } from './RouteGuards';

const page = (loader, exportName) => lazy(() => loader().then((module) => ({ default: module[exportName] })));
const Login = page(() => import('../pages/Login'), 'Login');
const Dashboard = page(() => import('../pages/Dashboard'), 'Dashboard');
const AdminAnalytics = page(() => import('../pages/AdminAnalytics'), 'AdminAnalytics');
const Idiomas = page(() => import('../pages/academica/Idiomas'), 'Idiomas');
const Cursos = page(() => import('../pages/academica/Cursos'), 'Cursos');
const Unidades = page(() => import('../pages/academica/Unidades'), 'Unidades');
const Sesiones = page(() => import('../pages/academica/Sesiones'), 'Sesiones');
const Lecciones = page(() => import('../pages/academica/Lecciones'), 'Lecciones');
const Matriculas = page(() => import('../pages/academica/Matriculas'), 'Matriculas');
const SeedQuechua = page(() => import('../pages/academica/SeedQuechua'), 'SeedQuechua');
const Logros = page(() => import('../pages/gamificacion/Logros'), 'Logros');
const VidasRachas = page(() => import('../pages/gamificacion/VidasRachas'), 'VidasRachas');
const Palabras = page(() => import('../pages/diccionario/Palabras'), 'Palabras');
const PalabraDetalle = page(() => import('../pages/diccionario/PalabraDetalle'), 'PalabraDetalle');
const Ejemplos = page(() => import('../pages/diccionario/Ejemplos'), 'Ejemplos');
const Categorias = page(() => import('../pages/diccionario/Categorias'), 'Categorias');
const Contribuciones = page(() => import('../pages/diccionario/Contribuciones'), 'Contribuciones');
const Usuarios = page(() => import('../pages/usuarios/Usuarios'), 'Usuarios');
const Retos = page(() => import('../pages/evaluaciones/Retos'), 'Retos');
const PasswordRecovery = page(() => import('../pages/PasswordRecovery'), 'PasswordRecovery');

import { ModernPageSkeleton } from '../components/ModernPageSkeleton';

const RouteLoading = () => (
  <div style={{ padding: '24px 32px', width: '100%', boxSizing: 'border-box' }} role="status" aria-live="polite">
    <ModernPageSkeleton cards={4} />
  </div>
);

export const AppRoutes = () => {
  return (
    <Router>
      <Suspense fallback={<RouteLoading />}>
      <Routes>
        {/* Rutas Públicas */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-contrasena" element={<PasswordRecovery step="request" />} />
          <Route path="/recuperar-contrasena/codigo" element={<PasswordRecovery step="code" />} />
          <Route path="/recuperar-contrasena/nueva" element={<PasswordRecovery step="reset" />} />
        </Route>

        <Route path="/academica/seed-quechua" element={<SeedQuechua />} />

        {/* Rutas Privadas (Layout Dashboard) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Dashboard />}>
            {/* Redirección por defecto del dashboard al home o placeholder */}
            <Route path="/dashboard" element={<AdminAnalytics view="overview" />} />
            <Route path="/dashboard/estadisticas" element={<AdminAnalytics view="statistics" />} />
            
            {/* Rutas restringidas a Super Admin */}
            <Route element={<RoleProtectedRoute allowedRoles={['SUPER']} />}>
              <Route path="/dashboard/actividad" element={<AdminAnalytics view="activity" />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="gamificacion/rachas" element={<VidasRachas />} />
            </Route>

            {/* Reportes: disponibles para Admin y Super Admin */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/dashboard/exports" element={<AdminAnalytics view="exports" />} />
              <Route path="reportes/usuarios" element={<AdminAnalytics view="users" />} />
              <Route path="reportes/cursos" element={<AdminAnalytics view="courses" />} />
              <Route path="reportes/aprendizaje" element={<AdminAnalytics view="learning" />} />
              <Route path="reportes/matriculas" element={<AdminAnalytics view="enrollments" />} />
              <Route path="reportes/diccionario" element={<AdminAnalytics view="dictionary" />} />
              <Route path="reportes/exportaciones" element={<AdminAnalytics view="exports" />} />
            </Route>
            
            {/* Sub-Módulos Gestión Académica */}
            <Route path="/academica/idiomas" element={<Idiomas />} />
            <Route path="/academica/cursos" element={<Cursos />} />
            <Route path="/academica/unidads" element={<Unidades />} />
            <Route path="/academica/sesiones" element={<Sesiones />} />
            <Route path="/academica/lecciones" element={<Lecciones />} />
            <Route path="/academica/matriculas" element={<Matriculas />} />

            {/* Evaluaciones */}
            <Route path="/evaluaciones/retos" element={<Retos />} />
            <Route path="/evaluaciones/preguntas" element={<Navigate to="/evaluaciones/retos" replace />} />

            {/* Rutas Gamificación */}
            <Route path="gamificacion/logros" element={<Logros />} />

            {/* Rutas Diccionario */}
            <Route path="diccionario/categorias" element={<Categorias />} />
            <Route path="diccionario/palabras" element={<Palabras />} />
            <Route path="diccionario/palabras/:id" element={<PalabraDetalle />} />
            <Route path="diccionario/aportes" element={<Contribuciones />} />
            <Route path="diccionario/ejemplos" element={<Ejemplos />} />

            {/* Rutas no implementadas (Muestra el Placeholder) */}
            <Route path="/*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </Router>
  );
};
