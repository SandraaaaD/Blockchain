import axios from 'axios';

/** VITE_API_URL from frontend/.env.development (= backend PORT) */
function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://127.0.0.1:8081';
  return '';
}

const api = axios.create({
  baseURL: apiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    const e = err as {
      response?: { status?: number };
      message?: string;
      code?: string;
    };
    if (e.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(err);
    }
    const noResponse = !e.response && (e.message === 'Network Error' || e.code === 'ERR_NETWORK');
    if (noResponse) {
      console.error(
        `[API] Backend unreachable at ${api.defaults.baseURL || '(set VITE_API_URL)'}. Start backend-node: npm start`
      );
    }
    return Promise.reject(err);
  }
);

export default api;
