import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Award } from 'lucide-react';
import {
  AuditPanel,
  EmptyState,
  LevelBadge,
  PageHeader,
  Pagination,
  SortHeader,
  StatusSwitch,
} from '../PageKit';
import { ConfirmDialog, DeleteConfirmationModal } from '../DeleteConfirmationModal';

describe('PageKit (componentes compartidos de tablas y vistas)', () => {
  it('renderiza PageHeader, EmptyState y LevelBadge', () => {
    render(
      <div>
        <PageHeader title="Gestión de Cursos" description="Administra los cursos." actions={<button type="button">Crear</button>} />
        <EmptyState icon={Award} title="Sin registros" hint="Agrega el primero" />
        <LevelBadge nivel="A1" />
      </div>
    );

    expect(screen.getByRole('heading', { name: 'Gestión de Cursos' })).toBeInTheDocument();
    expect(screen.getByText('Administra los cursos.')).toBeInTheDocument();
    expect(screen.getByText('Sin registros')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
  });

  it('Pagination navega entre páginas y deshabilita los extremos', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(<Pagination page={1} totalPages={3} onChange={onChange} />);
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onChange).toHaveBeenCalledWith(2);

    rerender(<Pagination page={3} totalPages={3} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('StatusSwitch y SortHeader disparan callbacks accesibles', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onSort = vi.fn();

    render(
      <div>
        <StatusSwitch active={true} name="Unidad 1" onToggle={onToggle} />
        <table>
          <thead>
            <tr>
              <SortHeader label="Orden" sortKey="orden" sort={{ key: 'orden', direction: 'asc' }} onSort={onSort} />
            </tr>
          </thead>
        </table>
      </div>
    );

    const toggle = screen.getByRole('switch', { name: 'Desactivar Unidad 1' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);

    const sortBtn = screen.getByRole('button', { name: 'Orden' });
    expect(sortBtn.closest('th')).toHaveAttribute('aria-sort', 'ascending');
    await user.click(sortBtn);
    expect(onSort).toHaveBeenCalledWith('orden');
  });

  it('AuditPanel muestra creador y estado de actualización', () => {
    render(
      <AuditPanel
        record={{
          creado_por: { nombres: 'Baltazhar', apellidos: 'Drago' },
          creado_en: '2026-11-18T15:00:00.000Z',
          actualizado_por_id: null,
        }}
      />
    );
    expect(screen.getByText('Baltazhar Drago')).toBeInTheDocument();
    expect(screen.getByText(/Sin modificaciones recientes/i)).toBeInTheDocument();
  });

  it('DeleteConfirmationModal y ConfirmDialog confirman y cancelan acciones', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const { rerender } = render(
      <DeleteConfirmationModal open={true} title="¿Eliminar logro?" itemName="Chasqui" onCancel={onCancel} onConfirm={onConfirm} />
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmDialog open={true} icon={Award} title="¿Guardar?" description="Confirma cambios." confirmLabel="Sí, guardar" onCancel={onCancel} onConfirm={onConfirm} />
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
