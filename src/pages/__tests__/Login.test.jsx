import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Login } from '../Login';

vi.mock('../../services/authService', () => ({
  login: vi.fn(),
  logout: vi.fn(),
}));

import { login as loginApi, logout as logoutApi } from '../../services/authService';

const renderLogin = (loginAuth = vi.fn()) =>
  render(
    <AuthContext.Provider value={{ user: null, loading: false, loginAuth, logoutAuth: vi.fn() }}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div>Dashboard Principal</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('Login page (formulario y validación de acceso)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valida campos obligatorios antes de invocar la API', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /Ingresar al sistema/i }));

    expect(await screen.findByText('El correo es requerido')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument();
    expect(loginApi).not.toHaveBeenCalled();
  });

  it('rechaza inicio de sesión de un rol estudiante y revoca su refresh token', async () => {
    const user = userEvent.setup();
    const loginAuth = vi.fn();
    loginApi.mockResolvedValueOnce({
      success: true,
      token: 'tok-student',
      refresh_token: 'ref-student',
      usuario: { id: 8, correo: 'alumno@unamba.edu.pe', rol: 'estudiante' },
    });

    renderLogin(loginAuth);

    await user.type(screen.getByLabelText(/Usuario o correo/i), 'alumno@unamba.edu.pe');
    await user.type(screen.getByLabelText('Contraseña'), 'Clave123!');
    await user.click(screen.getByRole('button', { name: /Ingresar al sistema/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Acceso denegado/i);
    expect(loginAuth).not.toHaveBeenCalled();
    expect(logoutApi).toHaveBeenCalledWith('ref-student');
  });

  it('inicia sesión exitosamente para super_admin y navega al dashboard', async () => {
    const user = userEvent.setup();
    const loginAuth = vi.fn();
    loginApi.mockResolvedValueOnce({
      success: true,
      token: 'tok-admin',
      refresh_token: 'ref-admin',
      usuario: { id: 1, correo: 'admin@rimaqmasi.com', rol: 'super_admin' },
    });

    renderLogin(loginAuth);

    await user.type(screen.getByLabelText(/Usuario o correo/i), 'admin@rimaqmasi.com');
    await user.type(screen.getByLabelText('Contraseña'), 'RimaqMasi2026!');
    await user.click(screen.getByRole('button', { name: /Ingresar al sistema/i }));

    await waitFor(() => {
      expect(loginAuth).toHaveBeenCalledWith(
        { id: 1, correo: 'admin@rimaqmasi.com', rol: 'super_admin' },
        'tok-admin',
        'ref-admin'
      );
    });
    expect(await screen.findByText('Dashboard Principal')).toBeInTheDocument();
  });

  it('muestra error amigable cuando falla la autenticación (401)', async () => {
    const user = userEvent.setup();
    loginApi.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Credenciales incorrectas' } },
    });

    renderLogin();

    await user.type(screen.getByLabelText(/Usuario o correo/i), 'admin@rimaqmasi.com');
    await user.type(screen.getByLabelText('Contraseña'), 'WrongPass');
    await user.click(screen.getByRole('button', { name: /Ingresar al sistema/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas');
  });
});
