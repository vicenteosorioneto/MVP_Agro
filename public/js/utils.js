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
  el.className = `toast toast-global toast-${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'toast toast-global hidden'; }, 4000);
}

export function statusBadge(status) {
  const map = {
    // valores em português
    pendente:  ['badge-pending',  'Pendente'],
    concluida: ['badge-done',     'Concluída'],
    atrasada:  ['badge-late',     'Atrasada'],
    ativa:     ['badge-active',   'Ativa'],
    colhida:   ['badge-done',     'Colhida'],
    planejada: ['badge-inactive', 'Planejada'],
    // valores em inglês (retornados pela API)
    pending:   ['badge-pending',  'Pendente'],
    completed: ['badge-done',     'Concluída'],
    delayed:   ['badge-late',     'Atrasada'],
    active:    ['badge-active',   'Ativa'],
    harvested: ['badge-done',     'Colhida'],
    cancelled: ['badge-inactive', 'Cancelada'],
  };
  const [cls, label] = map[status] || ['badge-inactive', status || '-'];
  return `<span class="badge-status ${cls}">${label}</span>`;
}

export function emptyState(icon, title, desc = '', actionLabel = '', actionEvent = '') {
  const btn = actionLabel
    ? `<button class="btn btn-primary btn-sm" data-empty-action="${actionEvent}" style="margin-top:10px;">${actionLabel}</button>`
    : '';
  return `<div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <h4>${title}</h4>
    ${desc ? `<p>${desc}</p>` : ''}
    ${btn}
  </div>`;
}

export function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
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

// Muda texto do botão e desabilita durante operação async
export function setLoading(btn, isLoading, loadingText = 'Salvando...') {
  if (!btn) return;
  if (isLoading) {
    btn._defaultText = btn.textContent;
    btn.textContent = loadingText;
    btn.disabled = true;
    btn.style.opacity = '0.75';
  } else {
    btn.textContent = btn._defaultText || 'Salvar';
    btn.disabled = false;
    btn.style.opacity = '';
  }
}

// Marca campo com erro inline (borda vermelha + mensagem abaixo)
export function setFieldError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.add('field-error');
  let errEl = el.parentNode.querySelector('.field-error-msg');
  if (!errEl) {
    errEl = document.createElement('span');
    errEl.className = 'field-error-msg';
    el.parentNode.appendChild(errEl);
  }
  errEl.textContent = msg;
}

// Remove todos os erros inline dos campos passados
export function clearFieldErrors(...fieldIds) {
  fieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('field-error');
    el.parentNode.querySelector('.field-error-msg')?.remove();
  });
}
