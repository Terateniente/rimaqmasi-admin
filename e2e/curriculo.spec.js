import { test, expect } from '@playwright/test';
import { setupMockApi, loginAs } from './helpers/mockApi';

test.describe('Gestión Académica / Currículo (E2E)', () => {
  test('recorre Cursos, Unidades, Sesiones y Lecciones con búsqueda y creación', async ({ page }) => {
    await setupMockApi(page);
    await loginAs(page, 'super_admin');

    // 1. Cursos
    await page.goto('/academica/cursos');
    await expect(page.getByRole('heading', { name: 'Gestión de Cursos' })).toBeVisible();
    await expect(page.getByText('Quechua Sureño desde Español')).toBeVisible();

    // 2. Unidades
    await page.goto('/academica/unidads');
    await expect(page.getByRole('heading', { name: 'Gestión de Unidades' })).toBeVisible();
    await expect(page.getByText('Introduccion al quechua')).toBeVisible();

    // 3. Sesiones
    await page.goto('/academica/sesiones');
    await expect(page.getByRole('heading', { name: 'Gestión de Sesiones' })).toBeVisible();
    await expect(page.getByText('El quechua, origen y caracteristicas')).toBeVisible();

    // 4. Lecciones
    await page.goto('/academica/lecciones');
    await expect(page.getByRole('heading', { name: 'Gestión de Lecciones' })).toBeVisible();
    await expect(page.getByText('El origen del quechua')).toBeVisible();

    // Búsqueda en lecciones
    await page.getByLabel(/Palabra clave/i).fill('origen');
    await expect(page.getByText('El origen del quechua')).toBeVisible();
  });
});
