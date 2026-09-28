import { DocumentItem, UploadMeta } from '../types';
import { api } from './api';

export const documentApi = {
  upload(file: File, meta: UploadMeta = {}) {
    const form = new FormData();
    form.append('file', file);
    (Object.keys(meta) as (keyof UploadMeta)[]).forEach((k) => { if (meta[k]) form.append(k, meta[k] as string); });
    return api.postForm<DocumentItem>('/admin/documents', form);
  },
  list: () => api.get<DocumentItem[]>('/admin/documents'),
  get: (id: string) => api.get<DocumentItem>(`/admin/documents/${id}`),
  delete: (id: string) => api.delete<{ id: string; deleted: boolean }>(`/admin/documents/${id}`),
};
