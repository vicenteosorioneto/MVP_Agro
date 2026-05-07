import { getCultures, createCulture, updateCulture, deleteCulture } from '../service/api.js';
import { showToast, emptyState, confirmDelete, openModal, closeModal, formatDate, formatCurrency, statusBadge, setLoading, setFieldError, clearFieldErrors } from './utils.js';
import { getPropertiesCache } from './properties.js';

let cultures = [];
let pendingHighlight = null;

// API status EN → PT select value
const STATUS_TO_SELECT = { active: 'ativa', harvested: 'colhida', cancelled: 'cancelada', planned: 'planejada', planejada: 'planejada', ativa: 'ativa', colhida: 'colhida' };
// Select PT → backend EN (save & filter)
const SELECT_TO_STATUS = { planejada: 'planned', ativa: 'active', colhida: 'harvested' };

export function getCulturesCache() { return cultures; }

export function setHighlight(cultureId) {
  pendingHighlight = cultureId;
}

export async function loadCultures() {
  const tbody = document.getElementById('culturesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" class="loading-row"><span class="loading-spinner"></span></td></tr>';

  const params = {};
  const prop   = document.getElementById('filterCultureProp')?.value;
  const status = document.getElementById('filterCultureStatus')?.value;
  if (prop)   params.propertyId = prop;
  if (status) params.status     = SELECT_TO_STATUS[status] || status;

  try {
    const res = await getCultures(params);
    cultures = Array.isArray(res) ? res : (res.data ?? res.cultures ?? []);
    renderTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8">${emptyState('❌', 'Erro ao carregar', e.message)}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('culturesTableBody');
  if (!cultures.length) {
    tbody.innerHTML = `<tr><td colspan="8">${emptyState('🌾', 'Nenhuma cultura', 'Registre sua primeira safra.', '+ Nova cultura', 'newCulture')}</td></tr>`;
    return;
  }
  const props = getPropertiesCache();
  tbody.innerHTML = cultures.map(c => {
    const prop = props.find(p => (p.id || p._id) === c.propertyId);
    const areaDisplay = c.area != null && c.area !== '' ? `${Number(c.area).toFixed(2)} ha` : '-';
    return `
    <tr data-culture-id="${c.id || c._id}">
      <td><strong>${c.name}</strong></td>
      <td>${prop?.name || c.propertyName || c.property?.name || '-'}</td>
      <td>${statusBadge(c.status)}</td>
      <td>${formatDate(c.plantingDate)}</td>
      <td>${formatDate(c.harvestDate)}</td>
      <td>${areaDisplay}</td>
      <td>${formatCurrency(c.expectedRevenue)}</td>
      <td class="actions">
        <button class="btn btn-secondary btn-sm" data-edit="${c.id || c._id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-delete="${c.id || c._id}" data-name="${c.name}">Excluir</button>
      </td>
    </tr>`;
  }).join('');

  // Apply highlight if pending (e.g. navigated from dashboard harvest)
  if (pendingHighlight) {
    const row = tbody.querySelector(`tr[data-culture-id="${pendingHighlight}"]`);
    if (row) {
      row.style.transition = 'background 0.4s';
      row.style.background = 'var(--yellow-100, #fef9c3)';
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { row.style.background = ''; }, 2500);
    }
    pendingHighlight = null;
  }
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
    if (e.target.dataset.emptyAction === 'newCulture') { openCultureModal(null); return; }
    const editId = e.target.dataset.edit;
    const delId  = e.target.dataset.delete;
    if (editId) openCultureModal(editId);
    if (delId) {
      confirmDelete(
        'Excluir cultura',
        `Tem certeza que deseja excluir "${e.target.dataset.name}"?`,
        async () => {
          try { await deleteCulture(delId); showToast('Cultura excluída.', 'success'); loadCultures(); }
          catch (err) { showToast('Erro: ' + err.message); }
        }
      );
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
  document.getElementById('cultureStatus').value   = STATUS_TO_SELECT[c?.status] || 'planejada';
  document.getElementById('cultureRevenue').value  = c?.expectedRevenue || 0;
  document.getElementById('cultureNotes').value    = c?.notes || '';

  const areaEl = document.getElementById('cultureArea');
  if (areaEl) areaEl.value = c?.area != null ? c.area : '';

  const propSel = document.getElementById('cultureProperty');
  propSel.innerHTML = '<option value="">Selecione</option>';
  getPropertiesCache().forEach(p => {
    const o = document.createElement('option');
    o.value = p.id || p._id; o.textContent = p.name;
    propSel.appendChild(o);
  });
  propSel.value = c?.propertyId || c?.property?._id || c?.property?.id || '';

  clearFieldErrors('cultureName', 'culturePlanting', 'cultureHarvest');
  openModal('cultureModal');
}

async function saveCulture() {
  const id  = document.getElementById('cultureId').value;
  const btn = document.getElementById('saveCultureBtn');

  const name         = document.getElementById('cultureName').value.trim();
  const plantingDate = document.getElementById('culturePlanting').value;
  const harvestDate  = document.getElementById('cultureHarvest').value;

  clearFieldErrors('cultureName', 'culturePlanting', 'cultureHarvest');
  let hasError = false;
  if (!name)         { setFieldError('cultureName',     'Nome é obrigatório');            hasError = true; }
  if (!plantingDate) { setFieldError('culturePlanting', 'Data de plantio é obrigatória'); hasError = true; }
  if (!harvestDate)  { setFieldError('cultureHarvest',  'Data de colheita é obrigatória'); hasError = true; }
  if (plantingDate && harvestDate && harvestDate <= plantingDate) {
    setFieldError('cultureHarvest', 'Colheita deve ser posterior ao plantio');
    hasError = true;
  }
  if (hasError) return;

  const areaVal = document.getElementById('cultureArea')?.value;

  const data = {
    name,
    propertyId:      document.getElementById('cultureProperty').value || undefined,
    plantingDate,
    harvestDate,
    status:          SELECT_TO_STATUS[document.getElementById('cultureStatus').value] ?? document.getElementById('cultureStatus').value,
    area:            areaVal !== '' && areaVal != null ? parseFloat(areaVal) : null,
    expectedRevenue: parseFloat(document.getElementById('cultureRevenue').value) || 0,
    notes:           document.getElementById('cultureNotes').value.trim(),
  };

  setLoading(btn, true);
  try {
    if (id) await updateCulture(id, data); else await createCulture(data);
    showToast(id ? 'Cultura atualizada.' : 'Cultura criada.', 'success');
    closeModal('cultureModal');
    loadCultures();
  } catch (e) { showToast('Erro: ' + e.message); }
  finally { setLoading(btn, false); }
}
