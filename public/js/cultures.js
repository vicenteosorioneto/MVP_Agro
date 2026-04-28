import { getCultures, createCulture, updateCulture, deleteCulture } from '../service/api.js';
import { showToast, emptyState, confirmDelete, openModal, closeModal, formatDate, formatCurrency, statusBadge } from './utils.js';
import { getPropertiesCache } from './properties.js';

let cultures = [];

export function getCulturesCache() { return cultures; }

export async function loadCultures() {
  const tbody = document.getElementById('culturesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="loading-row"><span class="loading-spinner"></span></td></tr>';

  const params = {};
  const prop   = document.getElementById('filterCultureProp')?.value;
  const status = document.getElementById('filterCultureStatus')?.value;
  if (prop)   params.propertyId = prop;
  if (status) params.status     = status;

  try {
    const res = await getCultures(params);
    cultures = Array.isArray(res) ? res : (res.data ?? res.cultures ?? []);
    renderTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyState('❌', 'Erro ao carregar', e.message)}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('culturesTableBody');
  if (!cultures.length) {
    tbody.innerHTML = `<tr><td colspan="7">${emptyState('🌾', 'Nenhuma cultura', 'Clique em "+ Nova cultura" para adicionar.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = cultures.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.propertyName || c.property?.name || '-'}</td>
      <td>${statusBadge(c.status)}</td>
      <td>${formatDate(c.plantingDate)}</td>
      <td>${formatDate(c.harvestDate)}</td>
      <td>${formatCurrency(c.expectedRevenue)}</td>
      <td class="actions">
        <button class="btn btn-secondary btn-sm" data-edit="${c.id || c._id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-delete="${c.id || c._id}" data-name="${c.name}">Excluir</button>
      </td>
    </tr>`).join('');
}

export function populateCultureSelects(selects) {
  selects.forEach(sel => {
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Sem cultura</option>';
    cultures.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id || c._id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
    sel.value = cur;
  });
}

export function initCultures() {
  document.getElementById('newCultureBtn')?.addEventListener('click', () => openCultureModal(null));
  document.getElementById('saveCultureBtn')?.addEventListener('click', () => saveCulture());
  document.getElementById('cancelCultureModal')?.addEventListener('click', () => closeModal('cultureModal'));

  document.getElementById('filterCultureProp')?.addEventListener('change', loadCultures);
  document.getElementById('filterCultureStatus')?.addEventListener('change', loadCultures);
  document.getElementById('clearCultureFilters')?.addEventListener('click', () => {
    const p = document.getElementById('filterCultureProp');
    const s = document.getElementById('filterCultureStatus');
    if (p) p.value = ''; if (s) s.value = '';
    loadCultures();
  });

  document.getElementById('culturesTableBody')?.addEventListener('click', e => {
    const editId = e.target.dataset.edit;
    const delId  = e.target.dataset.delete;
    if (editId)  openCultureModal(editId);
    if (delId) {
      confirmDelete('Excluir cultura', `Excluir "${e.target.dataset.name}"?`, async () => {
        try { await deleteCulture(delId); showToast('Cultura excluída.', 'success'); loadCultures(); }
        catch (err) { showToast('Erro: ' + err.message); }
      });
    }
  });
}

export function populatePropertyFilter(props) {
  const sel = document.getElementById('filterCultureProp');
  if (!sel) return;
  sel.innerHTML = '<option value="">Todas</option>';
  props.forEach(p => {
    const o = document.createElement('option');
    o.value = p.id || p._id; o.textContent = p.name;
    sel.appendChild(o);
  });
}

function openCultureModal(id) {
  const c = id ? cultures.find(x => (x.id || x._id) === id) : null;
  document.getElementById('cultureModalTitle').textContent = c ? 'Editar Cultura' : 'Nova Cultura';
  document.getElementById('cultureId').value       = c?.id || c?._id || '';
  document.getElementById('cultureName').value     = c?.name || '';
  document.getElementById('culturePlanting').value = c?.plantingDate?.substring(0,10) || '';
  document.getElementById('cultureHarvest').value  = c?.harvestDate?.substring(0,10) || '';
  document.getElementById('cultureStatus').value   = c?.status || 'planejada';
  document.getElementById('cultureRevenue').value  = c?.expectedRevenue || 0;
  document.getElementById('cultureNotes').value    = c?.notes || '';

  const propSel = document.getElementById('cultureProperty');
  propSel.innerHTML = '<option value="">Selecione</option>';
  getPropertiesCache().forEach(p => {
    const o = document.createElement('option');
    o.value = p.id || p._id; o.textContent = p.name;
    propSel.appendChild(o);
  });
  propSel.value = c?.propertyId || c?.property?._id || c?.property?.id || '';
  openModal('cultureModal');
}

async function saveCulture() {
  const id   = document.getElementById('cultureId').value;
  const data = {
    name:            document.getElementById('cultureName').value.trim(),
    propertyId:      document.getElementById('cultureProperty').value || undefined,
    plantingDate:    document.getElementById('culturePlanting').value || undefined,
    harvestDate:     document.getElementById('cultureHarvest').value || undefined,
    status:          document.getElementById('cultureStatus').value,
    expectedRevenue: parseFloat(document.getElementById('cultureRevenue').value) || 0,
    notes:           document.getElementById('cultureNotes').value.trim(),
  };
  if (!data.name) { showToast('Nome obrigatório.'); return; }
  const btn = document.getElementById('saveCultureBtn');
  btn.disabled = true;
  try {
    if (id) await updateCulture(id, data); else await createCulture(data);
    showToast(id ? 'Cultura atualizada.' : 'Cultura criada.', 'success');
    closeModal('cultureModal');
    loadCultures();
  } catch (e) { showToast('Erro: ' + e.message); }
  finally { btn.disabled = false; }
}
