import { downloadPdf, downloadCsv, uploadFile, getFiles, deleteFile } from '../service/api.js';
import { showToast, formatDate, confirmDelete } from './utils.js';

export function initReports(cultures = [], properties = []) {
  populateUploadCultureSelect(cultures);

  document.getElementById('downloadPdfBtn')?.addEventListener('click', async e => {
    const btn = e.target;
    btn.disabled = true; btn.textContent = 'Baixando...';
    try { await downloadPdf(); showToast('PDF baixado!', 'success'); }
    catch (err) { showToast('Erro ao baixar PDF: ' + err.message); }
    finally { btn.disabled = false; btn.textContent = 'Baixar PDF'; }
  });

  document.getElementById('downloadCsvBtn')?.addEventListener('click', async e => {
    const btn = e.target;
    btn.disabled = true; btn.textContent = 'Baixando...';
    try { await downloadCsv(); showToast('CSV baixado!', 'success'); }
    catch (err) { showToast('Erro ao baixar CSV: ' + err.message); }
    finally { btn.disabled = false; btn.textContent = 'Baixar CSV'; }
  });

  document.getElementById('uploadForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const fd = new FormData(e.target);
    if (!fd.get('file') || !fd.get('file').size) { showToast('Selecione um arquivo.'); return; }

    const cultureId = document.getElementById('uploadCulture')?.value;
    if (cultureId) fd.append('cultureId', cultureId);

    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      const res = await uploadFile(fd);
      const url = res?.url || res?.data?.url || res?.fileUrl || '';
      const result = document.getElementById('uploadResult');
      if (result) result.innerHTML = `<span style="color:var(--green-700);font-size:.9rem;">✓ Arquivo enviado${url ? ` · <a href="${url}" target="_blank">Ver arquivo</a>` : ''}</span>`;
      e.target.reset();
      showToast('Arquivo enviado!', 'success');
      loadFilesList();
    } catch (err) { showToast('Erro no upload: ' + err.message); }
    finally { btn.disabled = false; btn.textContent = 'Enviar arquivo'; }
  });

  document.getElementById('refreshFilesBtn')?.addEventListener('click', loadFilesList);

  loadFilesList();
}

function populateUploadCultureSelect(cultures) {
  const sel = document.getElementById('uploadCulture');
  if (!sel) return;
  sel.innerHTML = '<option value="">Nenhuma</option>';
  (cultures || []).forEach(c => {
    const o = document.createElement('option');
    o.value = c.id || c._id; o.textContent = c.name;
    sel.appendChild(o);
  });
}

async function loadFilesList() {
  const el = document.getElementById('filesList');
  if (!el) return;
  el.innerHTML = '<div class="loading-row"><span class="loading-spinner"></span></div>';
  try {
    const res = await getFiles();
    const files = Array.isArray(res) ? res : (res.data ?? res.files ?? []);
    renderFilesList(files);
  } catch (e) {
    el.innerHTML = `<p style="color:var(--gray-500);font-size:.9rem;padding:12px 0;">Não foi possível carregar arquivos: ${e.message}</p>`;
  }
}

function renderFilesList(files) {
  const el = document.getElementById('filesList');
  if (!files.length) {
    el.innerHTML = '<p style="color:var(--gray-500);font-size:.9rem;padding:12px 0;">Nenhum arquivo enviado ainda.</p>';
    return;
  }

  const isImage = (mime) => mime && mime.startsWith('image/');
  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1024/1024).toFixed(1)} MB`;
  };

  el.innerHTML = `<div class="table-wrap"><table class="data-table">
    <thead><tr>
      <th>Arquivo</th><th>Cultura vinculada</th><th>Tamanho</th><th>Data</th><th>Ações</th>
    </tr></thead>
    <tbody>
      ${files.map(f => {
        const name = f.originalName || f.name || 'arquivo';
        const url  = f.url || '';
        const icon = isImage(f.mimeType) ? '🖼️' : f.mimeType === 'application/pdf' ? '📄' : '📎';
        const cultureName = f.cultureName || (f.cultureId ? `Cultura ${f.cultureId.substring(0,6)}…` : '-');
        return `<tr>
          <td>
            ${icon}
            ${url ? `<a href="${url}" target="_blank" style="margin-left:4px;">${name}</a>` : `<span style="margin-left:4px;">${name}</span>`}
          </td>
          <td>${cultureName}</td>
          <td style="font-size:.85rem;color:var(--gray-500);">${formatSize(f.size)}</td>
          <td style="font-size:.85rem;">${formatDate(f.createdAt)}</td>
          <td class="actions">
            ${url ? `<a href="${url}" target="_blank" class="btn btn-secondary btn-sm">Abrir</a>` : ''}
            <button class="btn btn-danger btn-sm" data-delete-file="${f.id || f._id}" data-name="${name}">Excluir</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>`;

  el.querySelectorAll('[data-delete-file]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id   = btn.dataset.deleteFile;
      const name = btn.dataset.name;
      if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
      try {
        await deleteFile(id);
        showToast('Arquivo excluído.', 'success');
        loadFilesList();
      } catch (err) { showToast('Erro: ' + err.message); }
    });
  });
}
