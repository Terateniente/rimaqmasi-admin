import api, { getClientDeviceMeta, getStoredRefreshToken } from './api';

export const login = async (correo, contrasena) => {
  const response = await api.post('/auth/login', {
    correo,
    contrasena,
    ...getClientDeviceMeta(),
  });
  return response.data;
};

export const refreshSession = async (refreshToken = getStoredRefreshToken()) => {
  const response = await api.post('/auth/refresh', {
    refresh_token: refreshToken,
    ...getClientDeviceMeta(),
  });
  return response.data;
};

export const logout = async (refreshToken = getStoredRefreshToken()) => {
  if (!refreshToken) return;
  try {
    await api.post('/auth/logout', { refresh_token: refreshToken });
  } catch {
    // El cierre local siempre se completa aunque la sesión ya hubiera expirado
  }
};

export const logoutAllSessions = async () => {
  const response = await api.post('/auth/logout-all');
  return response.data;
};

export const getActiveSessions = async () => {
  const response = await api.get('/auth/sessions');
  return response.data?.data || [];
};

export const revokeSession = async (sesionId) => {
  const response = await api.delete(`/auth/sessions/${sesionId}`);
  return response.data;
};

export const requestPasswordReset = async (correo) => {
  const response = await api.post('/auth/password/forgot', { correo });
  return response.data;
};

export const verifyPasswordResetCode = async (correo, codigo) => {
  const response = await api.post('/auth/password/verify', { correo, codigo });
  return response.data;
};

export const resetPassword = async ({
  correo,
  resetToken,
  nuevaContrasena,
  confirmarContrasena,
}) => {
  const response = await api.post('/auth/password/reset', {
    correo,
    reset_token: resetToken,
    nueva_contrasena: nuevaContrasena,
    confirmar_contrasena: confirmarContrasena,
  });
  return response.data;
};
