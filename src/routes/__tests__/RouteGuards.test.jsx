import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext, AuthProvider } from '../../context/AuthContext';
import { ProtectedRoute, PublicRoute, RoleProtectedRoute } from '../RouteGuards';
import { useAuth } from '../../hooks/useAuth';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../../services/api';

const renderWithAuth = (authValue, initialPath) =>
  render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>Pantalla Login</div>} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard Admin</div>} />
            <Route element={<RoleProtectedRoute allowedRoles={['SUPER']} />}>
              <Route path="/usuarios" element={<div>Gestión Usuarios</div>} />
            </Route>
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/reportes" element={<div>Reportes Generales</div>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('RouteGuards (autorización y permisos)', () => {
  it('redirige a /login si el usuario no está autenticado', () => {
    renderWithAuth({ user: null, loading: false }, '/dashboard');
    expect(screen.getByText('Pantalla Login')).toBeInTheDocument();
  });

  it('bloquea acceso al panel si el rol es estudiante', () => {
    renderWithAuth({ user: { id: 9, rol: 'estudiante' }, loading: false }, '/dashboard');
    expect(screen.getByText('Pantalla Login')).toBeInTheDocument();
  });

  it('permite a admin entrar a /dashboard y /reportes pero lo redirige fuera de /usuarios (solo SUPER)', () => {
    const adminAuth = { user: { id: 2, rol: 'admin' }, loading: false };
    renderWithAuth(adminAuth, '/usuarios');
    expect(screen.getByText('Dashboard Admin')).toBeInTheDocument();
    expect(screen.queryByText('Gestión Usuarios')).not.toBeInTheDocument();
  });

  it('permite a super_admin acceder tanto a rutas SUPER como ADMIN', () => {
    const superAuth = { user: { id: 1, rol: 'super_admin' }, loading: false };
    const { unmount } = renderWithAuth(superAuth, '/usuarios');
    expect(screen.getByText('Gestión Usuarios')).toBeInTheDocument();
    unmount();

    renderWithAuth(superAuth, '/reportes');
    expect(screen.getByText('Reportes Generales')).toBeInTheDocument();
  });

  it('PublicRoute redirige a /dashboard cuando ya existe sesión activa', () => {
    renderWithAuth({ user: { id: 1, rol: 'super_admin' }, loading: false }, '/login');
    expect(screen.getByText('Dashboard Admin')).toBeInTheDocument();
  });

  it('muestra indicador accesible de carga mientras valida sesión', () => {
    renderWithAuth({ user: null, loading: true }, '/dashboard');
    expect(screen.getByRole('status')).toHaveTextContent(/Cargando el panel/i);
  });
});

describe('AuthProvider (persistencia y expiración de sesión)', () => {
  const StatusProbe = () => {
    const { user, loading } = useAuth();
    if (loading) return <span>loading</span>;
    return <span>{user ? `USER:${user.rol}` : 'NO_USER'}</span>;
  };

  it('limpia sesión almacenada si el usuario guardado es estudiante', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'fake-token');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: 5, rol: 'alumno' }));

    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>
    );

    expect(screen.getByText('NO_USER')).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('cierra sesión automáticamente al recibir evento rq:session-expired', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: 1, rol: 'super_admin' }));

    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>
    );

    expect(screen.getByText('USER:super_admin')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent('rq:session-expired'));
    });

    expect(screen.getByText('NO_USER')).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
