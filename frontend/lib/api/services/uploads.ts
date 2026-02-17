import api, { type PaginatedResponse } from '../client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface UploadFilters {
  file_type?: string;
  organization?: string;
  content_type?: string;
  search?: string;
  page?: string;
  page_size?: string;
  ordering?: string;
}

export interface CreateUploadRequest {
  name: string;
  file: File;
  description?: string;
  organization?: number;
  content_type?: string;
  object_id?: number;
}

export interface UpdateUploadRequest {
  name?: string;
  description?: string;
  organization?: number;
  content_type?: string;
  object_id?: number;
}

export interface UploadRecord {
  id: number;
  name: string;
  file: string;
  file_url?: string | null;
  file_type: 'document' | 'image' | 'spreadsheet' | 'other';
  file_size: number;
  mime_type?: string;
  description?: string;
  organization?: number | null;
  organization_name?: string | null;
  content_type?: string;
  object_id?: number | null;
  created_at: string;
  created_by?: number | null;
  created_by_name?: string | null;
}

export interface ImportJob {
  id: number;
  upload: number;
  upload_name?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  processed_rows: number;
  successful_rows: number;
  failed_rows: number;
  progress: number;
  errors?: unknown[];
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  created_by?: number | null;
}

export const uploadsService = {
  list: (filters?: UploadFilters) =>
    api.get<PaginatedResponse<UploadRecord>>('/uploads/', filters),

  listAll: (filters?: UploadFilters) =>
    api.get<PaginatedResponse<UploadRecord>>('/uploads/', {
      page_size: '200',
      ...filters,
    }),

  get: (id: number) => api.get<UploadRecord>(`/uploads/${id}/`),

  create: async (data: CreateUploadRequest) => {
    const form = new FormData();
    form.append('name', data.name);
    form.append('file', data.file);
    if (data.description) form.append('description', data.description);
    if (data.organization) form.append('organization', String(data.organization));
    if (data.content_type) form.append('content_type', data.content_type);
    if (data.object_id) form.append('object_id', String(data.object_id));

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const response = await fetch(`${API_BASE_URL}/uploads/`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
      const errorBody = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();
      throw errorBody;
    }

    return contentType?.includes('application/json') ? response.json() : {};
  },

  update: (id: number, data: UpdateUploadRequest) =>
    api.patch<UploadRecord>(`/uploads/${id}/`, data),

  delete: (id: number) => api.delete(`/uploads/${id}/`),

  startImport: (id: number) => api.post<ImportJob>(`/uploads/${id}/start_import/`),

  listImports: (filters?: { status?: string; upload?: string }) =>
    api.get<PaginatedResponse<ImportJob>>('/uploads/imports/', filters),
};

export default uploadsService;
