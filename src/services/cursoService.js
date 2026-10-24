import api from './api';

export const getCursos = async () => {
  const response = await api.get('/cursos');
  return response.data;
};

export const getCursoById = async (id) => {
  const response = await api.get(`/cursos/${id}`);
  return response.data;
};

export const createCurso = async (data) => {
  const response = await api.post('/cursos', data);
  return response.data;
};

export const updateCurso = async (id, data) => {
  const response = await api.put(`/cursos/${id}`, data);
  return response.data;
};

export const deleteCurso = async (id) => {
  const response = await api.delete(`/cursos/${id}`);
  return response.data;
};

export const toggleEstadoCurso = async (id, data) => {
  const response = await api.patch(`/cursos/${id}/estado`, data);
  return response.data;
};

export const uploadPortadaCurso = async (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/cursos/${id}/portada`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
