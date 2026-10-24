import api from './api';

export const getMatriculas = async (estado = '') => {
  const params = new URLSearchParams();
  if (estado) params.append('estado', estado);
  const response = await api.get(`/matriculas?${params.toString()}`);
  return response.data;
};

export const getMisCursos = async () => {
  const response = await api.get('/matriculas/mis-cursos');
  return response.data;
};

export const getMatriculaById = async (id) => {
  const response = await api.get(`/matriculas/${id}`);
  return response.data;
};

export const createMatricula = async (matriculaData) => {
  const response = await api.post('/matriculas/admin', matriculaData);
  return response.data;
};

export const updateMatricula = async (id, matriculaData) => {
  const response = await api.patch(`/matriculas/${id}`, matriculaData);
  return response.data;
};

export const deleteMatricula = async (id) => {
  const response = await api.delete(`/matriculas/${id}`);
  return response.data;
};
