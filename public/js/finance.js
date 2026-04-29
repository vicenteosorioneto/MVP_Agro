import { getFinance, getActivities, getCultures } from '../service/api.js';
import { showToast, formatCurrency, formatPercent, emptyState } from './utils.js';
import { getPropertiesCache } from './properties.js';

function navigate(screen, filters = {}) {
  document.dispatchEvent(new CustomEvent('agro:navigate', { detail: { screen, filters } }));
}

export async function loadFinance() {
  populateFinancePropertyFilter();
  setFinanceLoading(true);
  try {
    const params = readFinanceFilters();
    const hasFilters = params.startDate || params.endDate || params.propertyId;

    let d;
    if (hasFilters) {
      d = await fetchFinanceFiltered(params);
    } else {
      d = await getFinance();
    }

    setText('finCostTotal',   formatCurrency(d.totalCost));
    setText('finRevTotal',    formatCurrency(d.expectedRevenue));
    setText('finProfitTotal', formatCurrency(d.estimatedProfit));
    setText('finMargin',      formatPercent(d.marginPercent));

    renderByCulture(d.byCulture);
    renderByType(d.byActivityType);
    renderByMonth(d.byMonth);
  } catch (e) {
    showToast('Erro ao carregar financeiro: ' + e.message);
  } finally {
    setFinanceLoading(false);
  }
}

function readFinanceFilters() {
  return {
    propertyId: document.getElementById('filterFinProp')?.value || '',
    startDate:  document.getElementById('filterFinStart')?.value || '',
    endDate:    document.getElementById('filterFinEnd')?.value || '',
  };
}

function populateFinancePropertyFilter() {
  const sel = document.getElementById('filterFinProp');
  if (!sel || sel.options.length > 1) return; // already populated
  const props = getPropertiesCache();
  props.forEach(p => {
    const o = document.createElement('option');
    o.value = p.id || p._id; o.textContent = p.name;
    sel.appendChild(o);
  });
}

async function fetchFinanceFiltered(params) {
  const actParams = {};
  const cultParams = {};
  if (params.startDate)  actParams.startDate  = params.startDate;
  if (params.endDate)    actParams.endDate    = params.endDate;
  if (params.propertyId) {
    actParams.propertyId  = params.propertyId;
    cultParams.propertyId = params.propertyId;
  }

  const [activitiesRes, culturesRes] = await Promise.all([
    getActivities(actParams),
    getCultures(cultParams),
  ]);
  const activities = Array.isArray(activitiesRes) ? activitiesRes : (activitiesRes.data ?? activitiesRes.activities ?? []);
  const cultures   = Array.isArray(culturesRes)   ? culturesRes   : (culturesRes.data   ?? culturesRes.cultures   ?? []);

  return computeFinance(activities, cultures);
}

function computeFinance(activities, cultures) {
  const totalCost     = activities.reduce((s, a) => s + (Number(a.cost) || 0), 0);
  const totalRevenue  = cultures.reduce((s, c) => s + (Number(c.expectedRevenue) || 0), 0);
  const estimatedProfit = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0
    ? Number(((estimatedProfit / totalRevenue) * 100).toFixed(2))
    : 0;

  const byCulture = cultures.map(c => {
    const cost = activities
      .filter(a => a.cultureId === (c.id || c._id))
      .reduce((s, a) => s + (Number(a.cost) || 0), 0);
    return { cultureName: c.name, cultureId: c.id || c._id, cost, expectedRevenue: c.expectedRevenue };
  });

  const monthMap = {};
  activities.forEach(a => {
    const month = a.date ? String(a.date).slice(0, 7) : null;
    if (month) monthMap[month] = (monthMap[month] || 0) + (Number(a.cost) || 0);
  });
  const byMonth = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cost]) => ({ month, cost }));

  const typeMap = {};
  activities.forEach(a => {
    const t = a.tipo || 'Outro';
    typeMap[t] = (typeMap[t] || 0) + (Number(a.cost) || 0);
  });
  const byActivityType = Object.entries(typeMap)
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([type, cost]) => ({ type, cost }));

  return { totalCost, expectedRevenue: totalRevenue, estimatedProfit, marginPercent, byCulture, byMonth, byActivityType };
}

function setFinanceLoading(on) {
  ['finCostTotal','finRevTotal','finProfitTotal','finMargin'].forEach(id => {
    const el = document.getElementById(id);
    if (el && on) el.textContent = '...';
  });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderByCulture(data) {
  const el = document.getElementById('finByCulture');
  if (!el) return;
  if (!data?.length) { el.innerHTML = emptyState('💰', 'Sem dados'); return; }
  const max = Math.max(...data.map(d => d.cost || 0), 1);
  el.innerHTML = data.map(d => `
    <div class="finance-bar fin-culture-bar" data-culture-id="${d.cultureId || ''}" style="cursor:pointer;border-radius:4px;transition:opacity .15s;">
      <div class="finance-bar-label">
        <span>${d.cultureName || d.name}</span>
        <span>${formatCurrency(d.cost)}</span>
      </div>
      <div class="finance-bar-track">
        <div class="finance-bar-fill" style="width:${Math.round((d.cost/max)*100)}%"></div>
      </div>
    </div>`).join('');

  el.querySelectorAll('.fin-culture-bar').forEach(bar => {
    const cultureId = bar.dataset.cultureId;
    bar.addEventListener('click', () => {
      if (cultureId) navigate('cultures', { highlightId: cultureId });
      else navigate('cultures', {});
    });
    bar.addEventListener('mouseenter', () => bar.style.opacity = '0.8');
    bar.addEventListener('mouseleave', () => bar.style.opacity = '');
  });
}

function renderByType(data) {
  const el = document.getElementById('finByType');
  if (!el) return;
  if (!data?.length) { el.innerHTML = emptyState('📊', 'Sem dados — cadastre atividades com tipo definido'); return; }
  const max = Math.max(...data.map(d => d.cost || 0), 1);
  el.innerHTML = data.map(d => `
    <div class="finance-bar">
      <div class="finance-bar-label">
        <span>${d.type || d.activityType}</span>
        <span>${formatCurrency(d.cost)}</span>
      </div>
      <div class="finance-bar-track">
        <div class="finance-bar-fill bar-yellow" style="width:${Math.round((d.cost/max)*100)}%"></div>
      </div>
    </div>`).join('');
}

function renderByMonth(data) {
  const el = document.getElementById('finByMonth');
  if (!el) return;
  if (!data?.length) { el.innerHTML = emptyState('📅', 'Sem dados mensais'); return; }
  const max = Math.max(...data.map(d => d.cost || 0), 1);
  el.innerHTML = `<div style="display:flex;gap:8px;align-items:flex-end;height:140px;padding:8px 0;">` +
    data.map(d => {
      const h = Math.max(Math.round((d.cost/max)*120), 4);
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
        <span style="font-size:.7rem;color:var(--gray-500);">${formatCurrency(d.cost)}</span>
        <div style="width:100%;height:${h}px;background:var(--green-500);border-radius:4px 4px 0 0;"></div>
        <span style="font-size:.72rem;color:var(--gray-500);white-space:nowrap;">${d.month || d.label}</span>
      </div>`;
    }).join('') + `</div>`;
}
