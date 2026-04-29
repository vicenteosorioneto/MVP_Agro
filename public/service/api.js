const API_BASE_URL = 'http://localhost:5000/api';

// Migração de chaves legadas salvas por versões anteriores
(function migrateLegacyToken() {
  const legacy = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (legacy && !localStorage.getItem('agro_token')) {
    localStorage.setItem('agro_token', legacy);
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
})();

function getToken() {
  return localStorage.getItem('agro_token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body = null, isFormData = false) {
  const headers = { ...authHeaders() };
  if (body && !isFormData) headers['Content-Type'] = 'application/json';

  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(`${API_BASE_URL}${path}`, options);

  if (res.status === 401) {
    localStorage.removeItem('agro_token');
    localStorage.removeItem('agro_user');
    window.location.href = '/index.html';
    return;
  }

  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try { const d = await res.json(); msg = d.message || d.error || msg; } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return null;

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.blob();
}

// Auth
export async function login(email, password) {
  const data = await request('POST', '/auth/login', { email, password });

  // Backend pode retornar token em qualquer um desses campos
  const token = data?.token || data?.accessToken || data?.data?.token || data?.data?.accessToken;
  const user  = data?.user  || data?.data?.user;

  if (token) localStorage.setItem('agro_token', token);
  if (user)  localStorage.setItem('agro_user', JSON.stringify(user));

  return data;
}

export async function register(name, email, password) {
  const data = await request('POST', '/auth/register', { name, email, password });

  // Se o backend retornar token no cadastro, salvar e fazer login automático
  const token = data?.token || data?.accessToken || data?.data?.token || data?.data?.accessToken;
  const user  = data?.user  || data?.data?.user;

  if (token) localStorage.setItem('agro_token', token);
  if (user)  localStorage.setItem('agro_user', JSON.stringify(user));

  return data;
}

export function logout() {
  localStorage.removeItem('agro_token');
  localStorage.removeItem('agro_user');
  window.location.href = '/index.html';
}

export function getCurrentUser() {
  try {
    const user = JSON.parse(localStorage.getItem('agro_user'));
    if (user) return user;
    // Se só o token foi salvo (backend não retornou user), retornar objeto mínimo
    const token = localStorage.getItem('agro_token');
    return token ? { _tokenOnly: true } : null;
  } catch {
    return null;
  }
}

// Properties
export function getProperties() { return request('GET', '/properties'); }
export function createProperty(data) { return request('POST', '/properties', data); }
export function updateProperty(id, data) { return request('PUT', `/properties/${id}`, data); }
export function deleteProperty(id) { return request('DELETE', `/properties/${id}`); }

// Cultures
export function getCultures(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/cultures${qs ? '?' + qs : ''}`);
}
export function createCulture(data) { return request('POST', '/cultures', data); }
export function updateCulture(id, data) { return request('PUT', `/cultures/${id}`, data); }
export function deleteCulture(id) { return request('DELETE', `/cultures/${id}`); }

// Activities
export function getActivities(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/activities${qs ? '?' + qs : ''}`);
}
export function createActivity(formData) { return request('POST', '/activities', formData, true); }
export function updateActivity(id, data) { return request('PUT', `/activities/${id}`, data); }
export function deleteActivity(id) { return request('DELETE', `/activities/${id}`); }
export function completeActivity(id) { return request('PATCH', `/activities/${id}/status`, { status: 'concluida' }); }

// Dashboard
export function getDashboard() { return request('GET', '/dashboard'); }

// Finance
export function getFinance() { return request('GET', '/finance'); }

// Alerts
export function getAlerts() { return request('GET', '/alerts'); }
export function generateAlerts() { return request('POST', '/alerts/generate'); }
export function markAlertAsRead(id) { return request('PATCH', `/alerts/${id}/read`); }
export function deleteAlert(id) { return request('DELETE', `/alerts/${id}`); }

// History
export function getHistory(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/history${qs ? '?' + qs : ''}`);
}

// Files
export function getFiles(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/files${qs ? '?' + qs : ''}`);
}
export function uploadFile(formData) { return request('POST', '/files/upload', formData, true); }
export function deleteFile(id) { return request('DELETE', `/files/${id}`); }

// Reports
export async function downloadPdf() {
  const blob = await request('GET', '/reports/pdf');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'relatorio.pdf'; a.click();
  URL.revokeObjectURL(url);
}

export async function downloadCsv() {
  const blob = await request('GET', '/reports/csv');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'relatorio.csv'; a.click();
  URL.revokeObjectURL(url);
}
