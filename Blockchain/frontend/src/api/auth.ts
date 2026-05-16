import api from './axios';
import type { AuthResponse } from '../types';

export const registerApi = (data: {
  email: string;
  password: string;
  fullName: string;
  role: 'CLIENT' | 'DEVELOPER';
}) => api.post<AuthResponse>('/api/auth/register', data).then((r) => r.data);

export const loginApi = (data: { email: string; password: string }) =>
  api.post<AuthResponse>('/api/auth/login', data).then((r) => r.data);
