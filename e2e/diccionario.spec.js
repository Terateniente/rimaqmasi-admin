import { test, expect } from '@playwright/test';
import { setupMockApi, loginAs } from './helpers/mockApi';

test.describe('Diccionario: Categorías y Palabras (E2E)', () => {
  test('crea y elimina una categoría en /diccionario/categorias', async ({ page }) => {
    await setupMockApi(page);
    await loginAs(page, 'super_admin');

    await page.goto('/diccionario/categorias');
    await expect(page.getByRole('heading', { name: 'Categorías' })).toBeVisible();
    await expect(page.getByText('Familia y personas')).toBeVisible();

    await page.getByRole('button', { name: /Nueva Categoría/i }).click();
    await page.getByLabel(/Nombre de la categoría/i).fill('Colores Andinos');
    await page.getByRole('button', { name: /Crear Categoría/i }).click();
    await page.getByRole('button', { name: /Sí, crear/i }).click();

    await expect(page.getByRole('cell', { name: 'Colores Andinos', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar Colores Andinos' }).click();
    await page.getByRole('button', { name: 'Sí, eliminar' }).click();
    await expect(page.getByRole('cell', { name: 'Colores Andinos', exact: true })).not.toBeVisible();
  });

  test('visualiza y busca palabras en /diccionario/palabras', async ({ page }) => {
    await setupMockApi(page);
    await loginAs(page, 'super_admin');

    await page.goto('/diccionario/palabras');
    await expect(page.getByRole('heading', { name: 'Diccionario' })).toBeVisible();
    await expect(page.getByText('Ayllu')).toBeVisible();

    await page.getByLabel(/Palabra clave/i).fill('ayllu');
    await expect(page.getByText('Ayllu')).toBeVisible();
  });
});
