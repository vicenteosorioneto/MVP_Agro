import { getProperties, createProperty, updateProperty, deleteProperty } from '../service/api.js';
import { showToast, emptyState, confirmDelete, openModal, closeModal, setLoading, setFieldError, clearFieldErrors } from './utils.js';

let properties = [];

export function getPropertiesCache() { return properties; }

export async function loadProperties() {
  const tbody = document.getElementById('propertiesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="loading-row"><span class="loading-spinner"></span></td></tr>';
  try {
    const res = await getProperties();
    properties = Array.isArray(res) ? res : (res.data ?? res.properties ?? []);
    renderTable();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5">${emptyState('❌', 'Erro ao carregar', e.message)}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('propertiesTableBody');
  if (!properties.length) {
    tbody.innerHTML = `<tr><td colspan="5">${emptyState('🏡', 'Nenhuma propriedade', 'Cadastre sua primeira fazenda.', '+ Nova propriedade', 'newProperty')}</td></tr>`;
    return;
  }
  tbody.innerHTML = properties.map(p => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>${p.city || '-'}${p.state ? ', ' + p.state : ''}</td>
      <td>${p.hectares ? p.hectares + ' ha' : '-'}</td>
      <td>${p.productionType || p.type || '-'}</td>
      <td class="actions">
        <button class="btn btn-secondary btn-sm" data-edit="${p.id || p._id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-delete="${p.id || p._id}" data-name="${p.name}">Excluir</button>
      </td>
    </tr>`).join('');
}

export function initProperties() {
  document.getElementById('newPropertyBtn')?.addEventListener('click', () => openPropertyModal());

  document.getElementById('savePropertyBtn')?.addEventListener('click', saveProperty);
  document.getElementById('cancelPropertyModal')?.addEventListener('click', () => closeModal('propertyModal'));

  document.getElementById('propertiesTableBody')?.addEventListener('click', e => {
    if (e.target.dataset.emptyAction === 'newProperty') { openPropertyModal(); return; }
    const editId = e.target.dataset.edit;
    const delId  = e.target.dataset.delete;
    if (editId) openPropertyModal(editId);
    if (delId) {
      confirmDelete(
        'Excluir propriedade',
        `Tem certeza que deseja excluir "${e.target.dataset.name}"? Esta ação não pode ser desfeita.`,
        async () => {
          try { await deleteProperty(delId); showToast('Propriedade excluída.', 'success'); loadProperties(); }
          catch (err) { showToast('Erro: ' + err.message); }
        }
      );
    }
  });
}

function openPropertyModal(id) {
  const p = id ? properties.find(x => (x.id || x._id) === id) : null;
  document.getElementById('propertyModalTitle').textContent = p ? 'Editar Propriedade' : 'Nova Propriedade';
  document.getElementById('propertyId').value    = p?.id || p?._id || '';
  document.getElementById('propName').value      = p?.name || '';
  document.getElementById('propHectares').value  = p?.hectares || '';
  document.getElementById('propCity').value      = p?.city || '';
  document.getElementById('propState').value     = p?.state || '';
  document.getElementById('propType').value      = p?.productionType || p?.type || '';
  document.getElementById('propNotes').value     = p?.notes || '';
  clearFieldErrors('propName');
  openModal('propertyModal');
}

async function saveProperty() {
  const id  = document.getElementById('propertyId').value;
  const btn = document.getElementById('savePropertyBtn');
  const name = document.getElementById('propName').value.trim();

  clearFieldErrors('propName');
  if (!name) { setFieldError('propName', 'Nome é obrigatório'); return; }

  const data = {
    name,
    hectares:       parseFloat(document.getElementById('propHectares').value) || 0,
    city:           document.getElementById('propCity').value.trim(),
    state:          document.getElementById('propState').value,
    productionType: document.getElementById('propType').value.trim(),
    notes:          document.getElementById('propNotes').value.trim(),
  };

  setLoading(btn, true);
  try {
    if (id) await updateProperty(id, data); else await createProperty(data);
    showToast(id ? 'Propriedade atualizada.' : 'Propriedade criada.', 'success');
    closeModal('propertyModal');
    loadProperties();
  } catch (e) { showToast('Erro: ' + e.message); }
  finally { setLoading(btn, false); }
}
