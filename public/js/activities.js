import { getActivities, createActivity, updateActivity, deleteActivity, completeActivity } from '../service/api.js';
import { showToast, emptyState, confirmDelete, openModal, closeModal, formatDate, formatCurrency, statusBadge, setLoading, setFieldError, clearFieldErrors } from './utils.js';
import { getCulturesCache } from './cultures.js';

let activities = [];

// Mapeia status EN (vindo da API) → valor do select PT no HTML
const STATUS_TO_SELECT = { completed: 'concluida', pending: 'pendente', delayed: 'pendente' };

export async function loadActivities() {
  const tbody = document.getElementById('activitiesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="loading-row"><span class="loading-spinner"></span></td></tr>';

  const params = {};
  const status = document.getElementById('filterActStatus')?.value;
  const culture = document.getElementById('filterActCulture')?.value;
  const prop   = document.getElementById('filterActProp')?.value;
  const start  = document.getElementById('filterActStart')?.value;
  const end    = document.getElementById('filterActEnd')?.value;
  if (status)  params.status     = status;
  if (culture) params.cultureId  = culture;
  if (prop)    params.propertyId = prop;
  if (start)   params.startDate  = start;
  if (end)     params.endDate    = end;

  try {
    const res = await getActivities(params);
    activities = Array.isArray(res) ? res : (res.data ?? res.activities ?? []);
    renderTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyState('❌', 'Erro ao carregar', e.message)}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('activitiesTableBody');
  if (!activities.length) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyState('📋', 'Nenhuma atividade', 'Registre a primeira atividade da safra.', '+ Nova atividade', 'newActivity')}</td></tr>`;
    return;
  }
  tbody.innerHTML = activities.map(a => {
    // API já retorna status computado: 'pending' | 'completed' | 'delayed'
    const isCompleted = a.status === 'completed';
    const isDelayed   = a.status === 'delayed';
    const rowStyle    = isDelayed ? 'background:var(--red-100);' : '';
    const photoLink   = a.photoUrl ? `<a href="${a.photoUrl}" target="_blank" style="font-size:.8rem;">📎 Foto</a>` : '';
    // Para o badge exibe o status EN — statusBadge já mapeia para PT
    const badge = statusBadge(a.status);
    return `<tr style="${rowStyle}">
      <td><strong>${a.title}</strong>${photoLink ? '<br>' + photoLink : ''}</td>
      <td>${a.cultureName || a.culture?.name || '-'}</td>
      <td>${formatDate(a.date)}</td>
      <td>${a.assignee || '-'}</td>
      <td>${formatCurrency(a.cost)}</td>
      <td>${badge}</td>
      <td class="actions">
        ${!isCompleted ? `<button class="btn btn-success btn-sm" data-complete="${a.id || a._id}" title="Marcar como concluída">✓</button>` : ''}
        <button class="btn btn-secondary btn-sm" data-edit="${a.id || a._id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-delete="${a.id || a._id}" data-name="${a.title}">Excluir</button>
      </td>
    </tr>`;
  }).join('');
}

export function initActivities(cultures, properties) {
  document.getElementById('newActivityBtn')?.addEventListener('click', () => openActivityModal(null));
  document.getElementById('saveActivityBtn')?.addEventListener('click', saveActivity);
  document.getElementById('cancelActivityModal')?.addEventListener('click', () => closeModal('activityModal'));

  document.getElementById('applyActFilters')?.addEventListener('click', loadActivities);
  document.getElementById('clearActFilters')?.addEventListener('click', () => {
    ['filterActStatus','filterActCulture','filterActProp','filterActStart','filterActEnd']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    loadActivities();
  });

  populateActivityFilters(cultures, properties);

  document.getElementById('activitiesTableBody')?.addEventListener('click', async e => {
    if (e.target.dataset.emptyAction === 'newActivity') { openActivityModal(null); return; }

    const completeId = e.target.dataset.complete;
    const editId     = e.target.dataset.edit;
    const delId      = e.target.dataset.delete;

    if (completeId) {
      const btn = e.target;
      setLoading(btn, true, '...');
      try {
        await completeActivity(completeId);
        showToast('Atividade concluída!', 'success');
        loadActivities();
      } catch (err) {
        showToast('Erro: ' + err.message);
        setLoading(btn, false);
      }
    }
    if (editId)  openActivityModal(editId);
    if (delId) {
      confirmDelete(
        'Excluir atividade',
        `Tem certeza que deseja excluir "${e.target.dataset.name}"?`,
        async () => {
          try { await deleteActivity(delId); showToast('Atividade excluída.', 'success'); loadActivities(); }
          catch (err) { showToast('Erro: ' + err.message); }
        }
      );
    }
  });
}

export function populateActivityFilters(cultures, properties) {
  const cultureSel = document.getElementById('filterActCulture');
  const propSel    = document.getElementById('filterActProp');
  const actCulture = document.getElementById('actCulture');

  if (cultureSel) {
    const cur = cultureSel.value;
    cultureSel.innerHTML = '<option value="">Todas</option>';
    (cultures || []).forEach(c => { const o = document.createElement('option'); o.value = c.id||c._id; o.textContent = c.name; cultureSel.appendChild(o); });
    cultureSel.value = cur;
  }
  if (propSel) {
    const cur = propSel.value;
    propSel.innerHTML = '<option value="">Todas</option>';
    (properties || []).forEach(p => { const o = document.createElement('option'); o.value = p.id||p._id; o.textContent = p.name; propSel.appendChild(o); });
    propSel.value = cur;
  }
  if (actCulture) {
    const cur = actCulture.value;
    actCulture.innerHTML = '<option value="">Sem cultura</option>';
    (cultures || []).forEach(c => { const o = document.createElement('option'); o.value = c.id||c._id; o.textContent = c.name; actCulture.appendChild(o); });
    actCulture.value = cur;
  }
}

function openActivityModal(id) {
  const a = id ? activities.find(x => (x.id || x._id) === id) : null;
  document.getElementById('activityModalTitle').textContent = a ? 'Editar Atividade' : 'Nova Atividade';
  document.getElementById('activityId').value   = a?.id || a?._id || '';
  document.getElementById('actTitle').value     = a?.title || '';
  document.getElementById('actDate').value      = a?.date?.substring(0,10) || '';
  document.getElementById('actAssignee').value  = a?.assignee || '';
  // API retorna 'completed'/'pending'/'delayed' — mapeia para valor do select PT
  document.getElementById('actStatus').value    = STATUS_TO_SELECT[a?.status] || 'pendente';
  document.getElementById('actCost').value      = a?.cost || 0;
  document.getElementById('actNotes').value     = a?.notes || '';

  const sel = document.getElementById('actCulture');
  sel.innerHTML = '<option value="">Sem cultura</option>';
  getCulturesCache().forEach(c => { const o = document.createElement('option'); o.value = c.id||c._id; o.textContent = c.name; sel.appendChild(o); });
  sel.value = a?.cultureId || a?.culture?._id || a?.culture?.id || '';

  clearFieldErrors('actTitle', 'actDate');
  openModal('activityModal');
}

async function saveActivity() {
  const id  = document.getElementById('activityId').value;
  const btn = document.getElementById('saveActivityBtn');

  const title = document.getElementById('actTitle').value.trim();
  const date  = document.getElementById('actDate').value;

  clearFieldErrors('actTitle', 'actDate');
  let hasError = false;
  if (!title) { setFieldError('actTitle', 'Título é obrigatório'); hasError = true; }
  if (!date)  { setFieldError('actDate',  'Data é obrigatória');   hasError = true; }
  if (hasError) return;

  const fileInput = document.getElementById('actFile');
  const fd = new FormData();
  fd.append('title',     title);
  fd.append('date',      date);
  fd.append('assignee',  document.getElementById('actAssignee').value.trim());
  fd.append('status',    document.getElementById('actStatus').value);
  fd.append('cost',      document.getElementById('actCost').value);
  fd.append('notes',     document.getElementById('actNotes').value.trim());
  const cultureId = document.getElementById('actCulture').value;
  if (cultureId) fd.append('cultureId', cultureId);
  if (fileInput?.files[0]) fd.append('photo', fileInput.files[0]);

  setLoading(btn, true);
  try {
    if (id) {
      const data = Object.fromEntries([...fd.entries()].filter(([k]) => k !== 'photo'));
      await updateActivity(id, data);
    } else {
      await createActivity(fd);
    }
    showToast(id ? 'Atividade atualizada.' : 'Atividade criada.', 'success');
    closeModal('activityModal');
    loadActivities();
  } catch (e) { showToast('Erro: ' + e.message); }
  finally { setLoading(btn, false); }
}
