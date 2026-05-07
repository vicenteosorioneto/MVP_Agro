const { test, expect } = require('@playwright/test');

// Sem estado salvo — testa o fluxo de login/logout do zero
test.use({ storageState: { cookies: [], origins: [] } });

const RUN = Date.now();
const EMAIL = `agroflow.auth.ui.${RUN}@test.com`;
const PASSWORD = 'AgroFlow@12345';
const NAME = `Teste Auth ${RUN}`;

test.describe('Autenticação – UI', () => {
  test('exibe formulário de login ao acessar sem token', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#loginView')).toBeVisible();
    await expect(page.locator('#registerView')).toBeHidden();
    await expect(page.locator('#loginBtn')).toBeVisible();
  });

  test('alterna entre login e cadastro', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('#goRegister');
    await expect(page.locator('#registerView')).toBeVisible();
    await expect(page.locator('#loginView')).toBeHidden();
    await page.click('#goLogin');
    await expect(page.locator('#loginView')).toBeVisible();
  });

  test('cadastro de novo usuário exibe toast de sucesso', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('#goRegister');
    await page.fill('#registerForm [name="name"]', NAME);
    await page.fill('#registerForm [name="email"]', EMAIL);
    await page.fill('#registerForm [name="password"]', PASSWORD);
    await page.click('#registerBtn');
    await expect(page.locator('#toast')).toContainText('Conta criada', { timeout: 10000 });
    await expect(page.locator('#loginView')).toBeVisible({ timeout: 5000 });
  });

  test('login com credenciais inválidas exibe erro', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#loginForm [name="email"]', 'invalido@naoexiste.com');
    await page.fill('#loginForm [name="password"]', 'senhaerrada123');
    await page.click('#loginBtn');
    await expect(page.locator('#toast')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/index\.html/);
  });

  test('login válido redireciona para app.html e salva token', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#loginForm [name="email"]', EMAIL);
    await page.fill('#loginForm [name="password"]', PASSWORD);
    await page.click('#loginBtn');
    await page.waitForURL('**/app.html', { timeout: 15000 });
    const token = await page.evaluate(() => localStorage.getItem('agro_token'));
    expect(token).toBeTruthy();
    expect(token).not.toBe('null');
  });

  test('sessão persiste após recarregar a página (F5)', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#loginForm [name="email"]', EMAIL);
    await page.fill('#loginForm [name="password"]', PASSWORD);
    await page.click('#loginBtn');
    await page.waitForURL('**/app.html', { timeout: 15000 });
    await page.reload();
    await expect(page).toHaveURL(/app\.html/);
    await expect(page.locator('#dashboard')).toBeVisible();
  });

  test('logout limpa token e redireciona para login', async ({ page }) => {
    await page.goto('/index.html');
    await page.fill('#loginForm [name="email"]', EMAIL);
    await page.fill('#loginForm [name="password"]', PASSWORD);
    await page.click('#loginBtn');
    await page.waitForURL('**/app.html', { timeout: 15000 });
    await page.click('#logoutBtn');
    await page.waitForURL('**/index.html', { timeout: 8000 });
    const token = await page.evaluate(() => localStorage.getItem('agro_token'));
    expect(token).toBeNull();
  });

  test('acesso direto a app.html sem token redireciona para login', async ({ page }) => {
    await page.goto('/app.html');
    await page.waitForURL('**/index.html', { timeout: 8000 });
  });
});
