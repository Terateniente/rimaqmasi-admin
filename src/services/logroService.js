import api from './api';

const basePath = '/logros';

export const getLogros = async () => {
  const response = await api.get(basePath);
  return response.data;
};

export const getLogroById = async (id) => {
  const response = await api.get(`${basePath}/${id}`);
  return response.data;
};

export const createLogro = async (logroData) => {
  // If logroData has an 'imagen' File object, we need to send it as FormData
  if (logroData.imagen instanceof File) {
    const formData = new FormData();
    formData.append('titulo', logroData.titulo);
    formData.append('descripcion', logroData.descripcion);
    formData.append('metrica_requerida', logroData.metrica_requerida);
    formData.append('valor_requerido', logroData.valor_requerido);
    
    if (logroData.xp_recompensa !== undefined) {
      formData.append('xp_recompensa', logroData.xp_recompensa);
    }
    
    formData.append('imagen', logroData.imagen);

    const response = await api.post(basePath, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } else {
    // Regular JSON request if no image is uploaded
    const response = await api.post(basePath, logroData);
    return response.data;
  }
};

export const updateLogro = async (id, logroData) => {
  if (logroData.imagen instanceof File) {
    const formData = new FormData();
    if (logroData.titulo) formData.append('titulo', logroData.titulo);
    if (logroData.descripcion) formData.append('descripcion', logroData.descripcion);
    if (logroData.metrica_requerida) formData.append('metrica_requerida', logroData.metrica_requerida);
    if (logroData.valor_requerido) formData.append('valor_requerido', logroData.valor_requerido);
    if (logroData.xp_recompensa !== undefined) formData.append('xp_recompensa', logroData.xp_recompensa);
    
    formData.append('imagen', logroData.imagen);

    const response = await api.put(`${basePath}/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } else {
    // If we are not changing the image, just send a JSON request
    const dataToSend = { ...logroData };
    delete dataToSend.imagen; // remove if it's undefined or string
    
    const response = await api.put(`${basePath}/${id}`, dataToSend);
    return response.data;
  }
};

export const deleteLogro = async (id) => {
  const response = await api.delete(`${basePath}/${id}`);
  return response.data;
};
