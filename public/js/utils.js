export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00Z'));
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function formatCurrency(val) {
  const n = parseFloat(val) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPercent(val) {
  return `${(parseFloat(val) || 0).toFixed(1)}%`;
}

export function showToast(msg, type = 'error') {
  const el = document.getElementById('globalToast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast toast-${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'toast hidden'; }, 4000);
}

export function statusBadge(status) {
  const map = {
    pendente:  ['badge-pending', 'Pendente'],
    concluida: ['badge-done', 'Concluída'],
    atrasada:  ['badge-late', 'Atrasada'],
    ativa:     ['badge-active', 'Ativa'],
    colhida:   ['badge-done', 'Colhida'],
    planejada: ['badge-inactive', 'Planejada'],
    done:      ['badge-done', 'Concluída'],
    pending:   ['badge-pending', 'Pendente'],
  };
  const [cls, label] = map[status] || ['badge-inactive', status];
  return `<span class="badge-status ${cls}">${label}</span>`;
}

export function emptyState(icon, title, desc = '') {
  return `<div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <h4>${title}</h4>
    ${desc ? `<p>${desc}</p>` : ''}
  </div>`;
}

export function openModal(id) {
  document.getElementById(id).classList.add('open');
}

export function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

export function confirmDelete(title, desc, onConfirm) {
  document.getElementById('deleteModalTitle').textContent = title;
  document.getElementById('deleteModalDesc').textContent = desc;
  openModal('deleteModal');
  const btn = document.getElementById('confirmDeleteBtn');
  const newBtn = btn.cloneNode(true);
  btn.replaceWith(newBtn);
  newBtn.addEventListener('click', () => { closeModal('deleteModal'); onConfirm(); });
}
