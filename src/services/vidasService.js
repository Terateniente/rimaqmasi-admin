import api from './api';

export const getConfiguracionVidas = async () => (await api.get('/vidas/configuracion')).data.data;
export const updateConfiguracionVidas = async (data) => (await api.put('/vidas/configuracion', data)).data.data;
