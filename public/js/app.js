import { getCurrentUser, logout } from '../service/api.js';
import { loadDashboard }  from './dashboard.js';
import { loadProperties, initProperties, getPropertiesCache } from './properties.js';
import { loadCultures, initCultures, getCulturesCache, populatePropertyFilter } from './cultures.js';
import { loadActivities, initActivities, populateActivityFilters } from './activities.js';
import { loadFinance }    from './finance.js';
import { loadAlerts, initAlerts } from './alerts.js';
import { loadHistory, initHistory, populateHistoryCultureFilter } from './history.js';
import { initReports }    from './reports.js';
import { closeModal }     from './utils.js';

// ── Auth guard ──────────────────────────────────────────────────────────────
// Para desativar temporariamente (sem backend de auth), mude para: const DEV_BYPASS = true;
const DEV_BYPASS = false;
const user = getCurrentUser();
if (!DEV_BYPASS && !user) { window.location.href = '/index.html'; }

// ── User display ────────────────────────────────────────────────────────────
if (user) {
  const name = user.name || user.email || 'Usuário';
  document.getElementById('userName').textContent = name;
  document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
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

function showScreen(id) {
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
document.getElementById('dashRefreshBtn')?.addEventListener('click', () => {
  Promise.all([loadProperties(), loadCultures()]).then(() => {
    populatePropertyFilter(getPropertiesCache());
    populateActivityFilters(getCulturesCache(), getPropertiesCache());
    populateHistoryCultureFilter(getCulturesCache());
  });
  loadDashboard();
});

document.getElementById('financeRefreshBtn')?.addEventListener('click', loadFinance);

// ── Init all modules ─────────────────────────────────────────────────────────
async function init() {
  // Load base data first so selects are populated
  await Promise.all([loadProperties(), loadCultures()]);

  const props    = getPropertiesCache();
  const cultures = getCulturesCache();

  // Wire up modules
  initProperties();
  initCultures(props);
  initActivities(cultures, props);
  initAlerts();
  initHistory();
  initReports();

  // Populate cross-module filters
  populatePropertyFilter(props);
  populateActivityFilters(cultures, props);
  populateHistoryCultureFilter(cultures);

  // Load active screen
  loadDashboard();
  loadAlerts(); // to show badge on sidebar
}

init();
