import api from './api';

export const getIdiomas = async () => {
  const response = await api.get('/idiomas');
  return response.data;
};

export const createIdioma = async (data) => {
  const response = await api.post('/idiomas', data);
  return response.data;
};

export const getIdiomaById = async (id) => {
  const response = await api.get(`/idiomas/${id}`);
  return response.data;
};

export const updateIdioma = async (id, data) => {
  const response = await api.put(`/idiomas/${id}`, data);
  return response.data;
};

export const deleteIdioma = async (id) => {
  const response = await api.delete(`/idiomas/${id}`);
  return response.data;
};

export const uploadFlag = async (file) => {
  const formData = new FormData();
  formData.append('flag', file);
  
  const response = await api.post('/upload/flag', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
