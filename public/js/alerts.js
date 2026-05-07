import { getAlerts, generateAlerts, markAlertAsRead, markAllAlertsRead, deleteAlert } from '../service/api.js';
import { showToast, emptyState, formatDate, setLoading } from './utils.js';

const TYPE_MAP = {
  late_activity:        { icon: '⏰', cls: 'alert-red',    label: 'Atividade atrasada' },
  harvest_soon:         { icon: '🌾', cls: 'alert-yellow', label: 'Colheita próxima' },
  rain_forecast:        { icon: '🌧️',  cls: '',             label: 'Chuva prevista' },
  high_cost:            { icon: '💸', cls: 'alert-red',    label: 'Custo alto' },
  culture_no_activity:  { icon: '🌱', cls: 'alert-yellow', label: 'Cultura sem atividade' },
  activity_no_assignee: { icon: '👤', cls: 'alert-yellow', label: 'Sem responsável' },
};

let alertsCache = [];

function extractAlerts(res) {
  if (Array.isArray(res)) return res;
  const inner = res?.data ?? res?.alerts ?? res;
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(inner?.data)) return inner.data;
  if (Array.isArray(inner?.alerts)) return inner.alerts;
  return [];
}

export async function loadAlerts() {
  const el = document.getElementById('alertsList');
  if (!el) return;
  el.innerHTML = '<div class="loading-row"><span class="loading-spinner"></span></div>';
  try {
    const res = await getAlerts();
    alertsCache = extractAlerts(res);
    renderAlerts(alertsCache);
    updateBadge(alertsCache.filter(a => !a.read).length);
    updateMarkAllBtn(alertsCache);
  } catch (e) {
    el.innerHTML = emptyState('❌', 'Erro ao carregar alertas', e.message);
  }
}

function renderAlerts(alerts) {
  const el = document.getElementById('alertsList');
  if (!Array.isArray(alerts)) alerts = [];
  if (!alerts.length) {
    el.innerHTML = emptyState('🔔', 'Nenhum alerta', 'Tudo certo por aqui!');
    return;
  }
  el.innerHTML = alerts.map(a => {
    const meta = TYPE_MAP[a.type] || { icon: '🔔', cls: '', label: a.type || 'Alerta' };
    const unread = !a.read ? 'unread' : '';
    return `<div class="alert-item ${meta.cls} ${unread}" data-id="${a.id || a._id}">
      <div class="alert-icon">${meta.icon}</div>
      <div class="alert-body">
        <div class="alert-title">${a.title || meta.label}</div>
        <div class="alert-desc">${a.description || a.message || ''}</div>
        <div class="alert-date">${formatDate(a.createdAt || a.date)}</div>
      </div>
      <div class="alert-actions">
        ${!a.read ? `<button class="btn btn-success btn-sm" data-read="${a.id || a._id}">Lido</button>` : ''}
        <button class="btn btn-danger btn-sm" data-del="${a.id || a._id}">✕</button>
      </div>
    </div>`;
  }).join('');
}

function updateBadge(count) {
  const badge = document.getElementById('alertsBadge');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? '' : 'none';
}

function updateMarkAllBtn(alerts) {
  // Keep the button always visible — it handles gracefully when there is
  // nothing to mark (shows a toast). Hiding it based on unread count
  // breaks the test that expects the button to be present on page load.
  const btn = document.getElementById('markAllReadBtn');
  if (btn) btn.style.display = '';
}

export function initAlerts() {
  document.getElementById('generateAlertsBtn')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    setLoading(btn, true, 'Gerando...');
    try {
      const res = await generateAlerts();
      const count = res?.data?.length ?? res?.count ?? null;
      showToast(count != null ? `${count} alerta(s) gerado(s)!` : 'Alertas gerados!', 'success');
      loadAlerts();
    } catch (e) { showToast('Erro: ' + e.message); }
    finally { setLoading(btn, false, '⚡ Gerar alertas'); }
  });

  document.getElementById('markAllReadBtn')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    const unread = (Array.isArray(alertsCache) ? alertsCache : []).filter(a => !a.read);
    if (!unread.length) { showToast('Nenhum alerta não lido.', 'success'); return; }

    setLoading(btn, true, 'Marcando...');
    try {
      // Tenta endpoint bulk; se não existir, cai no fallback individual
      try {
        await markAllAlertsRead();
      } catch {
        await Promise.all(unread.map(a => markAlertAsRead(a.id || a._id)));
      }
      showToast(`${unread.length} alerta(s) marcado(s) como lido.`, 'success');
      loadAlerts();
    } catch (e) { showToast('Erro: ' + e.message); }
    finally { setLoading(btn, false, '✓ Marcar todos como lido'); }
  });

  document.getElementById('alertsList')?.addEventListener('click', async e => {
    const readId = e.target.dataset.read;
    const delId  = e.target.dataset.del;
    if (readId) {
      try { await markAlertAsRead(readId); loadAlerts(); }
      catch (err) { showToast('Erro: ' + err.message); }
    }
    if (delId) {
      try { await deleteAlert(delId); showToast('Alerta excluído.', 'success'); loadAlerts(); }
      catch (err) { showToast('Erro: ' + err.message); }
    }
  });
}
