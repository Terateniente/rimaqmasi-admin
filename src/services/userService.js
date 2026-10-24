import api from './api';

export const getUsuarios = async () => {
  const response = await api.get('/usuarios');
  return response.data;
};

export const buscarUsuarios = async (q) => {
  const response = await api.get('/usuarios/buscar', { params: { q } });
  return response.data;
};

export const getUsuarioById = async (id) => {
  const response = await api.get(`/usuarios/${id}`);
  return response.data;
};

export const createUsuario = async (data) => {
  const response = await api.post('/usuarios', data);
  return response.data;
};

export const updateUsuarioPerfil = async (id, data) => {
  const response = await api.put(`/usuarios/${id}/perfil`, data);
  return response.data;
};

export const updateUsuarioFoto = async (id, file) => {
  const formData = new FormData();
  formData.append('foto', file);
  
  const response = await api.put(`/usuarios/${id}/foto`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateUsuarioContrasena = async (id, data) => {
  const response = await api.put(`/usuarios/${id}/contrasena`, data);
  return response.data;
};

export const deleteUsuario = async (id) => {
  const response = await api.delete(`/usuarios/${id}`);
  return response.data;
};

export const cambiarEstadoUsuario = async (id, estado) => {
  const response = await api.put(`/usuarios/${id}/estado`, { estado });
  return response.data;
};
