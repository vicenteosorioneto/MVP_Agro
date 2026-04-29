import { getDashboard, getProperties, getCultures, getActivities, getFinance } from '../service/api.js';
import { formatCurrency, formatPercent, formatDate, showToast, emptyState } from './utils.js';

const REFRESH_INTERVAL = 5 * 60 * 1000;
let refreshTimer = null;

function navigate(screen, filters = {}) {
  document.dispatchEvent(new CustomEvent('agro:navigate', { detail: { screen, filters } }));
}

export async function loadDashboard() {
  setLoadingKpis(true);
  try {
    const d = await fetchDashboardData();
    renderDashboard(d);
    scheduleAutoRefresh();
  } catch (e) {
    showToast('Erro ao carregar dashboard: ' + e.message);
  } finally {
    setLoadingKpis(false);
  }
}

async function fetchDashboardData() {
  try {
    const raw = await getDashboard();
    const d = raw?.data ?? raw;
    if (d && typeof d === 'object' && d.totalProperties !== undefined) return d;
  } catch {}

  const [propsResult, culturesResult, activitiesResult, financeResult] = await Promise.allSettled([
    getProperties(),
    getCultures(),
    getActivities(),
    getFinance(),
  ]);

  const toArray = (res, key) => Array.isArray(res) ? res : (res?.[key] ?? res?.data ?? []);

  const properties = propsResult.status === 'fulfilled'      ? toArray(propsResult.value,      'properties') : [];
  const cultures   = culturesResult.status === 'fulfilled'   ? toArray(culturesResult.value,   'cultures')   : [];
  const activities = activitiesResult.status === 'fulfilled' ? toArray(activitiesResult.value, 'activities') : [];
  const fin        = financeResult.status === 'fulfilled'    ? (financeResult.value ?? {})                   : {};

  const activeCultures    = cultures.filter(c => ['ativa', 'active', 'plantada'].includes(c.status));
  const pendingActivities = activities.filter(a => ['pendente', 'pending'].includes(a.status));
  const doneActivities    = activities.filter(a => ['concluida', 'concluída', 'done', 'completed'].includes(a.status));
  const lateActivities    = activities.filter(a => {
    if (['atrasada', 'late', 'overdue', 'delayed'].includes(a.status)) return true;
    if (['pendente', 'pending'].includes(a.status) && a.dueDate) {
      return new Date(a.dueDate) < new Date();
    }
    return false;
  });

  const now = new Date();
  const upcomingHarvests = cultures
    .filter(c => c.harvestDate && new Date(c.harvestDate) >= now)
    .sort((a, b) => new Date(a.harvestDate) - new Date(b.harvestDate))
    .slice(0, 5)
    .map(c => ({ ...c, name: c.name || c.cultureName, propertyName: c.propertyName || '' }));

  return {
    totalProperties:   properties.length,
    totalCultures:     cultures.length,
    activeCultures:    activeCultures.length,
    pendingActivities: pendingActivities.length,
    doneActivities:    doneActivities.length,
    lateActivities:    lateActivities.length,
    totalCost:         fin.totalCost         ?? 0,
    expectedRevenue:   fin.expectedRevenue   ?? 0,
    estimatedProfit:   fin.estimatedProfit   ?? 0,
    marginPercent:     fin.marginPercent     ?? 0,
    upcomingHarvests,
  };
}

function renderDashboard(d) {
  set('kpiProps',          d.totalProperties   ?? '-');
  set('kpiCultures',       d.totalCultures     ?? '-');
  set('kpiActiveCultures', d.activeCultures    ?? '-');
  set('kpiPending',        d.pendingActivities ?? '-');
  set('kpiDone',           d.doneActivities    ?? '-');
  set('kpiLate',           d.lateActivities    ?? '-');
  set('kpiCost',           formatCurrency(d.totalCost));
  set('kpiRevenue',        formatCurrency(d.expectedRevenue));
  set('kpiProfit',         formatCurrency(d.estimatedProfit));
  set('kpiMargin',         `Margem: ${formatPercent(d.marginPercent)}`);

  wireKpiNavigation();
  renderActivityChart(d);
  renderHarvests(d.upcomingHarvests);

  const el = document.getElementById('dashLastUpdated');
  if (el) {
    el.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
}

function wireKpiNavigation() {
  const mappings = [
    ['kpiProps',          'properties',  {}],
    ['kpiCultures',       'cultures',    {}],
    ['kpiActiveCultures', 'cultures',    { status: 'ativa' }],
    ['kpiPending',        'activities',  { status: 'pendente' }],
    ['kpiDone',           'activities',  { status: 'concluida' }],
    ['kpiLate',           'activities',  { status: 'atrasada' }],
    ['kpiCost',           'finance',     {}],
    ['kpiRevenue',        'finance',     {}],
    ['kpiProfit',         'finance',     {}],
  ];

  mappings.forEach(([valueId, screen, filters]) => {
    const card = document.getElementById(valueId)?.closest('.kpi-card');
    if (!card) return;
    card.style.cursor = 'pointer';
    card.style.userSelect = 'none';
    card.onclick = () => navigate(screen, filters);
    card.onmouseenter = () => { card.style.transform = 'translateY(-3px)'; card.style.boxShadow = '0 4px 12px rgba(0,0,0,.12)'; };
    card.onmouseleave = () => { card.style.transform = ''; card.style.boxShadow = ''; };
  });
}

function scheduleAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    const screen = document.getElementById('dashboard');
    if (screen?.classList.contains('active')) loadDashboard();
  }, REFRESH_INTERVAL);
}

