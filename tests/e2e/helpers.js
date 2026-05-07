const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';
const CREDS_FILE = path.join(__dirname, '.auth/creds.json');

function getCreds() {
  return JSON.parse(fs.readFileSync(CREDS_FILE, 'utf-8'));
}

function authHeaders() {
  return { Authorization: `Bearer ${getCreds().token}` };
}

async function apiPost(request, endpoint, body) {
  const res = await request.post(`${API_URL}${endpoint}`, {
    data: body,
    headers: authHeaders(),
  });
  if (!res.ok()) {
    throw new Error(`POST ${endpoint} → ${res.status()}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

async function apiDelete(request, endpoint) {
  return request.delete(`${API_URL}${endpoint}`, { headers: authHeaders() });
}

function extractId(data) {
  const id = data?.id ?? data?._id;
  return id != null ? String(id) : null;
}

async function createTestProperty(request) {
  const { runId } = getCreds();
  const data = await apiPost(request, '/properties', {
    name: `Fazenda PW ${runId}`,
    hectares: 100,
    city: 'Ribeirão Preto',
    state: 'SP',
    productionType: 'Soja',
    notes: 'Criado por Playwright',
  });
  const id = extractId(data);
  if (!id) throw new Error('createTestProperty: id não retornado pela API');
  return id;
}

async function createTestCulture(request, propertyId) {
  const { runId } = getCreds();
  const data = await apiPost(request, '/cultures', {
    name: `Soja PW ${runId}`,
    propertyId,
    plantingDate: '2026-05-01',
    harvestDate: '2026-09-01',
    status: 'active',
    area: 50,
    expectedRevenue: 25000,
    notes: 'Criado por Playwright',
  });
  const id = extractId(data);
  if (!id) throw new Error('createTestCulture: id não retornado pela API');
  return id;
}

async function createTestActivity(request, cultureId, propertyId) {
  const data = await apiPost(request, '/activities', {
    title: 'Adubação PW Setup',
    date: '2026-05-15',
    assignee: 'QA Playwright',
    status: 'pending',
    cost: 500,
    notes: 'Criado por Playwright',
    tipo: 'Adubação',
    cultureId,
    propertyId,
  });
  const id = extractId(data);
  if (!id) throw new Error('createTestActivity: id não retornado pela API');
  return id;
}

async function navigateTo(page, screen) {
  // Wait for the app to finish loading its core data (properties + cultures)
  // before navigating.  The attribute is set in js/app.js after the first
  // Promise.all([loadProperties, loadCultures]) resolves.
  await page.waitForSelector('body[data-app-ready]', { timeout: 15000 });
  await page.click(`.nav-item[data-screen="${screen}"]`);
  await page.waitForSelector(`#${screen}.active`, { timeout: 8000 });
}

module.exports = {
  getCreds,
  apiPost,
  apiDelete,
  createTestProperty,
  createTestCulture,
  createTestActivity,
  navigateTo,
};
