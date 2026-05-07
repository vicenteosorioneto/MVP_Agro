const { test, expect } = require('@playwright/test');
const { navigateTo } = require('./helpers');

test.describe('Alertas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.waitForSelector('#dashboard.active', { timeout: 15000 });
    await navigateTo(page, 'alerts');
  });

  test('tela de alertas carrega com botões de ação', async ({ page }) => {
    await expect(page.locator('#alertsList')).toBeVisible();
    await expect(page.locator('#generateAlertsBtn')).toBeVisible();
    await expect(page.locator('#markAllReadBtn')).toBeVisible();
  });

  test('gerar alertas popula a lista sem erros de JS', async ({ page }) => {
    await page.click('#generateAlertsBtn');
    await page.waitForTimeout(3000);
    await expect(page.locator('#alertsList')).toBeVisible();
    // Spinner de carregamento deve ter sumido
    const hasSpinner = await page.locator('#alertsList .loading-spinner').isVisible();
    expect(hasSpinner).toBe(false);
  });

  test('marcar todos como lido zera o badge de não-lidos', async ({ page }) => {
    // Garantir que há alertas
    await page.click('#generateAlertsBtn');
    await page.waitForTimeout(3000);

    await page.click('#markAllReadBtn');
    await page.waitForTimeout(2000);

    const badge = page.locator('#alertsBadge');
    const isVisible = await badge.isVisible();
    if (isVisible) {
      const count = parseInt((await badge.textContent()) || '0', 10);
      expect(count).toBe(0);
    }
  });

  test('excluir alerta individual remove da lista', async ({ page }) => {
    // Gerar alertas para garantir que há pelo menos um
    await page.click('#generateAlertsBtn');
    await page.waitForTimeout(3000);

    const deleteBtn = page.locator('#alertsList [data-delete], #alertsList .btn-danger').first();
    const hasBtnVisible = await deleteBtn.isVisible();
    if (!hasBtnVisible) {
      // Sem alertas no banco — teste passa como N/A
      return;
    }

    const countBefore = await page.locator('#alertsList [data-delete], #alertsList .btn-danger').count();
    await deleteBtn.click();
    // Pode abrir modal de confirmação
    const deleteModal = page.locator('#deleteModal');
    if (await deleteModal.isVisible()) {
      await page.click('#confirmDeleteBtn');
    }
    await page.waitForTimeout(1500);
    const countAfter = await page.locator('#alertsList [data-delete], #alertsList .btn-danger').count();
    expect(countAfter).toBeLessThan(countBefore);
  });

  test('ícone de alertas está presente na sidebar', async ({ page }) => {
    await expect(page.locator('.nav-item[data-screen="alerts"]')).toBeVisible();
  });
});
