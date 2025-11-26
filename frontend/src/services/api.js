import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    // First try localStorage
    let token = localStorage.getItem('access_token');
    
    // If no token in localStorage, try to get from Supabase session
    if (!token) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          token = session.access_token;
          // Sync to localStorage for future requests
          localStorage.setItem('access_token', token);
          localStorage.setItem('user', JSON.stringify(session.user));
        }
      } catch (err) {
        console.error('Failed to get Supabase session:', err);
      }
    }
    
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
      // Only redirect if not already on login/signup page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/signup') && !currentPath.includes('/auth/callback')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        // Use replace to avoid adding to history
        window.location.replace('/login');
      }
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
  processFree: (url) => axios.post(`${API_URL}/videos/process-free`, { url }),  // No auth required
  getHistory: (params) => api.get('/videos/history', { params }),
  getVideo: (videoId) => api.get(`/videos/${videoId}`),
  deleteVideo: (videoId) => api.delete(`/videos/${videoId}`),
  exportVideo: (videoId, format) => api.get(`/videos/${videoId}/export`, { params: { format }, responseType: 'blob' }),
  recheckClaim: (videoId, claimData) => api.post(`/videos/${videoId}/recheck-claim`, claimData),
  reportClaimError: (reportData) => axios.post(`${API_URL}/videos/report-claim-error`, reportData),  // No auth required
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
