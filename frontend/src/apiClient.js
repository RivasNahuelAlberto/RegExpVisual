const rawApiUrl = import.meta.env.VITE_API_URL;
const API_BASE = rawApiUrl ? rawApiUrl.replace(/\/+$|\s+/gu, '') : '';

const resolveDefaultApiUrl = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const host = window.location.hostname;
  if (host.includes('regexpv.onrender.com')) {
    return 'https://regexpvisual.onrender.com';
  }

  return `${window.location.protocol}//${window.location.host}`;
};

const API_URL = API_BASE || resolveDefaultApiUrl();

const listeners = new Set();
let activeRequestCount = 0;

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener(activeRequestCount);
    } catch {
      // ignore listener errors
    }
  });
};

export const buildApiPath = (path) => `${API_URL}${path}`;

export const onRequestCountChange = (listener) => {
  listeners.add(listener);
  listener(activeRequestCount);
  return () => listeners.delete(listener);
};

const safeJson = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
};

export async function apiFetch(path, options = {}) {
  activeRequestCount += 1;
  notify();

  try {
    const response = await fetch(buildApiPath(path), options);
    if (!response.ok) {
      const payload = await safeJson(response);
      const message = payload?.message || payload?.error || `Backend error ${response.status}`;
      throw new Error(message);
    }
    return await response.json();
  } finally {
    activeRequestCount -= 1;
    notify();
  }
}

export async function postJson(path, body) {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function checkHealth() {
  return apiFetch('/api/health');
}
