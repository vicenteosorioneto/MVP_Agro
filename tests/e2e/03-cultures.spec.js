const { test, expect } = require('@playwright/test');
const { navigateTo, createTestProperty, apiDelete } = require('./helpers');

let propertyId;

test.describe('Culturas', () => {
  test.beforeAll(async ({ request }) => {
    propertyId = await createTestProperty(request);
  });

  test.afterAll(async ({ request }) => {
    if (propertyId) await apiDelete(request, `/properties/${propertyId}`);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.waitForSelector('#dashboard.active', { timeout: 15000 });
    await navigateTo(page, 'cultures');
  });

  test('exibe tabela de culturas e botão de criação', async ({ page }) => {
    await expect(page.locator('#culturesTableBody')).toBeVisible();
    await expect(page.locator('#newCultureBtn')).toBeVisible();
  });

  test('criar cultura válida vinculada à propriedade', async ({ page }) => {
    const name = `Soja UI ${Date.now()}`;

    await page.click('#newCultureBtn');
    await expect(page.locator('#cultureModal')).toBeVisible();

    await page.fill('#cultureName', name);
    await page.selectOption('#cultureProperty', propertyId);
    await page.fill('#culturePlanting', '2026-05-01');
    await page.fill('#cultureHarvest', '2026-09-01');
    await page.selectOption('#cultureStatus', 'ativa');
    await page.fill('#cultureArea', '50');
    await page.fill('#cultureRevenue', '25000');
    await page.click('#saveCultureBtn');

    await expect(page.locator('#cultureModal')).not.toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('#culturesTableBody')).toContainText(name, { timeout: 8000 });
  });

  test('validação: data de plantio obrigatória', async ({ page }) => {
    await page.click('#newCultureBtn');
    await expect(page.locator('#cultureModal')).toBeVisible();
    await page.fill('#cultureName', 'Cultura sem datas');
    await page.selectOption('#cultureProperty', propertyId);
    // Deixa datas em branco
    await page.click('#saveCultureBtn');
    await page.waitForTimeout(600);
    await expect(page.locator('#cultureModal')).toBeVisible();
  });

  test('editar cultura: atualizar status e receita', async ({ page }) => {
    const name = `Milho Edit ${Date.now()}`;

    await page.click('#newCultureBtn');
    await page.fill('#cultureName', name);
    await page.selectOption('#cultureProperty', propertyId);
    await page.fill('#culturePlanting', '2026-05-01');
    await page.fill('#cultureHarvest', '2026-09-01');
    await page.selectOption('#cultureStatus', 'planejada');
    await page.fill('#cultureArea', '30');
    await page.fill('#cultureRevenue', '10000');
    await page.click('#saveCultureBtn');
    await expect(page.locator('#cultureModal')).not.toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('#culturesTableBody')).toContainText(name, { timeout: 8000 });

    const row = page.locator('#culturesTableBody tr', { hasText: name });
    await row.locator('[data-edit]').click();
    await expect(page.locator('#cultureModal')).toBeVisible();
    await page.selectOption('#cultureStatus', 'ativa');
    await page.fill('#cultureRevenue', '15000');
    await page.click('#saveCultureBtn');

    await expect(page.locator('#cultureModal')).not.toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('#culturesTableBody')).toContainText(name, { timeout: 8000 });
  });

  test('filtro por status "ativa" não exibe outras categorias', async ({ page }) => {
    await page.selectOption('#filterCultureStatus', 'ativa');
    await page.waitForTimeout(2000);
    const hasPlanejada = await page.locator('#culturesTableBody').getByText('Planejada').isVisible();
    const hasColhida   = await page.locator('#culturesTableBody').getByText('Colhida').isVisible();
    expect(hasPlanejada || hasColhida).toBe(false);
  });

  test('limpar filtro de status restaura listagem', async ({ page }) => {
    await page.selectOption('#filterCultureStatus', 'planejada');
    await page.waitForTimeout(1000);
    await page.click('#clearCultureFilters');
    await page.waitForTimeout(1000);
    const val = await page.locator('#filterCultureStatus').inputValue();
    expect(val).toBe('');
  });

  test('excluir cultura remove da tabela', async ({ page }) => {
    const name = `Café Del ${Date.now()}`;

    await page.click('#newCultureBtn');
    await page.fill('#cultureName', name);
    await page.selectOption('#cultureProperty', propertyId);
    await page.fill('#culturePlanting', '2026-05-01');
    await page.fill('#cultureHarvest', '2026-09-01');
    await page.click('#saveCultureBtn');
    await expect(page.locator('#cultureModal')).not.toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('#culturesTableBody')).toContainText(name, { timeout: 8000 });

    const row = page.locator('#culturesTableBody tr', { hasText: name });
    await row.locator('[data-delete]').click();
    await expect(page.locator('#deleteModal')).toBeVisible();
    await page.click('#confirmDeleteBtn');

    await expect(page.locator('#deleteModal')).not.toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('#culturesTableBody')).not.toContainText(name, { timeout: 8000 });
  });
});
