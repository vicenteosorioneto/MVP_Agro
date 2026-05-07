const { test, expect } = require('@playwright/test');
const { navigateTo } = require('./helpers');

test.describe('Propriedades', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.waitForSelector('#dashboard.active', { timeout: 15000 });
    await navigateTo(page, 'properties');
  });

  test('exibe tabela e botão de nova propriedade', async ({ page }) => {
    await expect(page.locator('#propertiesTableBody')).toBeVisible();
    await expect(page.locator('#newPropertyBtn')).toBeVisible();
  });

  test('criar propriedade válida aparece na tabela', async ({ page }) => {
    const name = `Fazenda UI ${Date.now()}`;

    await page.click('#newPropertyBtn');
    await expect(page.locator('#propertyModal')).toBeVisible();

    await page.fill('#propName', name);
    await page.fill('#propHectares', '120');
    await page.fill('#propCity', 'Campinas');
    await page.selectOption('#propState', 'SP');
    await page.fill('#propType', 'Milho');
    await page.click('#savePropertyBtn');

    await expect(page.locator('#propertyModal')).not.toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('#propertiesTableBody')).toContainText(name, { timeout: 8000 });
  });

  test('validação: nome obrigatório bloqueia salvamento e exibe erro', async ({ page }) => {
    await page.click('#newPropertyBtn');
    await expect(page.locator('#propertyModal')).toBeVisible();
    await page.fill('#propHectares', '50');
    // Não preenche nome
    await page.click('#savePropertyBtn');
    await page.waitForTimeout(500);
    await expect(page.locator('#propertyModal')).toBeVisible();
    await expect(page.locator('.field-error-msg')).toBeVisible();
  });

  test('cancelar modal fecha sem salvar', async ({ page }) => {
    const name = `Fazenda Cancelada ${Date.now()}`;
    await page.click('#newPropertyBtn');
    await page.fill('#propName', name);
    await page.click('#cancelPropertyModal');
    await expect(page.locator('#propertyModal')).not.toHaveClass(/open/, { timeout: 5000 });
    await expect(page.locator('#propertiesTableBody')).not.toContainText(name);
  });

  test('editar propriedade atualiza dados na tabela', async ({ page }) => {
    const original = `Fazenda Edit ${Date.now()}`;
    const updated  = `Fazenda Editada ${Date.now()}`;

    await page.click('#newPropertyBtn');
    await page.fill('#propName', original);
    await page.fill('#propHectares', '80');
    await page.click('#savePropertyBtn');
    await expect(page.locator('#propertyModal')).not.toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('#propertiesTableBody')).toContainText(original, { timeout: 8000 });

    const row = page.locator('#propertiesTableBody tr', { hasText: original });
    await row.locator('[data-edit]').click();
    await expect(page.locator('#propertyModal')).toBeVisible();
    await page.fill('#propName', updated);
    await page.click('#savePropertyBtn');

    await expect(page.locator('#propertyModal')).not.toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('#propertiesTableBody')).toContainText(updated, { timeout: 8000 });
    await expect(page.locator('#propertiesTableBody')).not.toContainText(original);
  });

  test('excluir propriedade remove da tabela', async ({ page }) => {
    const name = `Fazenda Del ${Date.now()}`;

    await page.click('#newPropertyBtn');
    await page.fill('#propName', name);
    await page.fill('#propHectares', '60');
    await page.click('#savePropertyBtn');
    await expect(page.locator('#propertyModal')).not.toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('#propertiesTableBody')).toContainText(name, { timeout: 8000 });

    const row = page.locator('#propertiesTableBody tr', { hasText: name });
    await row.locator('[data-delete]').click();
    await expect(page.locator('#deleteModal')).toBeVisible();
    await page.click('#confirmDeleteBtn');

    await expect(page.locator('#deleteModal')).not.toHaveClass(/open/, { timeout: 8000 });
    await expect(page.locator('#propertiesTableBody')).not.toContainText(name, { timeout: 8000 });
  });
});
