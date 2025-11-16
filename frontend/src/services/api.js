import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (email, password) => api.post('/auth/signup', { email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  resetPassword: (email) => api.post('/auth/reset-password', { email }),
};

// User API
export const userAPI = {
  getCurrentUser: () => api.get('/users/me'),
  getUsage: () => api.get('/users/usage'),
  deleteAccount: (password) => api.delete('/users/me', { data: { password } }),
};

// Video API
export const videoAPI = {
  process: (url, analysisType) => api.post('/videos/process', { url, analysis_type: analysisType }),
  getHistory: (params) => api.get('/videos/history', { params }),
  getVideo: (videoId) => api.get(`/videos/${videoId}`),
  deleteVideo: (videoId) => api.delete(`/videos/${videoId}`),
  exportVideo: (videoId, format) => api.get(`/videos/${videoId}/export`, { params: { format }, responseType: 'blob' }),
};

// Payment API
export const paymentAPI = {
  createCheckoutSession: (priceId) => api.post('/payments/create-checkout-session', { price_id: priceId }),
  createPortalSession: () => api.post('/payments/create-portal-session'),
  cancelSubscription: () => api.post('/payments/cancel-subscription'),
  getBillingHistory: () => api.get('/payments/billing-history'),
};

export const referralAPI = {
  getCode: () => api.get('/referrals/code'),
  applyCode: (code) => api.post('/referrals/apply', { referral_code: code }),
  getStats: () => api.get('/referrals/stats'),
};

export default api;

