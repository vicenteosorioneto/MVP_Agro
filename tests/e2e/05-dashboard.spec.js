const { test, expect } = require('@playwright/test');

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.waitForSelector('#dashboard.active', { timeout: 15000 });
  });

  test('dashboard é a tela inicial com nav ativo', async ({ page }) => {
    await expect(page.locator('#dashboard')).toHaveClass(/active/);
    await expect(page.locator('.nav-item[data-screen="dashboard"]')).toHaveClass(/active/);
    await expect(page.locator('#headerTitle')).toContainText('Dashboard');
  });

  test('todos os cards KPI estão visíveis', async ({ page }) => {
    const ids = ['kpiProps', 'kpiCultures', 'kpiActiveCultures',
                 'kpiPending', 'kpiDone', 'kpiLate',
                 'kpiCost', 'kpiRevenue', 'kpiProfit'];
    for (const id of ids) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('valores dos KPIs carregam da API (saem do "-")', async ({ page }) => {
    await expect(page.locator('#kpiProps')).not.toHaveText('-', { timeout: 15000 });
    await expect(page.locator('#kpiCultures')).not.toHaveText('-');
    await expect(page.locator('#kpiCost')).not.toHaveText('-');
  });

  test('seção "Atividades por status" está visível', async ({ page }) => {
    await expect(page.locator('#dashActivityChart')).toBeVisible();
    await expect(page.locator('.card-title').filter({ hasText: 'Atividades por status' })).toBeVisible();
  });

  test('seção "Próximas colheitas" está visível', async ({ page }) => {
    await expect(page.locator('#dashHarvests')).toBeVisible();
    await expect(page.locator('.card-title').filter({ hasText: 'Próximas colheitas' })).toBeVisible();
  });

  test('botão Atualizar recarrega os KPIs sem erros', async ({ page }) => {
    await expect(page.locator('#kpiProps')).not.toHaveText('-', { timeout: 15000 });
    await page.click('#dashRefreshBtn');
    await page.waitForTimeout(2000);
    await expect(page.locator('#kpiProps')).not.toHaveText('-', { timeout: 10000 });
    const toastText = await page.locator('#globalToast').textContent();
    expect(toastText).not.toMatch(/erro|error/i);
  });

  test('sidebar exibe links para todas as telas', async ({ page }) => {
    const screens = ['properties', 'cultures', 'activities', 'finance', 'history', 'reports', 'alerts'];
    for (const screen of screens) {
      await expect(page.locator(`.nav-item[data-screen="${screen}"]`)).toBeVisible();
    }
  });

  test('navegação via sidebar muda a tela ativa', async ({ page }) => {
    await page.click('.nav-item[data-screen="properties"]');
    await page.waitForSelector('#properties.active', { timeout: 8000 });
    await expect(page.locator('#properties')).toHaveClass(/active/);
    await expect(page.locator('#dashboard')).not.toHaveClass(/active/);
  });
});
