import { getAlerts, generateAlerts, markAlertAsRead, deleteAlert } from '../service/api.js';
import { showToast, emptyState, formatDate } from './utils.js';

const TYPE_MAP = {
  late_activity:        { icon: '⏰', cls: 'alert-red',    label: 'Atividade atrasada' },
  harvest_soon:         { icon: '🌾', cls: 'alert-yellow', label: 'Colheita próxima' },
  rain_forecast:        { icon: '🌧️',  cls: '',             label: 'Chuva prevista' },
  high_cost:            { icon: '💸', cls: 'alert-red',    label: 'Custo alto' },
  culture_no_activity:  { icon: '🌱', cls: 'alert-yellow', label: 'Cultura sem atividade' },
  activity_no_assignee: { icon: '👤', cls: 'alert-yellow', label: 'Sem responsável' },
};

export async function loadAlerts() {
  const el = document.getElementById('alertsList');
  if (!el) return;
  el.innerHTML = '<div class="loading-row"><span class="loading-spinner"></span></div>';
  try {
    const res = await getAlerts();
    const alerts = Array.isArray(res) ? res : (res.data ?? res.alerts ?? []);
    renderAlerts(alerts);
    updateBadge(alerts.filter(a => !a.read).length);
  } catch (e) {
    el.innerHTML = emptyState('❌', 'Erro ao carregar alertas', e.message);
  }
}

function renderAlerts(alerts) {
  const el = document.getElementById('alertsList');
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

export function initAlerts() {
  document.getElementById('generateAlertsBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('generateAlertsBtn');
    btn.disabled = true; btn.textContent = 'Gerando...';
    try {
      await generateAlerts();
      showToast('Alertas gerados!', 'success');
      loadAlerts();
    } catch (e) { showToast('Erro: ' + e.message); }
    finally { btn.disabled = false; btn.textContent = '⚡ Gerar alertas'; }
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
