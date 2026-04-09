import { api } from './client.js'
import type { Application, Sheet, Stage, EndReason } from '../types/index.js'

// ── Sheets ──

export async function fetchSheets(): Promise<Sheet[]> {
  return api.get<Sheet[]>('/api/sheets')
}

export async function createSheet(name: string, id?: string, order?: number): Promise<Sheet> {
  return api.post<Sheet>('/api/sheets', { name, id, order })
}

export async function updateSheet(id: string, data: { name?: string; order?: number }): Promise<Sheet> {
  return api.put<Sheet>(`/api/sheets/${id}`, data)
}

export async function deleteSheet(id: string): Promise<void> {
  return api.delete(`/api/sheets/${id}`)
}

export async function reorderSheets(orderedIds: string[]): Promise<Sheet[]> {
  return api.put<Sheet[]>('/api/sheets/reorder', { orderedIds })
}

// ── Applications ──

export async function fetchApplications(sheetId: string): Promise<Application[]> {
  return api.get<Application[]>(`/api/applications?sheetId=${encodeURIComponent(sheetId)}`)
}

export async function createApplication(data: Partial<Application>): Promise<Application> {
  return api.post<Application>('/api/applications', data)
}

export async function updateApplication(id: string, changes: Partial<Application>): Promise<Application> {
  return api.put<Application>(`/api/applications/${id}`, changes)
}

export async function deleteApplication(id: string): Promise<void> {
  return api.delete(`/api/applications/${id}`)
}

export async function bulkUpdateStage(ids: string[], stage: Stage, endReason?: EndReason): Promise<{ updated: number }> {
  return api.post('/api/applications/bulk-stage', { ids, stage, endReason })
}

export async function bulkDeleteApplications(ids: string[]): Promise<{ deleted: number }> {
  return api.post('/api/applications/bulk-delete', { ids })
}

// ── Sync ──

export async function exportAllData(): Promise<{
  schemaVersion: number; exportedAt: string; sheets: Sheet[]; applications: Application[]
}> {
  return api.get('/api/sync/export')
}

export async function importData(data: {
  schemaVersion: number; sheets?: Sheet[]; applications: Application[]
}): Promise<{ imported: { sheets: number; applications: number } }> {
  return api.post('/api/sync/import', data)
}
