const API_BASE_URL = 'http://localhost:5000/api';

(function clearLegacyKeys() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
})();

let _isRedirecting = false;

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/logout'];

function isAuthPath(path) {
  return AUTH_PATHS.some(authPath => path.startsWith(authPath));
}

function getToken() {
  const token = localStorage.getItem('agro_token');

  if (
      !token ||
      token === 'null' ||
      token === 'undefined' ||
      token.trim() === ''
  ) {
    return null;
  }

  return token;
}

function clearAllAuthKeys() {
  localStorage.removeItem('agro_token');
  localStorage.removeItem('agro_user');
  localStorage.removeItem('agro_refresh_token');
  localStorage.removeItem('agro_expires_at');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
}

function getAuthHeaders() {
  const token = getToken();

  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`
  };
}

async function readErrorMessage(res) {
  let msg = `Erro ${res.status}`;

  try {
    const data = await res.json();

    msg =
        data?.message ||
        data?.error ||
        data?.msg ||
        data?.data?.message ||
        (data?.errors && Object.values(data.errors).flat()[0]) ||
        msg;
  } catch {
    // mantém mensagem padrão
  }

  return msg;
}

async function request(method, path, body = null, isFormData = false) {
  const headers = {
    ...getAuthHeaders()
  };

  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, options);

  if (!res.ok) {
    const message = await readErrorMessage(res);

    if (res.status === 401 && !isAuthPath(path)) {
      if (!_isRedirecting) {
        _isRedirecting = true;
        clearAllAuthKeys();
        window.location.href = '/index.html';
      }

      throw new Error(message || 'Sessão expirada. Faça login novamente.');
    }

    throw new Error(message);
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return res.json();
  }

  return res.blob();
}

export function extractData(res, legacyKey = null) {
  if (res === null || res === undefined) {
    return legacyKey ? [] : null;
  }

  if (Array.isArray(res)) return res;

  if (res.data !== undefined) return res.data;

  if (legacyKey && res[legacyKey] !== undefined) {
    return res[legacyKey];
  }

  return res;
}

function saveSession(payload) {
  if (!payload) {
    throw new Error('Resposta vazia do servidor.');
  }

  const data = payload.data ?? payload;

  const token =
      data.token ||
      data.accessToken ||
      data.access_token ||
      payload.token ||
      payload.accessToken ||
      payload.access_token;

  if (!token || typeof token !== 'string' || token.length < 10) {
    throw new Error('Token não recebido. Tente novamente.');
  }

  localStorage.setItem('agro_token', token);

  const user = data.user || payload.user;

  if (user) {
    localStorage.setItem('agro_user', JSON.stringify(user));
  }

  const refreshToken = data.refreshToken || payload.refreshToken;

  if (refreshToken) {
    localStorage.setItem('agro_refresh_token', refreshToken);
  }

  const expiresAt = data.expiresAt || payload.expiresAt;

  if (expiresAt) {
    localStorage.setItem('agro_expires_at', String(expiresAt));
  }
}

// Auth
export async function login(email, password) {
  clearAllAuthKeys();

  const response = await request('POST', '/auth/login', {
    email,
    password
  });

  saveSession(response);

  return response;
}

export async function register(name, email, password) {
  const response = await request('POST', '/auth/register', {
    name,
    email,
    password
  });

  return response;
}

export function logout() {
  clearAllAuthKeys();
  window.location.href = '/index.html';
}

export function getCurrentUser() {
  try {
    const user = JSON.parse(localStorage.getItem('agro_user'));

    if (user) return user;

    const token = getToken();

    return token ? { _tokenOnly: true } : null;
  } catch {
    return null;
  }
}

// Properties
export function getProperties() {
  return request('GET', '/properties');
}

export function createProperty(data) {
  return request('POST', '/properties', data);
}

export function updateProperty(id, data) {
  return request('PUT', `/properties/${id}`, data);
}

export function deleteProperty(id) {
  return request('DELETE', `/properties/${id}`);
}

// Cultures
export function getCultures(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/cultures${qs ? `?${qs}` : ''}`);
}

export function createCulture(data) {
  return request('POST', '/cultures', data);
}

export function updateCulture(id, data) {
  return request('PUT', `/cultures/${id}`, data);
}

export function deleteCulture(id) {
  return request('DELETE', `/cultures/${id}`);
}

// Activities
export function getActivities(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/activities${qs ? `?${qs}` : ''}`);
}

export function createActivity(formData) {
  return request('POST', '/activities', formData, true);
}

export function updateActivity(id, data) {
  return request('PUT', `/activities/${id}`, data);
}

export function deleteActivity(id) {
  return request('DELETE', `/activities/${id}`);
}

export function completeActivity(id) {
  return request('PATCH', `/activities/${id}/status`, {
    status: 'completed'
  });
}

// Dashboard
export function getDashboard() {
  return request('GET', '/dashboard');
}

// Finance
export function getFinance(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => [k, String(v)])
    )
  ).toString();
  return request('GET', `/finance${qs ? '?' + qs : ''}`);
}

// Alerts
export function getAlerts() {
  return request('GET', '/alerts');
}

export function generateAlerts() {
  return request('POST', '/alerts/generate');
}

export function markAlertAsRead(id) {
  return request('PATCH', `/alerts/${id}/read`);
}

export function markAllAlertsRead() {
  return request('PATCH', '/alerts/read-all');
}

export function deleteAlert(id) {
  return request('DELETE', `/alerts/${id}`);
}

// History
export function getHistory(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/history${qs ? `?${qs}` : ''}`);
}

// Files
export function getFiles(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request('GET', `/files${qs ? `?${qs}` : ''}`);
}

export function uploadFile(formData) {
  return request('POST', '/files/upload', formData, true);
}

export function deleteFile(id) {
  return request('DELETE', `/files/${id}`);
}

// Reports
export async function downloadPdf() {
  const blob = await request('GET', '/reports/pdf');

  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = 'relatorio.pdf';
  a.click();

  URL.revokeObjectURL(url);
}

export async function downloadCsv() {
  const blob = await request('GET', '/reports/csv');

  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = 'relatorio.csv';
  a.click();

  URL.revokeObjectURL(url);
}