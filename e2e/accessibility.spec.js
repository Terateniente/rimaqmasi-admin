import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAs, setupMockApi } from './helpers/mockApi';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function runAxeAudit(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  if (results.violations.length > 0) {
    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 5).map((n) => ({
        target: n.target,
        failureSummary: n.failureSummary,
        html: n.html.slice(0, 180),
      })),
    }));
    console.log(`[AXE VIOLATIONS] ${label}:`, JSON.stringify(summary, null, 2));
  }

  expect(results.violations, `WCAG 2.2 AA violations on ${label}`).toEqual([]);
}

test.describe('Auditoría WCAG 2.2 AA (ADM-05)', () => {
  test.setTimeout(60000);

  const publicRoutes = [
    { name: 'Login', path: '/login', ready: 'button[type="submit"]' },
    { name: 'Recuperar contraseña', path: '/recuperar-contrasena', ready: 'main, form' },
  ];

  for (const { name, path, ready } of publicRoutes) {
    test(`Vista pública ${name} (${path}) cumple WCAG 2.2 AA`, async ({ page }) => {
      await setupMockApi(page);
      await page.goto(path);
      await page.locator(ready).first().waitFor({ state: 'visible' });
      await page.waitForTimeout(300);
      await runAxeAudit(page, `${name} (${path})`);
    });
  }

  const adminRoutes = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Usuarios', path: '/usuarios' },
    { name: 'Idiomas', path: '/academica/idiomas' },
    { name: 'Cursos', path: '/academica/cursos' },
    { name: 'Unidades', path: '/academica/unidads' },
    { name: 'Sesiones', path: '/academica/sesiones' },
    { name: 'Lecciones', path: '/academica/lecciones' },
    { name: 'Matrículas', path: '/academica/matriculas' },
    { name: 'Categorías', path: '/diccionario/categorias' },
    { name: 'Palabras', path: '/diccionario/palabras' },
    { name: 'Aportes', path: '/diccionario/aportes' },
    { name: 'Retos', path: '/evaluaciones/retos' },
    { name: 'Logros', path: '/gamificacion/logros' },
    { name: 'Vidas y rachas', path: '/gamificacion/rachas' },
    { name: 'Exportaciones', path: '/reportes/exportaciones' },
  ];

  for (const { name, path } of adminRoutes) {
    test(`Vista administrativa ${name} (${path}) cumple WCAG 2.2 AA`, async ({ page }) => {
      await setupMockApi(page);
      await loginAs(page, 'super_admin');
      await page.goto(path);
      await page.locator('h1').first().waitFor({ state: 'visible' });
      await page.waitForTimeout(450);
      await runAxeAudit(page, `${name} (${path})`);
    });
  }

  test('Modales, teclado y foco en Logros y Categorías cumplen WCAG 2.2 AA', async ({ page }) => {
    await setupMockApi(page);
    await loginAs(page, 'super_admin');

    // 1. Verificar navegación por teclado en el panel (Tab llega a controles interactivos con foco visible)
    await page.goto('/gamificacion/logros');
    await page.locator('h1').first().waitFor({ state: 'visible' });
    await page.keyboard.press('Tab');
    const firstFocusedTag = await page.evaluate(() => document.activeElement?.tagName || '');
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(firstFocusedTag);

    // 2. Abrir modal "Nuevo logro" y auditar accesibilidad del diálogo y formulario
    await page.getByRole('button', { name: /Nuevo logro/i }).click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    await runAxeAudit(page, 'Modal Nuevo logro');

    // 3. Cerrar modal y auditar diálogo de confirmación de eliminación en Categorías
    await page.goto('/diccionario/categorias');
    await page.locator('h1').first().waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /Eliminar/i }).first().click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await runAxeAudit(page, 'DeleteConfirmationModal');
  });

  test('Modo claro cumple contraste WCAG 2.2 AA en Dashboard y Logros', async ({ page }) => {
    await setupMockApi(page);
    await loginAs(page, 'super_admin');
    await page.addInitScript(() => {
      localStorage.setItem('rq_admin_theme', 'light');
    });

    await page.goto('/dashboard');
    await page.locator('h1').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(400);
    await runAxeAudit(page, 'Dashboard (modo claro)');

    await page.goto('/gamificacion/logros');
    await page.locator('h1').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(400);
    await runAxeAudit(page, 'Logros (modo claro)');
  });
});
