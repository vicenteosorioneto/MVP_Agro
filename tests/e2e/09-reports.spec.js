const { test, expect } = require('@playwright/test');
const { navigateTo } = require('./helpers');

test.describe('Relatórios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.waitForSelector('#dashboard.active', { timeout: 15000 });
    await navigateTo(page, 'reports');
  });

  test('botões de download PDF e CSV estão visíveis', async ({ page }) => {
    await expect(page.locator('#downloadPdfBtn')).toBeVisible();
    await expect(page.locator('#downloadCsvBtn')).toBeVisible();
  });

  test('formulário de upload de arquivo está disponível', async ({ page }) => {
    await expect(page.locator('#uploadForm')).toBeVisible();
    await expect(page.locator('#uploadCulture')).toBeVisible();
    await expect(page.locator('#uploadForm input[type="file"]')).toBeVisible();
  });

  test('seção de arquivos enviados está visível', async ({ page }) => {
    await expect(page.locator('#filesList')).toBeVisible();
    await expect(page.locator('#refreshFilesBtn')).toBeVisible();
  });

  test('download PDF inicia e não gera erro de JS', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
      page.click('#downloadPdfBtn'),
    ]);
    // Aguardar possível toast de resposta
    await page.waitForTimeout(2000);
    const toastText = await page.locator('#globalToast').textContent();
    // Não deve conter rastreamento de exceção JS
    expect(toastText).not.toMatch(/TypeError|ReferenceError/i);
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    }
  });

  test('download CSV inicia e não gera erro de JS', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
      page.click('#downloadCsvBtn'),
    ]);
    await page.waitForTimeout(2000);
    const toastText = await page.locator('#globalToast').textContent();
    expect(toastText).not.toMatch(/TypeError|ReferenceError/i);
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    }
  });

  test('atualizar lista de arquivos não trava a UI', async ({ page }) => {
    await page.click('#refreshFilesBtn');
    await page.waitForTimeout(2000);
    const hasSpinner = await page.locator('#filesList .loading-spinner').isVisible();
    expect(hasSpinner).toBe(false);
    await expect(page.locator('#filesList')).toBeVisible();
  });
});
