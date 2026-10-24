import api from './api';

// --- PREGUNTAS ---

export const getPreguntasByLeccion = async (leccionId) => {
  const response = await api.get(`/lecciones/${leccionId}/preguntas`);
  return response.data;
};

export const getPreguntaById = async (id) => {
  const response = await api.get(`/preguntas/${id}`);
  return response.data;
};

export const createPregunta = async (formData) => {
  const response = await api.post('/preguntas', formData);
  return response.data;
};

export const updatePregunta = async (id, data) => {
  const response = await api.put(`/preguntas/${id}`, data);
  return response.data;
};

export const deletePregunta = async (id) => {
  const response = await api.delete(`/preguntas/${id}`);
  return response.data;
};

export const updatePreguntaAudio = async (id, formData) => {
  const response = await api.put(`/preguntas/${id}/audio`, formData);
  return response.data;
};

// --- OPCIONES ---

export const createOpcion = async (preguntaId, data) => {
  const response = await api.post(`/preguntas/${preguntaId}/opciones`, data);
  return response.data;
};

export const updateOpcion = async (id, data) => {
  const response = await api.put(`/opciones/${id}`, data);
  return response.data;
};

export const deleteOpcion = async (id) => {
  const response = await api.delete(`/opciones/${id}`);
  return response.data;
};
