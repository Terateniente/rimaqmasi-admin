import api from './api';

export const getSesiones = async () => {
  const response = await api.get('/sesiones');
  return response.data;
};

export const getSesionesByUnidad = async (unidadId) => {
  const response = await api.get(`/sesiones/unidad/${unidadId}`);
  return response.data;
};

export const getSesionById = async (id) => {
  const response = await api.get(`/sesiones/${id}`);
  return response.data;
};

export const createSesion = async (data) => {
  const response = await api.post('/sesiones', data);
  return response.data;
};

export const updateSesion = async (id, data) => {
  const response = await api.put(`/sesiones/${id}`, data);
  return response.data;
};

export const deleteSesion = async (id) => {
  const response = await api.delete(`/sesiones/${id}`);
  return response.data;
};

export const toggleEstadoSesion = async (id, data) => {
  const response = await api.patch(`/sesiones/${id}/estado`, data);
  return response.data;
};

export const uploadSesionImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  const response = await api.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};
