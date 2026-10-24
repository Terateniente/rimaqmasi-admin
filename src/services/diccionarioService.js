import api from './api';

// --- Categories ---
export const getCategorias = async () => {
  const response = await api.get('/dictionary/categories');
  return response.data;
};

export const createCategoria = async (categoriaData) => {
  const response = await api.post('/dictionary/categories', categoriaData);
  return response.data;
};

export const updateCategoria = async (id, categoriaData) => {
  const response = await api.put(`/dictionary/categories/${id}`, categoriaData);
  return response.data;
};

export const deleteCategoria = async (id) => {
  const response = await api.delete(`/dictionary/categories/${id}`);
  return response.data;
};

// --- Words ---
export const getPalabras = async (idioma_id = '') => {
  let url = '/dictionary/words';
  if (idioma_id) {
    url += `?idioma_id=${encodeURIComponent(idioma_id)}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const createPalabra = async (palabraData) => {
  if (palabraData.audio instanceof File || palabraData.imagen instanceof File) {
    const formData = new FormData();
    const { audio, imagen, ...rest } = palabraData;
    
    formData.append('data', JSON.stringify(rest));
    
    if (audio) formData.append('audio', audio);
    if (imagen) formData.append('imagen', imagen);

    const response = await api.post('/dictionary/words', formData);
    return response.data;
  } else {
    const response = await api.post('/dictionary/words', palabraData);
    return response.data;
  }
};

export const updatePalabra = async (id, palabraData) => {
  if (palabraData.audio instanceof File || palabraData.imagen instanceof File) {
    const formData = new FormData();
    const { audio, imagen, ...rest } = palabraData;
    
    formData.append('data', JSON.stringify(rest));
    
    if (audio) formData.append('audio', audio);
    if (imagen) formData.append('imagen', imagen);

    const response = await api.put(`/dictionary/words/${id}`, formData);
    return response.data;
  } else {
    const response = await api.put(`/dictionary/words/${id}`, palabraData);
    return response.data;
  }
};

export const deletePalabra = async (id) => {
  const response = await api.delete(`/dictionary/words/${id}`);
  return response.data;
};

export const updatePalabraStatus = async (id, estado) => {
  const response = await api.patch(`/dictionary/words/${id}/status`, { estado });
  return response.data;
};

// --- Definitions ---
export const addDefinicion = async (palabraId, definicionData) => {
  const response = await api.post(`/dictionary/words/${palabraId}/definitions`, definicionData);
  return response.data;
};

export const deleteDefinicion = async (id) => {
  const response = await api.delete(`/dictionary/definitions/${id}`);
  return response.data;
};

export const updateDefinicionStatus = async (id, estado) => {
  const response = await api.patch(`/dictionary/definitions/${id}/status`, { estado });
  return response.data;
};

// --- Examples ---
export const addEjemplo = async (definicionId, ejemploData) => {
  if (ejemploData.audio instanceof File) {
    const formData = new FormData();
    formData.append('ejemplo_texto', ejemploData.ejemplo_texto);
    if (ejemploData.traduccion_ejemplo) formData.append('traduccion_ejemplo', ejemploData.traduccion_ejemplo);
    formData.append('audio', ejemploData.audio);

    const response = await api.post(`/dictionary/definitions/${definicionId}/examples`, formData);
    return response.data;
  } else {
    const response = await api.post(`/dictionary/definitions/${definicionId}/examples`, ejemploData);
    return response.data;
  }
};

export const deleteEjemplo = async (id) => {
  const response = await api.delete(`/dictionary/examples/${id}`);
  return response.data;
};

export const updateEjemploStatus = async (id, estado) => {
  const response = await api.patch(`/dictionary/examples/${id}/status`, { estado });
  return response.data;
};

// --- Missing functions restored ---
export const getPalabraById = async (id) => {
  const response = await api.get(`/dictionary/words/${id}`);
  return response.data;
};

export const updatePalabraAudio = async (id, audioFile) => {
  const formData = new FormData();
  formData.append('audio', audioFile);
  const response = await api.patch(`/dictionary/words/${id}/audio`, formData);
  return response.data;
};

export const updateDefinicion = async (id, definicionData) => {
  // Assuming a generic update endpoint for definitions exists or falls back to standard
  const response = await api.put(`/dictionary/definitions/${id}`, definicionData).catch(() => api.patch(`/dictionary/definitions/${id}`, definicionData));
  return response.data;
};

export const updateEjemplo = async (id, ejemploData) => {
  // Assuming a generic update endpoint for examples exists or falls back to standard
  const response = await api.put(`/dictionary/examples/${id}`, ejemploData).catch(() => api.patch(`/dictionary/examples/${id}`, ejemploData));
  return response.data;
};

// --- Aportes de estudiantes ---
export const getContribuciones = async ({ estado = '', tipo = '' } = {}) => {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  if (tipo) params.set('tipo', tipo);
  const response = await api.get(`/dictionary/contributions${params.size ? `?${params}` : ''}`);
  return response.data;
};

export const revisarContribucion = async (id, accion, motivo = '') => {
  const response = await api.patch(`/dictionary/contributions/${id}/review`, { accion, motivo });
  return response.data;
};

