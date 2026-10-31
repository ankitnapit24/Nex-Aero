import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export function getApiErrorMessage(error, fallback = 'The request could not be completed.') {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).filter(Boolean).join(', ') || fallback;
  }
  if (error?.code === 'ECONNABORTED') return 'The backend did not respond in time.';
  if (error?.request && !error?.response) return 'Cannot reach the backend. Check that the API server is running.';
  return error?.message || fallback;
}

export const api = {
  // Health & diagnostics
  getHealth: async () => {
    const res = await apiClient.get('/api/health');
    return res.data;
  },

  // Engine fleet catalog
  getEngines: async () => {
    const res = await apiClient.get('/api/engines');
    return res.data;
  },

  // Single engine telemetry
  getEngine: async (engineId) => {
    const res = await apiClient.get(`/api/engines/${engineId}`);
    return res.data;
  },

  // Real-time ML inference
  predictRul: async (payload) => {
    const res = await apiClient.post('/api/predict', payload);
    return res.data;
  },

  // Historical inference audit logs
  getPredictions: async (limit = 50) => {
    const res = await apiClient.get(`/api/predictions?limit=${limit}`);
    return res.data;
  },

  getModelMetadata: async () => {
    const res = await apiClient.get('/api/model-metadata');
    return res.data;
  },

  // Historical degradation replay simulation
  replayEngine: async (engineId, sampleStride = 5) => {
    const res = await apiClient.post(
      `/api/demo/replay?engine_id=${engineId}&sample_stride=${sampleStride}`,
      null,
      { timeout: 60000 },
    );
    return res.data;
  },

  // Unsupervised anomaly detection
  getAnomalies: async (params = {}) => {
    const res = await apiClient.get('/api/anomalies', { params });
    return res.data;
  },

  // TreeSHAP local explainability
  getExplain: async (engineId, cycle = null) => {
    const url = cycle ? `/api/explain/${engineId}?cycle=${cycle}` : `/api/explain/${engineId}`;
    const res = await apiClient.get(url);
    return res.data;
  },

  // Explain custom telemetry payload
  explainCustom: async (payload) => {
    const res = await apiClient.post('/api/explain', payload);
    return res.data;
  },

  // Persistent maintenance alerts
  getAlerts: async (params = {}) => {
    const res = await apiClient.get('/api/alerts', { params });
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
