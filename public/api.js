const API_BASE_URL = "http://localhost:5000/api";

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    let errorMessage = `Erro na requisição ${response.status}`;
    try {
      const body = await response.json();
      errorMessage = body.error || JSON.stringify(body) || errorMessage;
    } catch {
      // ignore invalid json
    }
    throw new Error(errorMessage);
  }

  return response;
}

async function apiGet(path) {
  const response = await apiFetch(path);
  return response.json();
}

async function apiPostJson(path, payload) {
  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}

async function apiPostForm(path, formData) {
  const response = await apiFetch(path, {
    method: "POST",
    body: formData,
  });
  return response.json();
}

async function apiPatchJson(path, payload) {
  const response = await apiFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}

function apiOpenUrl(path) {
  window.open(`${API_BASE_URL}${path}`, "_blank");
}
