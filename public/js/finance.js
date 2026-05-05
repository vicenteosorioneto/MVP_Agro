import { getFinance, getActivities, getCultures, extractData } from '../service/api.js';
import { showToast, formatCurrency, formatPercent, emptyState } from './utils.js';
import { getPropertiesCache } from './properties.js';

function navigate(screen, filters = {}) {
  document.dispatchEvent(new CustomEvent('agro:navigate', { detail: { screen, filters } }));
}

export async function loadFinance() {
  populateFinancePropertyFilter();
  setFinanceLoading(true);
  try {
    const params   = readFinanceFilters();
    const hasFilters = !!(params.propertyId || params.startDate || params.endDate);

    let d;
    if (hasFilters) {
      // Tenta endpoint /finance?params= primeiro; faz fallback local se não tiver breakdown
      try {
        const raw = await getFinance(params);
        const candidate = extractData(raw) ?? {};
        // Usa a resposta do backend se tiver os dados computados de breakdown
        if (candidate.byCulture || candidate.byActivityType || candidate.byMonth) {
          d = candidate;
        }
      } catch {}

      // Fallback: calcula manualmente buscando activities + cultures filtrados
      if (!d) d = await fetchFinanceFiltered(params);
    } else {
      const raw = await getFinance();
      d = extractData(raw) ?? {};
      // Se o endpoint não retornar breakdown, calcula localmente
      if (!d.byCulture && !d.byActivityType && !d.byMonth) {
        d = await fetchFinanceFiltered({});
      }
    }

    setText('finCostTotal',   formatCurrency(d.totalCost       ?? 0));
    setText('finRevTotal',    formatCurrency(d.expectedRevenue ?? 0));
    setText('finProfitTotal', formatCurrency(d.estimatedProfit ?? 0));
    setText('finMargin',      formatPercent(d.marginPercent    ?? 0));

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
    propertyId: document.getElementById('filterFinProp')?.value  || '',
    startDate:  document.getElementById('filterFinStart')?.value || '',
    endDate:    document.getElementById('filterFinEnd')?.value   || '',
  };
}

function populateFinancePropertyFilter() {
  const sel = document.getElementById('filterFinProp');
  if (!sel) return;
  const props = getPropertiesCache();
  if (!props.length) return; // ainda não carregou — reabre na próxima chamada

  const currentVal = sel.value; // preserva seleção atual
  sel.innerHTML = '<option value="">Todas</option>';
  props.forEach(p => {
    const o = document.createElement('option');
    o.value = p.id || p._id;
    o.textContent = p.name;
    sel.appendChild(o);
  });
  if (currentVal) sel.value = currentVal; // restaura seleção
}

// Normaliza onde o propertyId pode estar em um objeto da API
function resolvePropertyId(item) {
  return item?.propertyId
      || item?.property?._id
      || item?.property?.id
      || '';
}

// Normaliza onde o cultureId pode estar em uma atividade
function resolveCultureId(item) {
  return item?.cultureId
      || item?.culture?._id
      || item?.culture?.id
      || '';
}

async function fetchFinanceFiltered(params) {
  const actParams  = {};
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

  // extractData cobre { success, data: [...] } e array direto
  let activities = extractData(activitiesRes, 'activities');
  let cultures   = extractData(culturesRes,   'cultures');
  if (!Array.isArray(activities)) activities = [];
  if (!Array.isArray(cultures))   cultures   = [];

  // Filtro client-side por propertyId como rede de segurança
  // (garante resultado correto mesmo se o backend ignorar o query param)
  if (params.propertyId) {
    const pid = String(params.propertyId);

    cultures = cultures.filter(c => String(resolvePropertyId(c)) === pid);

    // Para atividades: usa propertyId direto OU verifica se a cultura pertence à propriedade
    const cultureIds = new Set(cultures.map(c => String(c.id || c._id || '')));
    activities = activities.filter(a => {
      if (String(resolvePropertyId(a)) === pid) return true;
      const actCultureId = String(resolveCultureId(a));
      return actCultureId !== '' && cultureIds.has(actCultureId);
    });
  }

  return computeFinance(activities, cultures);
}

function computeFinance(activities, cultures) {
  const totalCost       = activities.reduce((s, a) => s + (Number(a.cost) || 0), 0);
  const totalRevenue    = cultures.reduce((s, c) => s + (Number(c.expectedRevenue) || 0), 0);
  const estimatedProfit = totalRevenue - totalCost;
  const marginPercent   = totalRevenue > 0
    ? Number(((estimatedProfit / totalRevenue) * 100).toFixed(2))
    : 0;

  const byCulture = cultures.map(c => {
    const cid = String(c.id || c._id || '');
    const cost = activities
      .filter(a => {
        const aCultureId = String(resolveCultureId(a));
        return aCultureId !== '' && aCultureId === cid;
      })
      .reduce((s, a) => s + (Number(a.cost) || 0), 0);
    return {
      cultureName:     c.name,
      cultureId:       cid,
      cost,
      expectedRevenue: Number(c.expectedRevenue) || 0,
    };
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
    const t = a.tipo || a.type || 'Outro';
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
  if (!data?.length) { el.innerHTML = emptyState('💰', 'Sem dados para esta seleção'); return; }
  const max = Math.max(...data.map(d => d.cost || 0), 1);
  el.innerHTML = data.map(d => `
    <div class="finance-bar fin-culture-bar" data-culture-id="${d.cultureId || ''}" style="cursor:pointer;border-radius:4px;transition:opacity .15s;">
      <div class="finance-bar-label">
        <span>${d.cultureName || d.name}</span>
        <span>${formatCurrency(d.cost)}</span>
      </div>
      <div class="finance-bar-track">
        <div class="finance-bar-fill" style="width:${Math.round((d.cost / max) * 100)}%"></div>
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
        <div class="finance-bar-fill bar-yellow" style="width:${Math.round((d.cost / max) * 100)}%"></div>
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
      const h = Math.max(Math.round((d.cost / max) * 120), 4);
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
        <span style="font-size:.7rem;color:var(--gray-500);">${formatCurrency(d.cost)}</span>
        <div style="width:100%;height:${h}px;background:var(--green-500);border-radius:4px 4px 0 0;"></div>
        <span style="font-size:.72rem;color:var(--gray-500);white-space:nowrap;">${d.month || d.label}</span>
      </div>`;
    }).join('') + `</div>`;
}
