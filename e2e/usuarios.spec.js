import { test, expect } from '@playwright/test';
import { setupMockApi, loginAs } from './helpers/mockApi';

test.describe('Gestión de Usuarios (E2E)', () => {
  test('lista estudiantes y administradores, busca y crea un nuevo administrador', async ({ page }) => {
    await setupMockApi(page);
    await loginAs(page, 'super_admin');

    await page.goto('/usuarios');
    await expect(page.getByRole('heading', { name: /Usuarios/i })).toBeVisible();
    await expect(page.getByText('Kusi Quispe')).toBeVisible();

    // Cambiar a pestaña Administradores
    await page.getByRole('tab', { name: /Administradores/i }).click();
    await expect(page.getByText('Baltazhar Drago')).toBeVisible();

    // Crear nuevo administrador
    await page.getByRole('button', { name: /Nuevo Administrador/i }).click();
    await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Rosa');
    await page.getByRole('textbox', { name: 'Apellido', exact: true }).fill('Huaman');
    await page.getByRole('textbox', { name: 'Correo electrónico' }).fill('rosa@unamba.edu.pe');
    await page.getByRole('textbox', { name: 'Contraseña provisoria' }).fill('ClaveSegura123!');
    await page.getByRole('button', { name: 'Crear Administrador' }).click();

    await expect(page.getByText('Rosa Huaman')).toBeVisible();
  });
});
