const API_BASE_URL = 'http://localhost:5000/api';

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    throw new Error('Erro na requisição da API');
  }

  return response.json();
}

export const getCultures = () => apiRequest('/cultures');

export const createCulture = (data) =>
  apiRequest('/cultures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateCulture = (id, data) =>
  apiRequest(`/cultures/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteCulture = (id) =>
  apiRequest(`/cultures/${id}`, {
    method: 'DELETE',
  });

export const getActivities = (query = '') => apiRequest(`/activities${query}`);

export const createActivity = (data) =>
  apiRequest('/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateActivity = (id, data) =>
  apiRequest(`/activities/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteActivity = (id) =>
  apiRequest(`/activities/${id}`, {
    method: 'DELETE',
  });

export const updateActivityStatus = (id, status) =>
  apiRequest(`/activities/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

export const getDashboard = () => apiRequest('/dashboard');

export const getWeather = () => apiRequest('/weather');

export const getHistory = () => apiRequest('/history');

export const getFinancialSummary = () => apiRequest('/financial-summary');

export const openUrl = (endpoint) => window.open(`${API_BASE_URL}${endpoint}`, '_blank');
