import { getCurrentUser, logout } from '../service/api.js';
import { loadDashboard }  from './dashboard.js';
import { loadProperties, initProperties, getPropertiesCache } from './properties.js';
import { loadCultures, initCultures, getCulturesCache, populatePropertyFilter, setHighlight } from './cultures.js';
import { loadActivities, initActivities, populateActivityFilters } from './activities.js';
import { loadFinance }    from './finance.js';
import { loadAlerts, initAlerts } from './alerts.js';
import { loadHistory, initHistory, populateHistoryCultureFilter } from './history.js';
import { initReports }    from './reports.js';
import { closeModal }     from './utils.js';

// ── Auth guard ──────────────────────────────────────────────────────────────
const DEV_BYPASS = false;
const token = localStorage.getItem('agro_token');
if (!DEV_BYPASS && !token) { window.location.href = '/index.html'; }

// ── User display ────────────────────────────────────────────────────────────
const user = getCurrentUser();
if (user && !user._tokenOnly) {
  const name = user.name || user.email || 'Usuário';
  document.getElementById('userName').textContent = name;
  document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();

  const roleEl = document.getElementById('userRole');
  if (roleEl && user.role) {
    const roleMap = { admin: 'Administrador', tecnico: 'Técnico', user: 'Produtor rural', produtor: 'Produtor rural' };
    roleEl.textContent = roleMap[user.role] || user.role;
  }
}

document.getElementById('logoutBtn')?.addEventListener('click', logout);

// ── Screen navigation ───────────────────────────────────────────────────────
const SCREEN_TITLES = {
  dashboard:  'Dashboard',
  properties: 'Propriedades Rurais',
  cultures:   'Culturas',
  activities: 'Atividades',
  finance:    'Financeiro',
  history:    'Histórico',
  alerts:     'Alertas',
  reports:    'Relatórios',
};

let currentScreen = 'dashboard';

function applyPreFilters(screenId, filters) {
  if (!filters || !Object.keys(filters).length) return;

  if (screenId === 'activities') {
    ['filterActStatus', 'filterActCulture', 'filterActProp', 'filterActStart', 'filterActEnd']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    if (filters.status !== undefined) {
      const el = document.getElementById('filterActStatus');
      if (el) el.value = filters.status;
    }
    if (filters.cultureId !== undefined) {
      const el = document.getElementById('filterActCulture');
      if (el) el.value = filters.cultureId;
    }
  }

  if (screenId === 'cultures') {
    if (filters.status !== undefined) {
      const el = document.getElementById('filterCultureStatus');
      if (el) el.value = filters.status;
    }
    if (filters.highlightId) {
      setHighlight(filters.highlightId);
    }
  }
}

function showScreen(id, preFilters = {}) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const screen = document.getElementById(id);
  if (screen) screen.classList.add('active');

  const navItem = document.querySelector(`.nav-item[data-screen="${id}"]`);
  if (navItem) navItem.classList.add('active');

  const titleEl = document.getElementById('headerTitle');
  if (titleEl) titleEl.textContent = SCREEN_TITLES[id] || id;

  closeSidebar();
  currentScreen = id;

  applyPreFilters(id, preFilters);
  loadScreen(id);
}

async function loadScreen(id) {
  const props    = getPropertiesCache();
  const cultures = getCulturesCache();

  switch (id) {
    case 'dashboard':  loadDashboard(); break;
    case 'properties': loadProperties(); break;
    case 'cultures':   loadCultures(); break;
    case 'activities': loadActivities(); break;
    case 'finance':    loadFinance(); break;
    case 'history':    loadHistory(); break;
    case 'alerts':     loadAlerts(); break;
    case 'reports':    break;
  }
}

document.querySelectorAll('.nav-item[data-screen]').forEach(item => {
  item.addEventListener('click', () => showScreen(item.dataset.screen));
});

// ── Cross-module navigation via custom event ─────────────────────────────────
document.addEventListener('agro:navigate', (e) => {
  const { screen, filters = {} } = e.detail || {};
  if (screen) showScreen(screen, filters);
});

// ── Sidebar mobile ──────────────────────────────────────────────────────────
const sidebar  = document.getElementById('sidebar');
const overlay  = document.getElementById('sidebarOverlay');
const menuBtn  = document.getElementById('menuBtn');

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
}

menuBtn?.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
});
overlay?.addEventListener('click', closeSidebar);

// ── Modal close on overlay click ────────────────────────────────────────────
document.querySelectorAll('.modal-overlay').forEach(mo => {
  mo.addEventListener('click', e => { if (e.target === mo) mo.classList.remove('open'); });
});
document.getElementById('cancelDeleteModal')?.addEventListener('click', () => closeModal('deleteModal'));

// ── Dashboard refresh button ─────────────────────────────────────────────────
document.getElementById('dashRefreshBtn')?.addEventListener('click', async () => {
  await Promise.all([loadProperties(), loadCultures()]);
  populatePropertyFilter(getPropertiesCache());
  populateActivityFilters(getCulturesCache(), getPropertiesCache());
  populateHistoryCultureFilter(getCulturesCache());
  loadDashboard();
});

document.getElementById('financeRefreshBtn')?.addEventListener('click', loadFinance);
document.getElementById('applyFinFilters')?.addEventListener('click', loadFinance);
document.getElementById('clearFinFilters')?.addEventListener('click', () => {
  ['filterFinProp', 'filterFinStart', 'filterFinEnd'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  loadFinance();
});

// ── Init all modules ─────────────────────────────────────────────────────────
async function init() {
  await Promise.all([loadProperties(), loadCultures()]);

  const props    = getPropertiesCache();
  const cultures = getCulturesCache();

  initProperties();
  initCultures();
  initActivities(cultures, props);
  initAlerts();
  initHistory();
  initReports(cultures, props);

  populatePropertyFilter(props);
  populateActivityFilters(cultures, props);
  populateHistoryCultureFilter(cultures);

  loadDashboard();
  loadAlerts(); // badge on sidebar
}

init();
