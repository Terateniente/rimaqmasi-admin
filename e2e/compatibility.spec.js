import { test, expect } from '@playwright/test';
import { loginAs, setupMockApi } from './helpers/mockApi';

const VIEWPORTS = [
  { name: 'Desktop FHD (1440x900)', width: 1440, height: 900, mobileDrawer: false },
  { name: 'Desktop HD (1280x800)', width: 1280, height: 800, mobileDrawer: false },
  { name: 'Tableta horizontal (1024x768)', width: 1024, height: 768, mobileDrawer: false },
  { name: 'Tableta vertical (768x1024)', width: 768, height: 1024, mobileDrawer: true },
];

const CRITICAL_ROUTES = ['/dashboard', '/usuarios', '/academica/cursos', '/gamificacion/logros'];

async function assertNoHorizontalOverflow(page, label) {
  const dims = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    docScroll: document.documentElement.scrollWidth,
    bodyScroll: document.body.scrollWidth,
  }));
  expect(
    dims.docScroll,
    `Desbordamiento horizontal detectado en ${label} (doc=${dims.docScroll}px, viewport=${dims.viewport}px)`
  ).toBeLessThanOrEqual(dims.viewport + 2);
  expect(
    dims.bodyScroll,
    `Desbordamiento horizontal en body en ${label} (body=${dims.bodyScroll}px, viewport=${dims.viewport}px)`
  ).toBeLessThanOrEqual(dims.viewport + 2);
}

test.describe('Matriz de compatibilidad multi-navegador y resoluciones (ADM-10)', () => {
  test.setTimeout(90000);

  for (const vp of VIEWPORTS) {
    test(`Resolución ${vp.name}: rutas críticas, navegación y modales sin desbordamiento`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await setupMockApi(page);
      await loginAs(page, 'super_admin');

      for (const route of CRITICAL_ROUTES) {
        await page.goto(route);
        await page.locator('h1').first().waitFor({ state: 'visible' });
        await assertNoHorizontalOverflow(page, `${vp.name} ${route}`);
      }

      // Ya estamos en /gamificacion/logros: validar sidebar / drawer según resolución
      if (vp.mobileDrawer) {
        const menuBtn = page.locator('.rq-topbar__menu');
        await expect(menuBtn).toBeVisible();
        await menuBtn.click();
        const sidebar = page.locator('#admin-sidebar.open');
        await expect(sidebar).toBeVisible();
        await sidebar.getByRole('button', { name: /Cerrar menú de navegación/i }).click();
        await expect(page.locator('#admin-sidebar.open')).toHaveCount(0);
      } else {
        await expect(page.locator('#admin-sidebar')).toBeVisible();
      }

      // Verificar que el modal de Logros cabe dentro del viewport con su botón de guardado visible
      await page.getByRole('button', { name: /Nuevo logro/i }).click();
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();
      const saveBtn = dialog.getByRole('button', { name: /Guardar|Crear/i }).first();
      await expect(saveBtn).toBeVisible();

      const box = await saveBtn.boundingBox();
      expect(box, `Botón de guardar sin geometría en ${vp.name}`).not.toBeNull();
      expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 2);
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 2);
    });
  }
});
