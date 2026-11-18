import { describe, it, expect, vi, beforeEach } from 'vitest';
import api, {
  BACKEND_BASE,
  clearSessionStorage,
  getApiErrorMessage,
  getClientDeviceMeta,
  getStoredRefreshToken,
  getStoredToken,
  resolveMediaUrl,
  setSessionTokens,
} from '../api';
import { login, logout, refreshSession } from '../authService';
import { createLogro, getLogros, updateLogro } from '../logroService';
import { getCursos, createCurso } from '../cursoService';
import { getCategorias, createCategoria } from '../diccionarioService';
import { downloadCsv } from '../analyticsService';

describe('api helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearSessionStorage();
  });

  it('gestiona tokens en localStorage de forma segura', () => {
    expect(getStoredToken()).toBeNull();
    setSessionTokens({ token: 'jwt-123', refresh_token: 'ref-456' });
    expect(getStoredToken()).toBe('jwt-123');
    expect(getStoredRefreshToken()).toBe('ref-456');

    clearSessionStorage();
    expect(getStoredToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
  });

  it('resuelve rutas multimedia relativas, absolutas locales, externas y blob/data', () => {
    expect(resolveMediaUrl(null)).toBeNull();
    expect(resolveMediaUrl('undefined')).toBeNull();
    expect(resolveMediaUrl('blob:http://localhost/abc')).toBe('blob:http://localhost/abc');
    expect(resolveMediaUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    expect(resolveMediaUrl('https://cdn.example.com/foto.png')).toBe('https://cdn.example.com/foto.png');
    expect(resolveMediaUrl('/images/curso.png')).toBe(`${BACKEND_BASE}/public/images/curso.png`);
    expect(resolveMediaUrl('/public/flags/qu.png')).toBe(`${BACKEND_BASE}/public/flags/qu.png`);
    expect(resolveMediaUrl('http://localhost:3000/images/a.png')).toBe(`${BACKEND_BASE}/public/images/a.png`);
  });

  it('normaliza mensajes de error HTTP, timeout y red', () => {
    expect(getApiErrorMessage({ response: { data: { message: 'Credenciales inválidas' } } })).toBe('Credenciales inválidas');
    expect(getApiErrorMessage({ response: { data: { error: 'Forbidden' } } })).toBe('Forbidden');
    expect(getApiErrorMessage({ code: 'ECONNABORTED' })).toMatch(/Tiempo de espera agotado/i);
    expect(getApiErrorMessage({ request: {} })).toMatch(/No se pudo conectar/i);
    expect(getApiErrorMessage(null, 'Error genérico')).toBe('Error genérico');
  });

  it('genera metadatos del dispositivo web', () => {
    const meta = getClientDeviceMeta();
    expect(meta.plataforma).toBe('web');
    expect(meta.nombre_dispositivo).toContain('Panel Admin');
  });
});

describe('servicios HTTP', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('authService envía credenciales y metadatos al iniciar y renovar sesión', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, token: 'tok' } });

    const res = await login('admin@rimaqmasi.com', 'Clave123!');
    expect(res.token).toBe('tok');
    expect(postSpy).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({ correo: 'admin@rimaqmasi.com', contrasena: 'Clave123!', plataforma: 'web' })
    );

    await refreshSession('ref-1');
    expect(postSpy).toHaveBeenCalledWith(
      '/auth/refresh',
      expect.objectContaining({ refresh_token: 'ref-1', plataforma: 'web' })
    );

    await logout('ref-1');
    expect(postSpy).toHaveBeenCalledWith('/auth/logout', { refresh_token: 'ref-1' });
  });

  it('logroService usa JSON sin archivo y FormData cuando se adjunta imagen', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, data: { id: 1 } } });
    const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } });
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [] } });

    await getLogros();
    expect(getSpy).toHaveBeenCalledWith('/logros');

    await createLogro({ titulo: 'Logro 1', descripcion: 'Desc', metrica_requerida: 'xp_total', valor_requerido: 100, xp_recompensa: 50 });
    expect(postSpy).toHaveBeenLastCalledWith('/logros', expect.objectContaining({ titulo: 'Logro 1' }));

    const file = new File(['img'], 'medalla.png', { type: 'image/png' });
    await createLogro({ titulo: 'Logro 2', descripcion: 'Desc', metrica_requerida: 'xp_total', valor_requerido: 200, xp_recompensa: 80, imagen: file });
    expect(postSpy.mock.calls[1][1]).toBeInstanceOf(FormData);

    await updateLogro(1, { titulo: 'Editado', imagen: undefined });
    expect(putSpy).toHaveBeenCalledWith('/logros/1', { titulo: 'Editado' });
  });

  it('cursoService y diccionarioService invocan los endpoints correctos', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [] } });
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { data: { id: 1 } } });

    await getCursos();
    expect(getSpy).toHaveBeenCalledWith('/cursos');

    await createCurso({ nombre: 'Quechua A1' });
    expect(postSpy).toHaveBeenCalledWith('/cursos', { nombre: 'Quechua A1' });

    await getCategorias();
    expect(getSpy).toHaveBeenCalledWith('/dictionary/categories');

    await createCategoria({ nombre: 'Animales', descripcion: 'Fauna andina' });
    expect(postSpy).toHaveBeenCalledWith('/dictionary/categories', { nombre: 'Animales', descripcion: 'Fauna andina' });
  });

  it('downloadCsv genera y descarga un Blob CSV con encabezados escapados', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadCsv('reporte.csv', [{ Nombre: 'Ana "A"', XP: 120 }]);
    expect(createUrlSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:csv');

    downloadCsv('vacio.csv', []);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
