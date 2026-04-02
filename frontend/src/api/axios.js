import axios from 'axios';

const rawBase = import.meta.env.VITE_API_URL;
if (import.meta.env.PROD && !rawBase) {
  // Helps diagnose misconfigured Vercel env vars (VITE_* are build-time).
  console.warn('VITE_API_URL is not set; falling back to same-origin /api');
}
const normalizedBase = rawBase ? rawBase.trim().replace(/\/+$/, '') : '';
const resolvedBaseURL = normalizedBase
  ? normalizedBase.endsWith('/api')
    ? normalizedBase
    : `${normalizedBase}/api`
  : '/api';

const instance = axios.create({
  baseURL: resolvedBaseURL
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response) => {
    // If Vercel/SPA rewrites route API calls to `index.html`, Axios receives HTML instead of JSON.
    // Fail fast with a helpful message (prevents downstream `undefined[0]`-style crashes).
    const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
    if (typeof response.data === 'string') {
      const trimmed = response.data.trimStart().toLowerCase();
      const looksLikeHtml = trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
      if (looksLikeHtml || contentType.includes('text/html')) {
        throw new Error(
          'API misconfigured: received HTML instead of JSON. Check Vercel rewrites/proxy and VITE_API_URL/BACKEND_URL env vars.'
        );
      }
    }
    if (!response.data) response.data = { data: [] };
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;
