import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Categorias } from '../diccionario/Categorias';
import { Logros } from '../gamificacion/Logros';

vi.mock('../../services/diccionarioService', () => ({
  getCategorias: vi.fn(),
  createCategoria: vi.fn(),
  updateCategoria: vi.fn(),
  deleteCategoria: vi.fn(),
}));

vi.mock('../../services/logroService', () => ({
  getLogros: vi.fn(),
  createLogro: vi.fn(),
  updateLogro: vi.fn(),
  deleteLogro: vi.fn(),
}));

import {
  getCategorias,
  createCategoria,
  deleteCategoria,
} from '../../services/diccionarioService';
import {
  getLogros,
  updateLogro,
  deleteLogro,
} from '../../services/logroService';

describe('Categorias page (tabla, búsqueda y CRUD con confirmación)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista categorías, filtra por palabra clave y crea una nueva categoría', async () => {
    const user = userEvent.setup();
    getCategorias.mockResolvedValue({
      data: [
        { categoria_id: 1, nombre: 'Animales', descripcion: 'Fauna andina' },
        { categoria_id: 2, nombre: 'Alimentos', descripcion: 'Comidas típicas' },
      ],
    });
    createCategoria.mockResolvedValue({ success: true, data: { categoria_id: 3, nombre: 'Colores' } });

    render(<Categorias />);

    expect(await screen.findByText('Animales')).toBeInTheDocument();
    expect(screen.getByText('Alimentos')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Palabra clave/i), 'fauna');
    expect(screen.getByText('Animales')).toBeInTheDocument();
    expect(screen.queryByText('Alimentos')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Nueva Categoría/i }));
    await user.type(screen.getByLabelText(/Nombre de la categoría/i), 'Colores');
    await user.click(screen.getByRole('button', { name: /Crear Categoría/i }));

    expect(await screen.findByText(/¿Crear categoría\?/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Sí, crear/i }));

    await waitFor(() => {
      expect(createCategoria).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Colores' }));
    });
  });

  it('permite eliminar una categoría mediante modal de confirmación', async () => {
    const user = userEvent.setup();
    getCategorias.mockResolvedValue({
      data: [{ categoria_id: 1, nombre: 'Animales', descripcion: 'Fauna andina' }],
    });
    deleteCategoria.mockResolvedValue({ success: true });

    render(<Categorias />);
    expect(await screen.findByText('Animales')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eliminar Animales' }));
    expect(await screen.findByText(/¿Eliminar categoría\?/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    await waitFor(() => {
      expect(deleteCategoria).toHaveBeenCalledWith(1);
    });
  });
});

describe('Logros page (tarjetas, filtros y formulario modal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra los logros, permite buscar, editar y guardar cambios', async () => {
    const user = userEvent.setup();
    getLogros.mockResolvedValue({
      data: [
        {
          logros_id: 1,
          titulo: 'Semilla del Saber',
          descripcion: 'Completa tu primera lección.',
          metrica_requerida: 'lecciones_completadas',
          valor_requerido: 1,
          xp_recompensa: 25,
          url_imagen_medalla: null,
        },
        {
          logros_id: 2,
          titulo: 'Chasqui Aprendiz',
          descripcion: 'Completa 5 lecciones.',
          metrica_requerida: 'lecciones_completadas',
          valor_requerido: 5,
          xp_recompensa: 50,
          url_imagen_medalla: null,
        },
      ],
    });
    updateLogro.mockResolvedValue({ success: true });

    render(<Logros />);

    expect(await screen.findByText('Semilla del Saber')).toBeInTheDocument();
    expect(screen.getByText('Chasqui Aprendiz')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Palabra clave/i), 'chasqui');
    expect(screen.queryByText('Semilla del Saber')).not.toBeInTheDocument();
    expect(screen.getByText('Chasqui Aprendiz')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Detalles/i }));
    const xpInput = screen.getByLabelText(/XP de recompensa/i);
    await user.clear(xpInput);
    await user.type(xpInput, '75');
    await user.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    expect(await screen.findByText(/¿Guardar cambios\?/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Sí, guardar/i }));

    await waitFor(() => {
      expect(updateLogro).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ titulo: 'Chasqui Aprendiz', xp_recompensa: 75, valor_requerido: 5 })
      );
    });
  });

  it('elimina un logro desde el botón de tarjeta tras confirmar', async () => {
    const user = userEvent.setup();
    getLogros.mockResolvedValue({
      data: [
        {
          logros_id: 1,
          titulo: 'Semilla del Saber',
          descripcion: 'Primera lección.',
          metrica_requerida: 'lecciones_completadas',
          valor_requerido: 1,
          xp_recompensa: 25,
          url_imagen_medalla: null,
        },
      ],
    });
    deleteLogro.mockResolvedValue({ success: true });

    render(<Logros />);
    expect(await screen.findByText('Semilla del Saber')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eliminar logro Semilla del Saber' }));
    expect(await screen.findByText(/¿Eliminar logro\?/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));

    await waitFor(() => {
      expect(deleteLogro).toHaveBeenCalledWith(1);
    });
  });
});