function setLoadingKpis(on) {
  const ids = ['kpiProps','kpiCultures','kpiActiveCultures','kpiPending','kpiDone','kpiLate','kpiCost','kpiRevenue','kpiProfit'];
  ids.forEach(id => { const el = document.getElementById(id); if (el && on) el.textContent = '...'; });
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderActivityChart(d) {
  const el = document.getElementById('dashActivityChart');
  if (!el) return;
  const total = (d.pendingActivities || 0) + (d.doneActivities || 0) + (d.lateActivities || 0);
  if (!total) { el.innerHTML = emptyState('📋', 'Sem atividades'); return; }

  const bars = [
    { label: 'Pendentes',  val: d.pendingActivities || 0, cls: 'bar-yellow', screen: 'activities', filters: { status: 'pendente' } },
    { label: 'Concluídas', val: d.doneActivities    || 0, cls: '',           screen: 'activities', filters: { status: 'concluida' } },
    { label: 'Atrasadas',  val: d.lateActivities    || 0, cls: 'bar-red',    screen: 'activities', filters: { status: 'atrasada' } },
  ];
  el.innerHTML = bars.map(b => `
    <div class="finance-bar kpi-bar-clickable" data-screen="${b.screen}" data-filters='${JSON.stringify(b.filters)}' style="cursor:pointer;">
      <div class="finance-bar-label"><span>${b.label}</span><span>${b.val}</span></div>
      <div class="finance-bar-track">
        <div class="finance-bar-fill ${b.cls}" style="width:${Math.round((b.val/total)*100)}%"></div>
      </div>
    </div>`).join('');

  el.querySelectorAll('.kpi-bar-clickable').forEach(bar => {
    bar.addEventListener('click', () => {
      const screen = bar.dataset.screen;
      const filters = JSON.parse(bar.dataset.filters || '{}');
      navigate(screen, filters);
    });
    bar.addEventListener('mouseenter', () => bar.style.opacity = '0.85');
    bar.addEventListener('mouseleave', () => bar.style.opacity = '');
  });
}

function renderHarvests(harvests) {
  const el = document.getElementById('dashHarvests');
  if (!el) return;
  if (!harvests?.length) { el.innerHTML = emptyState('🌾', 'Nenhuma colheita próxima'); return; }

  el.innerHTML = harvests.slice(0, 5).map(h => `
    <div class="harvest-row" data-culture-id="${h.id || h._id || ''}" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:8px 6px;border-bottom:1px solid var(--gray-100);border-radius:4px;transition:background .15s;">
      <div>
        <div style="font-weight:600;font-size:.9rem;">${h.name || h.cultureName}</div>
        <div style="font-size:.8rem;color:var(--gray-500);">${h.propertyName || ''}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:.85rem;font-weight:600;color:var(--green-700);">${formatDate(h.harvestDate)}</div>
        <div style="font-size:.75rem;color:var(--gray-400);">ver cultura →</div>
      </div>
    </div>`).join('');

  el.querySelectorAll('.harvest-row').forEach(row => {
    const cultureId = row.dataset.cultureId;
    row.addEventListener('click', () => {
      if (cultureId) navigate('cultures', { highlightId: cultureId });
      else navigate('cultures', {});
    });
    row.addEventListener('mouseenter', () => row.style.background = 'var(--gray-50, #f9fafb)');
    row.addEventListener('mouseleave', () => row.style.background = '');
  });
}
