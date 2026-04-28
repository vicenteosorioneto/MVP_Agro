import { downloadPdf, downloadCsv, uploadFile } from '../service/api.js';
import { showToast } from './utils.js';

export function initReports() {
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
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      const res = await uploadFile(fd);
      const url = res?.url || res?.fileUrl || '';
      const result = document.getElementById('uploadResult');
      if (result) result.innerHTML = `<span style="color:var(--green-700);font-size:.9rem;">✓ Arquivo enviado${url ? ` · <a href="${url}" target="_blank">Ver arquivo</a>` : ''}</span>`;
      e.target.reset();
      showToast('Arquivo enviado!', 'success');
    } catch (err) { showToast('Erro no upload: ' + err.message); }
    finally { btn.disabled = false; btn.textContent = 'Enviar arquivo'; }
  });
}
