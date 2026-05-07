const { test, expect } = require('@playwright/test');
const { navigateTo, createTestProperty, createTestCulture, apiDelete } = require('./helpers');

let propertyId;
let cultureId;

test.describe('Atividades', () => {
  test.beforeAll(async ({ request }) => {
    propertyId = await createTestProperty(request);
    cultureId  = await createTestCulture(request, propertyId);
  });

  test.afterAll(async ({ request }) => {
    if (cultureId)  await apiDelete(request, `/cultures/${cultureId}`);
    if (propertyId) await apiDelete(request, `/properties/${propertyId}`);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.waitForSelector('#dashboard.active', { timeout: 15000 });
    await navigateTo(page, 'activities');
  });

  test('exibe tabela de atividades e botão de criação', async ({ page }) => {
    await expect(page.locator('#activitiesTableBody')).toBeVisible();
    await expect(page.locator('#newActivityBtn')).toBeVisible();
  });

  test('criar atividade válida aparece na tabela', async ({ page }) => {
    const title = `Irrigação UI ${Date.now()}`;

    await page.click('#newActivityBtn');
    await expect(page.locator('#activityModal')).toBeVisible();

    await page.fill('#actTitle', title);
    await page.fill('#actDate', '2026-06-01');
    await page.fill('#actAssignee', 'João Souza');
    await page.selectOption('#actTipo', 'Irrigação');
    await page.selectOption('#actStatus', 'pendente');
    await page.fill('#actCost', '300');
    await page.click('#saveActivityBtn');

    await expect(page.locator('#activityModal')).not.toHaveClass(/open/, { timeout: 10000 });
    await expect(page.locator('#activitiesTableBody')).toContainText(title, { timeout: 10000 });
  });

  test('editar atividade atualiza dados na tabela', async ({ page }) => {
    const title = `Plantio Edit ${Date.now()}`;

    await page.click('#newActivityBtn');
    await page.fill('#actTitle', title);
    await page.fill('#actDate', '2026-06-10');
    await page.fill('#actAssignee', 'Maria');
    await page.selectOption('#actTipo', 'Plantio');
    await page.fill('#actCost', '400');
    await page.click('#saveActivityBtn');
    await expect(page.locator('#activityModal')).not.toHaveClass(/open/, { timeout: 10000 });
    await expect(page.locator('#activitiesTableBody')).toContainText(title, { timeout: 8000 });

    const row = page.locator('#activitiesTableBody tr', { hasText: title });
    await row.locator('[data-edit]').click();
    await expect(page.locator('#activityModal')).toBeVisible();
    await page.fill('#actAssignee', 'Maria Editada');
    await page.fill('#actCost', '600');
    await page.click('#saveActivityBtn');

    await expect(page.locator('#activityModal')).not.toHaveClass(/open/, { timeout: 10000 });
    await expect(page.locator('#activitiesTableBody')).toContainText(title, { timeout: 8000 });
  });

  test('marcar atividade como concluída muda status e remove botão ✓', async ({ page }) => {
    const title = `Adubação Concluir ${Date.now()}`;

    await page.click('#newActivityBtn');
    await page.fill('#actTitle', title);
    await page.fill('#actDate', '2026-06-15');
    await page.selectOption('#actTipo', 'Adubação');
    await page.selectOption('#actStatus', 'pendente');
    await page.click('#saveActivityBtn');
    await expect(page.locator('#activityModal')).not.toHaveClass(/open/, { timeout: 10000 });
    await expect(page.locator('#activitiesTableBody')).toContainText(title, { timeout: 8000 });

    const row = page.locator('#activitiesTableBody tr', { hasText: title });
    await row.locator('[data-complete]').click();

    await expect(row).toContainText('Concluída', { timeout: 8000 });
    await expect(row.locator('[data-complete]')).not.toBeVisible({ timeout: 5000 });
  });

  test('filtro por status "Pendente" oculta concluídas', async ({ page }) => {
    await page.selectOption('#filterActStatus', 'pendente');
    await page.click('#applyActFilters');
    await page.waitForTimeout(2000);
    const hasConcluida = await page.locator('#activitiesTableBody').getByText('Concluída').isVisible();
    expect(hasConcluida).toBe(false);
  });

  test('limpar filtros redefine todos os campos', async ({ page }) => {
    await page.selectOption('#filterActStatus', 'concluida');
    await page.fill('#filterActStart', '2026-01-01');
    await page.fill('#filterActEnd', '2026-12-31');
    await page.click('#clearActFilters');
    await page.waitForTimeout(1000);
    expect(await page.locator('#filterActStatus').inputValue()).toBe('');
    expect(await page.locator('#filterActStart').inputValue()).toBe('');
    expect(await page.locator('#filterActEnd').inputValue()).toBe('');
  });

  test('excluir atividade remove da tabela', async ({ page }) => {
    const title = `Manutenção Del ${Date.now()}`;

    await page.click('#newActivityBtn');
    await page.fill('#actTitle', title);
    await page.fill('#actDate', '2026-06-20');
    await page.selectOption('#actTipo', 'Manutenção');
    await page.click('#saveActivityBtn');
    await expect(page.locator('#activityModal')).not.toHaveClass(/open/, { timeout: 10000 });
    await expect(page.locator('#activitiesTableBody')).toContainText(title, { timeout: 8000 });

    const row = page.locator('#activitiesTableBody tr', { hasText: title });
    await row.locator('[data-delete]').click();
    await expect(page.locator('#deleteModal')).toBeVisible();
    await page.click('#confirmDeleteBtn');

    await expect(page.locator('#deleteModal')).not.toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('#activitiesTableBody')).not.toContainText(title, { timeout: 8000 });
  });
});
