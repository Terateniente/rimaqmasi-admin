import api from './api';

export const getResumenRetos = async (leccionId) => {
  const response = await api.get(`/admin/retos/lecciones/${leccionId}/resumen`);
  return response.data;
};

export const createReto = async (data) => {
  const response = await api.post('/admin/retos/retos', data);
  return response.data;
};

export const updateReto = async (id, data) => {
  const response = await api.put(`/admin/retos/retos/${id}`, data);
  return response.data;
};

export const deleteReto = async (id, mode = 'safe') => {
  const response = await api.delete(`/admin/retos/retos/${id}`, { params: { mode } });
  return response.data;
};

export const generateRetos = async (data) => {
  const response = await api.post('/admin/retos/generar', data);
  return response.data;
};

export const updateLessonChallengeConfig = async (leccionId, data) => {
  const response = await api.put(`/admin/retos/lecciones/${leccionId}/configuracion`, data);
  return response.data;
};

export const updateLessonGuide = async (leccionId, data) => {
  const response = await api.put(`/admin/retos/lecciones/${leccionId}/guia`, data);
  return response.data;
};
