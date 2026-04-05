import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://app.eventbase.work';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Auth interceptor — voeg JWT token toe aan elke request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('auth_token');
      // Trigger navigation naar login — via global state of event
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  savePushToken: (token: string) =>
    api.put('/users/me/push-token', { token }),
};

// Shifts
export const shiftsApi = {
  getMyShifts: () => api.get('/shifts/my'),
  getOpenShifts: () => api.get('/shifts/open'),
  getShift: (id: string) => api.get(`/shifts/${id}`),
  requestShift: (id: string) => api.post(`/shifts/${id}/request`),
  getTravelDistance: (shiftId: string) => api.get(`/shifts/${shiftId}/travel-distance`),
};

// Shift invitations
export const invitationsApi = {
  getMyInvitations: () => api.get('/shift-invitations/my'),
  respond: (id: string, status: 'ACCEPTED' | 'DECLINED') =>
    api.put(`/shift-invitations/${id}/respond`, { status }),
};

// Time entries
export const timeEntriesApi = {
  clockIn: (shiftId: string, lat?: number, lng?: number) =>
    api.post('/time-entries/clock-in', { shiftId, lat, lng }),
  clockOut: (timeEntryId: string, lat?: number, lng?: number) =>
    api.post('/time-entries/clock-out', { timeEntryId, lat, lng }),
  declare: (id: string, declaredHours: number, declarationNote?: string) =>
    api.put(`/time-entries/${id}/declare`, { declaredHours, declarationNote }),
  getMyEntries: () => api.get('/time-entries/my'),
  getMyMonthly: (year: number, month: number) =>
    api.get(`/time-entries/my/monthly?year=${year}&month=${month}`),
};

// Travel time
export const travelTimeApi = {
  submit: (data: { timeEntryId: string; travelMinutes: number; note?: string }) =>
    api.post('/travel-time-entries', data),
  getMyEntries: () => api.get('/travel-time-entries/my'),
};

// Expenses
export const expensesApi = {
  getMyExpenses: () => api.get('/expenses'),
  submit: (data: FormData) =>
    api.post('/expenses', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  declare: (id: string) => api.put(`/expenses/${id}/submit`),
};

// HR
export const hrApi = {
  getMyContract: () => api.get('/hr/me/contract'),
};
