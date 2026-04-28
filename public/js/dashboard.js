import { getDashboard } from '../service/api.js';
import { formatCurrency, formatPercent, formatDate, showToast, emptyState } from './utils.js';

export async function loadDashboard() {
  try {
    const d = await getDashboard();

    set('kpiProps',           d.totalProperties ?? '-');
    set('kpiCultures',        d.totalCultures ?? '-');
    set('kpiActiveCultures',  d.activeCultures ?? '-');
    set('kpiPending',         d.pendingActivities ?? '-');
    set('kpiDone',            d.doneActivities ?? '-');
    set('kpiLate',            d.lateActivities ?? '-');
    set('kpiCost',            formatCurrency(d.totalCost));
    set('kpiRevenue',         formatCurrency(d.expectedRevenue));
    set('kpiProfit',          formatCurrency(d.estimatedProfit));
    set('kpiMargin',          `Margem: ${formatPercent(d.marginPercent)}`);

    renderActivityChart(d);
    renderHarvests(d.upcomingHarvests);
  } catch (e) {
    showToast('Erro ao carregar dashboard: ' + e.message);
  }
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
    { label: 'Pendentes',  val: d.pendingActivities || 0, cls: 'bar-yellow' },
    { label: 'Concluídas', val: d.doneActivities || 0,    cls: '' },
    { label: 'Atrasadas',  val: d.lateActivities || 0,    cls: 'bar-red' },
  ];
  el.innerHTML = bars.map(b => `
    <div class="finance-bar">
      <div class="finance-bar-label"><span>${b.label}</span><span>${b.val}</span></div>
      <div class="finance-bar-track">
        <div class="finance-bar-fill ${b.cls}" style="width:${Math.round((b.val/total)*100)}%"></div>
      </div>
    </div>`).join('');
}

function renderHarvests(harvests) {
  const el = document.getElementById('dashHarvests');
  if (!el) return;
  if (!harvests?.length) { el.innerHTML = emptyState('🌾', 'Nenhuma colheita próxima'); return; }
  el.innerHTML = harvests.slice(0, 5).map(h => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gray-100);">
      <div>
        <div style="font-weight:600;font-size:.9rem;">${h.name || h.cultureName}</div>
        <div style="font-size:.8rem;color:var(--gray-500);">${h.propertyName || ''}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:.85rem;font-weight:600;color:var(--green-700);">${formatDate(h.harvestDate)}</div>
      </div>
    </div>`).join('');
}
