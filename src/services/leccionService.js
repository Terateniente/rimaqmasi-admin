import api from './api';

export const getLecciones = async () => {
  const response = await api.get('/lecciones');
  return response.data;
};

export const getLeccionesBySesion = async (sesionId) => {
  const response = await api.get(`/lecciones/sesion/${sesionId}`);
  return response.data;
};

export const getLeccionById = async (id) => {
  const response = await api.get(`/lecciones/${id}`);
  return response.data;
};

export const createLeccion = async (data) => {
  const response = await api.post('/lecciones', data);
  return response.data;
};

export const updateLeccion = async (id, data) => {
  const response = await api.put(`/lecciones/${id}`, data);
  return response.data;
};

export const deleteLeccion = async (id) => {
  const response = await api.delete(`/lecciones/${id}`);
  return response.data;
};

export const toggleEstadoLeccion = async (id, data) => {
  const response = await api.patch(`/lecciones/${id}/estado`, data);
  return response.data;
};

export const uploadAudioLeccion = async (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/lecciones/${id}/lectura-audio`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const uploadDocumentoLeccion = async (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/lecciones/${id}/documento-extra`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
