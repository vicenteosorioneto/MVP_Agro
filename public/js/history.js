import { getHistory } from '../service/api.js';
import { showToast, emptyState, formatDate, formatCurrency } from './utils.js';

function navigate(screen, filters = {}) {
  document.dispatchEvent(new CustomEvent('agro:navigate', { detail: { screen, filters } }));
}

export async function loadHistory() {
  const el = document.getElementById('historyTimeline');
  if (!el) return;
  el.innerHTML = '<div class="loading-row"><span class="loading-spinner"></span></div>';

  const cultureId = document.getElementById('filterHistCulture')?.value;
  const params = cultureId ? { cultureId } : {};

  try {
    const res = await getHistory(params);
    const groups = Array.isArray(res) ? res : (res.data ?? res.history ?? []);
    renderTimeline(groups);
  } catch (e) {
    el.innerHTML = emptyState('❌', 'Erro ao carregar histórico', e.message);
  }
}

function renderTimeline(groups) {
  const el = document.getElementById('historyTimeline');
  if (!groups.length) {
    el.innerHTML = emptyState('📅', 'Nenhum histórico', 'As atividades registradas aparecerão aqui.');
    return;
  }

  el.innerHTML = '<div class="timeline">' + groups.map(group => {
    const cultureId = group.cultureId || group.id || '';
    const items = (group.activities || group.items || group.timeline || []).map(a => {
      const status = a.status || 'pending';
      const isDone = status === 'completed' || status === 'concluida' || status === 'done';
      const isLate = !isDone && (status === 'delayed' || status === 'atrasada'
                     || (a.date && new Date(a.date) < new Date()));
      const cls = isDone ? 'tl-done' : isLate ? 'tl-late' : '';
      const actId = a.id || a._id || '';
      return `<div class="timeline-item ${cls} tl-clickable" data-act-id="${actId}" data-culture-id="${cultureId}" style="cursor:pointer;border-radius:4px;transition:background .15s;">
        <div>
          <div class="timeline-title">${a.title}</div>
          <div class="timeline-meta">
            ${formatDate(a.date)}
            ${a.assignee ? ' · ' + a.assignee : ''}
            ${a.cost ? ' · ' + formatCurrency(a.cost) : ''}
            ${a.tipo ? ' · <span style="font-size:.78rem;padding:1px 6px;background:var(--gray-100);border-radius:8px;">' + a.tipo + '</span>' : ''}
            ${a.notes ? '<br><em style="font-size:.8rem;">' + a.notes + '</em>' : ''}
            ${a.photoUrl ? ' · <a href="' + a.photoUrl + '" target="_blank" onclick="event.stopPropagation()">📎 Foto</a>' : ''}
          </div>
        </div>
        <div style="font-size:.75rem;color:var(--gray-400);margin-top:4px;">ver atividades →</div>
      </div>`;
    }).join('');

    return `<div class="timeline-group">
      <div class="timeline-group-title">🌾 ${group.cultureName || group.name || 'Sem cultura'}</div>
      ${items || '<p style="color:var(--gray-500);font-size:.9rem;padding:8px 0;">Nenhuma atividade.</p>'}
    </div>`;
  }).join('') + '</div>';

  // Wire click handlers
  el.querySelectorAll('.tl-clickable').forEach(item => {
    const cId = item.dataset.cultureId;
    item.addEventListener('click', () => {
      if (cId) navigate('activities', { cultureId: cId });
      else navigate('activities', {});
    });
    item.addEventListener('mouseenter', () => item.style.background = 'var(--gray-50, #f9fafb)');
    item.addEventListener('mouseleave', () => item.style.background = '');
  });
}

export function populateHistoryCultureFilter(cultures) {
  const sel = document.getElementById('filterHistCulture');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todas as culturas</option>';
  (cultures || []).forEach(c => {
    const o = document.createElement('option');
    o.value = c.id || c._id; o.textContent = c.name;
    sel.appendChild(o);
  });
  sel.value = cur;
}

export function initHistory() {
  document.getElementById('filterHistCulture')?.addEventListener('change', loadHistory);
}
