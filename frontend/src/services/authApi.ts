import { AuthResult, User } from '../types';
import { api } from './api';

export const authApi = {
  login: (email: string, password: string) => api.post<AuthResult>('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post<AuthResult>('/auth/register', { name, email, password }),
  logout: () => api.post<{ loggedOut: boolean }>('/auth/logout'),
  getCurrentUser: async () => (await api.get<{ user: User }>('/auth/me')).user,
};
