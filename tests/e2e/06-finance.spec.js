const { test, expect } = require('@playwright/test');
const { navigateTo } = require('./helpers');

test.describe('Financeiro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.waitForSelector('#dashboard.active', { timeout: 15000 });
    await navigateTo(page, 'finance');
  });

  test('quatro cards KPI financeiros são exibidos', async ({ page }) => {
    await expect(page.locator('#finCostTotal')).toBeVisible();
    await expect(page.locator('#finRevTotal')).toBeVisible();
    await expect(page.locator('#finProfitTotal')).toBeVisible();
    await expect(page.locator('#finMargin')).toBeVisible();
  });

  test('valores financeiros carregam da API', async ({ page }) => {
    await expect(page.locator('#finCostTotal')).not.toHaveText('-', { timeout: 15000 });
    await expect(page.locator('#finRevTotal')).not.toHaveText('-');
    await expect(page.locator('#finProfitTotal')).not.toHaveText('-');
  });

  test('seções de gráficos (por cultura, tipo, mês) são exibidas', async ({ page }) => {
    await expect(page.locator('#finByCulture')).toBeVisible();
    await expect(page.locator('#finByType')).toBeVisible();
    await expect(page.locator('#finByMonth')).toBeVisible();
  });

  test('filtro por período aplica e retorna dados válidos', async ({ page }) => {
    await page.fill('#filterFinStart', '2026-01-01');
    await page.fill('#filterFinEnd', '2026-12-31');
    await page.click('#applyFinFilters');
    await page.waitForTimeout(2000);
    await expect(page.locator('#finCostTotal')).not.toHaveText('-', { timeout: 8000 });
  });

  test('limpar filtros redefine os campos de data', async ({ page }) => {
    await page.fill('#filterFinStart', '2026-01-01');
    await page.fill('#filterFinEnd', '2026-12-31');
    await page.click('#applyFinFilters');
    await page.waitForTimeout(1000);
    await page.click('#clearFinFilters');
    await page.waitForTimeout(1000);
    expect(await page.locator('#filterFinStart').inputValue()).toBe('');
    expect(await page.locator('#filterFinEnd').inputValue()).toBe('');
  });

  test('botão Atualizar recarrega dados sem erros', async ({ page }) => {
    await page.click('#financeRefreshBtn');
    await expect(page.locator('#finCostTotal')).not.toHaveText('-', { timeout: 10000 });
    const toastText = await page.locator('#globalToast').textContent();
    expect(toastText).not.toMatch(/erro|error/i);
  });
});
