const { test, expect } = require('@playwright/test');
const { navigateTo } = require('./helpers');

test.describe('Histórico', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.waitForSelector('#dashboard.active', { timeout: 15000 });
    await navigateTo(page, 'history');
  });

  test('tela de histórico exibe a timeline', async ({ page }) => {
    await expect(page.locator('#historyTimeline')).toBeVisible();
  });

  test('filtro por cultura está disponível', async ({ page }) => {
    await expect(page.locator('#filterHistCulture')).toBeVisible();
  });

  test('timeline carrega sem spinner indefinido', async ({ page }) => {
    await page.waitForTimeout(3000);
    const hasSpinner = await page.locator('#historyTimeline .loading-spinner').isVisible();
    expect(hasSpinner).toBe(false);
    await expect(page.locator('#historyTimeline')).toBeVisible();
  });

  test('selecionar cultura no filtro atualiza a timeline', async ({ page }) => {
    const select = page.locator('#filterHistCulture');
    const optionCount = await select.locator('option').count();

    if (optionCount > 1) {
      const secondValue = await select.locator('option').nth(1).getAttribute('value');
      await page.selectOption('#filterHistCulture', secondValue);
      await page.waitForTimeout(2000);
      await expect(page.locator('#historyTimeline')).toBeVisible();
      const hasSpinner = await page.locator('#historyTimeline .loading-spinner').isVisible();
      expect(hasSpinner).toBe(false);
    }
  });

  test('limpar filtro (selecionar "Todas") recarrega timeline', async ({ page }) => {
    await page.selectOption('#filterHistCulture', '');
    await page.waitForTimeout(2000);
    await expect(page.locator('#historyTimeline')).toBeVisible();
  });
});
