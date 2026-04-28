import { getActivities, createActivity, updateActivity, deleteActivity, completeActivity } from '../service/api.js';
import { showToast, emptyState, confirmDelete, openModal, closeModal, formatDate, formatCurrency, statusBadge } from './utils.js';

let activities = [];

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

function isLate(act) {
  if (act.status === 'concluida' || act.status === 'done') return false;
  if (!act.date) return false;
  return new Date(act.date) < new Date();
}

function renderTable() {
  const tbody = document.getElementById('activitiesTableBody');
  if (!activities.length) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyState('📋', 'Nenhuma atividade', 'Clique em "+ Nova atividade" para adicionar.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = activities.map(a => {
    const late = isLate(a);
    const status = late ? 'atrasada' : (a.status || 'pendente');
    const rowStyle = late ? 'background:var(--red-100);' : '';
    const photoLink = a.photoUrl ? `<a href="${a.photoUrl}" target="_blank" style="font-size:.8rem;">📎 Foto</a>` : '';
    return `<tr style="${rowStyle}">
      <td><strong>${a.title}</strong>${photoLink ? '<br>' + photoLink : ''}</td>
      <td>${a.cultureName || a.culture?.name || '-'}</td>
      <td>${formatDate(a.date)}</td>
      <td>${a.assignee || '-'}</td>
      <td>${formatCurrency(a.cost)}</td>
      <td>${statusBadge(status)}</td>
      <td class="actions">
        ${status !== 'concluida' && status !== 'done' ? `<button class="btn btn-success btn-sm" data-complete="${a.id || a._id}">✓</button>` : ''}
        <button class="btn btn-secondary btn-sm" data-edit="${a.id || a._id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-delete="${a.id || a._id}" data-name="${a.title}">Excluir</button>
      </td>
    </tr>`;
  }).join('');
}

export function initActivities(cultures, properties) {
  document.getElementById('newActivityBtn')?.addEventListener('click', () => openActivityModal(null, cultures));
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
    const completeId = e.target.dataset.complete;
    const editId     = e.target.dataset.edit;
    const delId      = e.target.dataset.delete;

    if (completeId) {
      e.target.disabled = true;
      try { await completeActivity(completeId); showToast('Atividade concluída!', 'success'); loadActivities(); }
      catch (err) { showToast('Erro: ' + err.message); e.target.disabled = false; }
    }
    if (editId)  openActivityModal(editId, cultures);
    if (delId) {
      confirmDelete('Excluir atividade', `Excluir "${e.target.dataset.name}"?`, async () => {
        try { await deleteActivity(delId); showToast('Atividade excluída.', 'success'); loadActivities(); }
        catch (err) { showToast('Erro: ' + err.message); }
      });
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

function openActivityModal(id, cultures) {
  const a = id ? activities.find(x => (x.id || x._id) === id) : null;
  document.getElementById('activityModalTitle').textContent = a ? 'Editar Atividade' : 'Nova Atividade';
  document.getElementById('activityId').value   = a?.id || a?._id || '';
  document.getElementById('actTitle').value     = a?.title || '';
  document.getElementById('actDate').value      = a?.date?.substring(0,10) || '';
  document.getElementById('actAssignee').value  = a?.assignee || '';
  document.getElementById('actStatus').value    = a?.status || 'pendente';
  document.getElementById('actCost').value      = a?.cost || 0;
  document.getElementById('actNotes').value     = a?.notes || '';

  const sel = document.getElementById('actCulture');
  sel.innerHTML = '<option value="">Sem cultura</option>';
  (cultures || []).forEach(c => { const o = document.createElement('option'); o.value = c.id||c._id; o.textContent = c.name; sel.appendChild(o); });
  sel.value = a?.cultureId || a?.culture?._id || a?.culture?.id || '';

  openModal('activityModal');
}

async function saveActivity() {
  const id = document.getElementById('activityId').value;
  const fileInput = document.getElementById('actFile');
  const btn = document.getElementById('saveActivityBtn');

  const fd = new FormData();
  fd.append('title',     document.getElementById('actTitle').value.trim());
  fd.append('date',      document.getElementById('actDate').value);
  fd.append('assignee',  document.getElementById('actAssignee').value.trim());
  fd.append('status',    document.getElementById('actStatus').value);
  fd.append('cost',      document.getElementById('actCost').value);
  fd.append('notes',     document.getElementById('actNotes').value.trim());
  const cultureId = document.getElementById('actCulture').value;
  if (cultureId) fd.append('cultureId', cultureId);
  if (fileInput?.files[0]) fd.append('photo', fileInput.files[0]);

  if (!fd.get('title')) { showToast('Título obrigatório.'); return; }
  if (!fd.get('date'))  { showToast('Data obrigatória.'); return; }

  btn.disabled = true;
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
  finally { btn.disabled = false; }
}
