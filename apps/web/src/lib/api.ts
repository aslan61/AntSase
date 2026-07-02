import type { PlacementResult, VehicleRow } from '@sase/shared';
import { API_KEY, API_URL } from '../config';

export interface UploadSummary {
  readonly id: string;
  readonly filename: string;
  readonly createdAt: string;
  readonly totalRows: number;
  readonly validCount: number;
  readonly warningCount: number;
  readonly unplacedCount: number;
}

interface ApiErrorBody { readonly error?: { readonly message?: string } }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(API_KEY ? { 'x-api-key': API_KEY } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.error?.message ?? `Sunucu hatası (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function saveUpload(filename: string, rows: readonly VehicleRow[]): Promise<{ upload: UploadSummary; report: PlacementResult }> {
  return api('/api/uploads', { method: 'POST', body: JSON.stringify({ filename, rows }) });
}

export async function getUploads(): Promise<readonly UploadSummary[]> {
  const result = await api<{ readonly items: readonly UploadSummary[] }>('/api/uploads');
  return result.items;
}

export async function getUpload(id: string): Promise<{ readonly upload: UploadSummary; readonly report: PlacementResult }> {
  return api(`/api/uploads/${encodeURIComponent(id)}`);
}

export async function saveSnapshot(uploadId: string, name: string, data: Readonly<Record<string, unknown>>): Promise<string> {
  const result = await api<{ readonly snapshot: { readonly id: string } }>('/api/snapshots', { method: 'POST', body: JSON.stringify({ uploadId, name, data }) });
  return result.snapshot.id;
}

export async function getSnapshot(id: string): Promise<{ readonly uploadId: string; readonly data: Readonly<Record<string, unknown>> }> {
  const result = await api<{ readonly snapshot: { readonly uploadId: string; readonly data: Readonly<Record<string, unknown>> } }>(`/api/snapshots/${encodeURIComponent(id)}`);
  return result.snapshot;
}
