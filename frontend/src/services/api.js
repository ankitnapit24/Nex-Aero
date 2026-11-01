import axios from 'axios';

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const API_BASE_URL = configuredBaseUrl || (import.meta.env.DEV ? 'http://localhost:8000' : '');

if (import.meta.env.PROD && !configuredBaseUrl) {
  console.warn(
    '[Nex Aero] Notice: VITE_API_BASE_URL environment variable is not defined. Production requests will use relative paths.'
  );
}

// 45s default timeout allows Render Free tier instances sufficient time to wake from idle spin-down
const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 45000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: timeoutMs,
});

export function getApiErrorMessage(error, fallback = 'The request could not be completed.') {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).filter(Boolean).join(', ') || fallback;
  }
  const status = error?.response?.status;
  if (status === 502 || status === 503 || error?.code === 'ECONNABORTED') {
    return 'Nex Aero backend is waking up. On free hosting, Render may take up to a minute to spin up from sleep. Please wait a moment and retry.';
  }
  if (error?.request && !error?.response) {
    return 'Nex Aero backend is waking up or temporarily unreachable. Free instances spin down during inactivity; please allow ~45s for cold start.';
  }
  return error?.message || fallback;
}

// Helper for idempotent GET requests to retry once if backend was spinning up (502/503)
async function safeGetWithRetry(url, config = {}, retries = 1) {
  try {
    return await apiClient.get(url, config);
  } catch (error) {
    const status = error?.response?.status;
    const isColdStart = status === 502 || status === 503 || error?.code === 'ECONNABORTED';
    if (retries > 0 && isColdStart) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return await apiClient.get(url, config);
    }
    throw error;
  }
}

export const api = {
  // Health & diagnostics
  getHealth: async () => {
    const res = await safeGetWithRetry('/api/health');
    return res.data;
  },

  // Engine fleet catalog
  getEngines: async () => {
    const res = await safeGetWithRetry('/api/engines');
    return res.data;
  },

  // Single engine telemetry
  getEngine: async (engineId) => {
    const res = await safeGetWithRetry(`/api/engines/${engineId}`);
    return res.data;
  },

  // Real-time ML inference (strictly NO automated retries on mutations to prevent duplicate inferences)
  predictRul: async (payload) => {
    const res = await apiClient.post('/api/predict', payload);
    return res.data;
  },

  // Historical inference audit logs
  getPredictions: async (limit = 50) => {
    const res = await safeGetWithRetry(`/api/predictions?limit=${limit}`);
    return res.data;
  },

  getModelMetadata: async () => {
    const res = await safeGetWithRetry('/api/model-metadata');
    return res.data;
  },

  // Historical degradation replay simulation
  replayEngine: async (engineId, sampleStride = 5) => {
    const res = await apiClient.post(
      `/api/demo/replay?engine_id=${engineId}&sample_stride=${sampleStride}`,
      null,
      { timeout: 75000 },
    );
    return res.data;
  },

  // Unsupervised anomaly detection
  getAnomalies: async (params = {}) => {
    const res = await safeGetWithRetry('/api/anomalies', { params });
    return res.data;
  },

  // TreeSHAP local explainability
  getExplain: async (engineId, cycle = null) => {
    const url = cycle ? `/api/explain/${engineId}?cycle=${cycle}` : `/api/explain/${engineId}`;
    const res = await safeGetWithRetry(url);
    return res.data;
  },

  // Explain custom telemetry payload
  explainCustom: async (payload) => {
    const res = await apiClient.post('/api/explain', payload);
    return res.data;
  },

  // Persistent maintenance alerts
  getAlerts: async (params = {}) => {
    const res = await safeGetWithRetry('/api/alerts', { params });
    return res.data;
  },

  createAlert: async (payload) => {
    const res = await apiClient.post('/api/alerts', payload);
    return res.data;
  },

  updateAlertStatus: async (alertId, status) => {
    const res = await apiClient.patch(`/api/alerts/${alertId}`, { status });
    return res.data;
  },

  deleteAlert: async (alertId) => {
    const res = await apiClient.delete(`/api/alerts/${alertId}`);
    return res.data;
  },
};

export default api;
