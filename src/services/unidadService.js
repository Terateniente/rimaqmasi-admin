import api from './api';

export const getUnidads = async () => {
  const response = await api.get('/unidades');
  return response.data;
};

export const getUnidadById = async (id) => {
  const response = await api.get(`/unidades/${id}`);
  return response.data;
};

export const createUnidad = async (data) => {
  const response = await api.post('/unidades', data);
  return response.data;
};

export const updateUnidad = async (id, data) => {
  const response = await api.put(`/unidades/${id}`, data);
  return response.data;
};

export const deleteUnidad = async (id) => {
  const response = await api.delete(`/unidades/${id}`);
  return response.data;
};

export const getUnidadsByCurso = async (cursoId) => {
  const response = await api.get(`/unidades/curso/${cursoId}`);
  return response.data;
};

export const toggleEstadoUnidad = async (id, data) => {
  const response = await api.patch(`/unidades/${id}/estado`, data);
  return response.data;
};

export const uploadUnidadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post('/upload/image', formData);
  return response.data;
};
