import { test, expect } from '@playwright/test';
import { setupMockApi, loginAs } from './helpers/mockApi';

test.describe('Autenticación, permisos y expiración de sesión (ADM-03 / ADM-08)', () => {
  test('redirige una ruta protegida sin sesión hacia /login', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Bienvenido' })).toBeVisible();
  });

  test('rechaza acceso al panel a un usuario con rol estudiante', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/login');

    await page.getByLabel(/Usuario o correo/i).fill('alumno@unamba.edu.pe');
    await page.getByLabel('Contraseña', { exact: true }).fill('Clave123!');
    await page.getByRole('button', { name: /Ingresar al sistema/i }).click();

    await expect(page.getByRole('alert')).toContainText(/Acceso denegado/i);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('inicia sesión como admin y bloquea acceso directo a /usuarios (solo Super Admin)', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/login');

    await page.getByLabel(/Usuario o correo/i).fill('baltazhar@unamba.edu.pe');
    await page.getByLabel('Contraseña', { exact: true }).fill('Admin123!');
    await page.getByRole('button', { name: /Ingresar al sistema/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);

    // Intento de navegación directa a ruta restringida a SUPER
    await page.goto('/usuarios');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('inicia sesión como super_admin, accede a /usuarios y cierra sesión limpiando storage', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/login');

    await page.getByLabel(/Usuario o correo/i).fill('admin@rimaqmasi.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('RimaqMasi2026!');
    await page.getByRole('button', { name: /Ingresar al sistema/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/usuarios');
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(page.getByRole('heading', { name: /Usuarios/i })).toBeVisible();

    await page.getByRole('button', { name: /Cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('expira sesión automáticamente ante respuesta 401 sin refresh válido', async ({ page }) => {
    await setupMockApi(page, { force401Paths: ['/logros'] });
    await loginAs(page, 'super_admin');

    await page.goto('/gamificacion/logros');
    await expect(page).toHaveURL(/\/login$/);
  });
});
