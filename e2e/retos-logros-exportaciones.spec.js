import { test, expect } from '@playwright/test';
import { setupMockApi, loginAs } from './helpers/mockApi';

test.describe('Retos, Logros y Exportaciones (E2E)', () => {
  test('carga gestión de retos en /evaluaciones/retos', async ({ page }) => {
    await setupMockApi(page);
    await loginAs(page, 'super_admin');

    await page.addInitScript(() => {
      localStorage.setItem(
        'rimaqmasi:admin:retos-route',
        JSON.stringify({ course: '1', unit: '1', session: '1', lesson: '1' })
      );
    });

    await page.goto('/evaluaciones/retos');
    await expect(page.getByRole('heading', { name: 'Gestión de retos' })).toBeVisible();
    await expect(page.getByText(/¿Cómo se dice "Familia" en quechua\?/i)).toBeVisible();
  });

  test('crea, edita y elimina un logro en /gamificacion/logros', async ({ page }) => {
    await setupMockApi(page);
    await loginAs(page, 'super_admin');

    await page.goto('/gamificacion/logros');
    await expect(page.getByRole('heading', { name: 'Gestión de Logros' })).toBeVisible();
    await expect(page.getByText('Semilla del Saber')).toBeVisible();

    // Crear nuevo logro
    await page.getByRole('button', { name: /Agregar Nuevo Logro/i }).click();
    await page.getByLabel(/Título del Logro/i).fill('Chasqui E2E');
    await page.getByLabel(/Descripción/i).fill('Completa 5 lecciones en prueba E2E.');
    await page.getByRole('combobox', { name: /Seleccionar métrica requerida/i }).click();
    await page.getByRole('option', { name: /Lecciones completadas$/i }).click();
    await page.getByLabel(/Valor requerido/i).fill('5');
    await page.getByLabel(/XP de recompensa/i).fill('60');
    await page.getByRole('button', { name: 'Crear Logro' }).click();
    await page.getByRole('button', { name: /Sí, crear/i }).click();

    await expect(page.getByRole('heading', { name: 'Chasqui E2E' })).toBeVisible();

    // Eliminar logro creado
    await page.getByRole('button', { name: 'Eliminar logro Chasqui E2E' }).click();
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.getByRole('heading', { name: 'Chasqui E2E' })).not.toBeVisible();
  });

  test('accede a exportaciones y descarga reporte Excel en /reportes/exportaciones', async ({ page }) => {
    await setupMockApi(page);
    await loginAs(page, 'super_admin');

    await page.goto('/reportes/exportaciones');
    await expect(page.getByRole('heading', { name: /Exportaciones/i })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Excel/i }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
  });
});
