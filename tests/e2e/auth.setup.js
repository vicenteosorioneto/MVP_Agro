const { test: setup } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';
const AUTH_FILE = path.join(__dirname, '.auth/user.json');
const CREDS_FILE = path.join(__dirname, '.auth/creds.json');

const runId = Date.now();
const email = `agroflow.pw.${runId}@test.com`;
const password = 'AgroFlow@12345';
const name = `QA Playwright ${runId}`;

setup('criar usuário de teste e autenticar', async ({ request, page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const regRes = await request.post(`${API_URL}/auth/register`, {
    data: { name, email, password },
  });
  if (!regRes.ok()) {
    throw new Error(`Registro falhou: ${regRes.status()} – ${await regRes.text()}`);
  }

  const loginRes = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  if (!loginRes.ok()) {
    throw new Error(`Login falhou: ${loginRes.status()} – ${await loginRes.text()}`);
  }

  const loginBody = await loginRes.json();
  const data = loginBody.data ?? loginBody;
  const token =
    data.token ?? data.accessToken ?? data.access_token ??
    loginBody.token ?? loginBody.accessToken;

  if (!token) throw new Error('Token não retornado pelo servidor.');

  fs.writeFileSync(CREDS_FILE, JSON.stringify({ email, password, name, token, runId }), 'utf-8');

  await page.goto('/index.html');
  await page.evaluate(([tok, usr]) => {
    localStorage.setItem('agro_token', tok);
    localStorage.setItem('agro_user', JSON.stringify({ name: usr }));
  }, [token, name]);

  await page.context().storageState({ path: AUTH_FILE });
});
