import { getFinance } from '../service/api.js';
import { showToast, formatCurrency, formatPercent, emptyState } from './utils.js';

export async function loadFinance() {
  try {
    const d = await getFinance();

    setText('finCostTotal',   formatCurrency(d.totalCost));
    setText('finRevTotal',    formatCurrency(d.expectedRevenue));
    setText('finProfitTotal', formatCurrency(d.estimatedProfit));
    setText('finMargin',      formatPercent(d.marginPercent));

    renderByCulture(d.byCulture);
    renderByType(d.byActivityType);
    renderByMonth(d.byMonth);
  } catch (e) {
    showToast('Erro ao carregar financeiro: ' + e.message);
  }
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
    <div class="finance-bar">
      <div class="finance-bar-label">
        <span>${d.cultureName || d.name}</span>
        <span>${formatCurrency(d.cost)}</span>
      </div>
      <div class="finance-bar-track">
        <div class="finance-bar-fill" style="width:${Math.round((d.cost/max)*100)}%"></div>
      </div>
    </div>`).join('');
}

function renderByType(data) {
  const el = document.getElementById('finByType');
  if (!el) return;
  if (!data?.length) { el.innerHTML = emptyState('📊', 'Sem dados'); return; }
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
