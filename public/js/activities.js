import { getActivities, createActivity, updateActivity, deleteActivity, completeActivity } from '../service/api.js';
import { showToast, emptyState, confirmDelete, openModal, closeModal, formatDate, formatCurrency, statusBadge, setLoading, setFieldError, clearFieldErrors } from './utils.js';
import { getCulturesCache } from './cultures.js';

let activities = [];

const ACTIVITY_TYPES = ['Outro', 'Plantio', 'Irrigação', 'Adubação', 'Pulverização', 'Colheita', 'Manutenção'];

// Backend retorna status EN → valor do select PT
const STATUS_TO_SELECT = { completed: 'concluida', pending: 'pendente', delayed: 'pendente' };
// Select PT → backend EN (save & filter)
const SELECT_TO_STATUS = { pendente: 'pending', concluida: 'completed', atrasada: 'delayed' };

function navigate(screen, filters = {}) {
  document.dispatchEvent(new CustomEvent('agro:navigate', { detail: { screen, filters } }));
}

export async function loadActivities() {
  const tbody = document.getElementById('activitiesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" class="loading-row"><span class="loading-spinner"></span></td></tr>';

  const params = {};
  const status  = document.getElementById('filterActStatus')?.value;
  const culture = document.getElementById('filterActCulture')?.value;
  const prop    = document.getElementById('filterActProp')?.value;
  const start   = document.getElementById('filterActStart')?.value;
  const end     = document.getElementById('filterActEnd')?.value;
  const tipo    = document.getElementById('filterActTipo')?.value;
  if (status)  params.status     = SELECT_TO_STATUS[status] || status;
  if (culture) params.cultureId  = culture;
  if (prop)    params.propertyId = prop;
  if (start)   params.startDate  = start;
  if (end)     params.endDate    = end;
  if (tipo)    params.tipo       = tipo;

  try {
    const res = await getActivities(params);
    activities = Array.isArray(res) ? res : (res.data ?? res.activities ?? []);
    renderTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8">${emptyState('❌', 'Erro ao carregar', e.message)}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('activitiesTableBody');
  if (!activities.length) {
    tbody.innerHTML = `<tr><td colspan="8">${emptyState('📋', 'Nenhuma atividade', 'Registre a primeira atividade da safra.', '+ Nova atividade', 'newActivity')}</td></tr>`;
    return;
  }
  tbody.innerHTML = activities.map(a => {
    const isCompleted = a.status === 'completed' || a.status === 'concluida';
    const isDelayed   = a.status === 'delayed'   || a.status === 'atrasada';
    const rowStyle    = isDelayed ? 'background:var(--red-100);' : '';
    const photoLink   = a.photoUrl ? `<a href="${a.photoUrl}" target="_blank" style="font-size:.8rem;">📎 Foto</a>` : '';
    const badge = statusBadge(a.status);
    const tipo = a.tipo || 'Outro';
    return `<tr style="${rowStyle}">
      <td><strong>${a.title}</strong>${photoLink ? '<br>' + photoLink : ''}</td>
      <td><span style="font-size:.82rem;padding:2px 7px;background:var(--gray-100);border-radius:10px;">${tipo}</span></td>
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
    ['filterActStatus','filterActCulture','filterActProp','filterActStart','filterActEnd','filterActTipo']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    loadActivities();
  });

  ['filterActStatus', 'filterActCulture', 'filterActProp', 'filterActTipo'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', loadActivities);
  });

  populateActivityFilters(cultures, properties);
  populateTipoFilters();

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

function populateTipoFilters() {
  const tipoSel = document.getElementById('filterActTipo');
  if (!tipoSel) return;
  tipoSel.innerHTML = '<option value="">Todos os tipos</option>';
  ACTIVITY_TYPES.forEach(t => {
    const o = document.createElement('option');
    o.value = t; o.textContent = t;
    tipoSel.appendChild(o);
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
  const isEdit = !!id;

  document.getElementById('activityModalTitle').textContent = isEdit ? 'Editar Atividade' : 'Nova Atividade';
  document.getElementById('activityId').value   = a?.id || a?._id || '';
  document.getElementById('actTitle').value     = a?.title || '';
  document.getElementById('actDate').value      = a?.date?.substring(0,10) || '';
  document.getElementById('actAssignee').value  = a?.assignee || '';
  document.getElementById('actStatus').value    = STATUS_TO_SELECT[a?.status] || a?.status || 'pendente';
  document.getElementById('actCost').value      = a?.cost || 0;
  document.getElementById('actNotes').value     = a?.notes || '';
  document.getElementById('actTipo').value      = a?.tipo || 'Outro';

  // Campo de arquivo: exibir apenas na criação; edição não suporta upload
  const fileField = document.getElementById('actFile')?.closest('.field');
  if (fileField) {
    fileField.style.display = isEdit ? 'none' : '';
    if (!isEdit) {
      const fileInput = document.getElementById('actFile');
      if (fileInput) fileInput.value = '';
    }
  }

  // Preview do arquivo atual (somente na edição)
  const photoPreview = document.getElementById('actCurrentPhoto');
  if (photoPreview) {
    if (isEdit && a?.photoUrl) {
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(a.photoUrl);
      photoPreview.style.display = '';
      photoPreview.innerHTML = isImage
        ? `<div style="display:flex;align-items:center;gap:10px;">
            <img src="${a.photoUrl}" alt="Foto atual" style="width:60px;height:60px;object-fit:cover;border-radius:4px;border:1px solid var(--gray-200);" />
            <div>
              <div style="font-weight:500;color:var(--gray-700);">Foto atual</div>
              <a href="${a.photoUrl}" target="_blank" style="font-size:.8rem;color:var(--green-600);">Ver em tamanho completo →</a>
            </div>
          </div>`
        : `<div style="display:flex;align-items:center;gap:8px;"><span>📎</span><a href="${a.photoUrl}" target="_blank" style="color:var(--green-600);">Ver arquivo anexado →</a></div>`;
    } else {
      photoPreview.style.display = 'none';
      photoPreview.innerHTML = '';
    }
  }

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

  // Derivar propertyId a partir da cultura selecionada
  const cultureId = document.getElementById('actCulture').value;
  let propertyId = '';
  if (cultureId) {
    const cult = getCulturesCache().find(c => (c.id || c._id) === cultureId);
    propertyId = cult?.propertyId || cult?.property?._id || cult?.property?.id || '';
  }

  const fd = new FormData();
  fd.append('title',     title);
  fd.append('date',      date);
  fd.append('assignee',  document.getElementById('actAssignee').value.trim());
  const rawStatus = document.getElementById('actStatus').value;
  fd.append('status', SELECT_TO_STATUS[rawStatus] ?? rawStatus);
  fd.append('cost',      document.getElementById('actCost').value);
  fd.append('notes',     document.getElementById('actNotes').value.trim());
  fd.append('tipo',      document.getElementById('actTipo').value);
  if (cultureId)  fd.append('cultureId',  cultureId);
  if (propertyId) fd.append('propertyId', propertyId);

  setLoading(btn, true);
  try {
    if (id) {
      // Edição: enviar JSON sem o campo de arquivo (não suportado)
      const data = Object.fromEntries(fd.entries());
      await updateActivity(id, data);
    } else {
      // Criação: enviar FormData com arquivo opcional
      const fileInput = document.getElementById('actFile');
      if (fileInput?.files[0]) fd.append('photo', fileInput.files[0]);
      await createActivity(fd);
    }
    showToast(id ? 'Atividade atualizada.' : 'Atividade criada.', 'success');
    closeModal('activityModal');
    loadActivities();
  } catch (e) { showToast('Erro: ' + e.message); }
  finally { setLoading(btn, false); }
}
