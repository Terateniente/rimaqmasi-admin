import api from './api';

export const login = async (correo, contrasena) => {
  const response = await api.post('/auth/login', { correo, contrasena });
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
