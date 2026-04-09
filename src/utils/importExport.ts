import type { Application, Sheet, ExportData, Stage, Priority } from '../types'
import { STAGE_ORDER } from '../types'

const CURRENT_SCHEMA_VERSION = 2
const VALID_STAGES = new Set<string>(STAGE_ORDER)
const VALID_PRIORITIES = new Set<string>(['P0', 'P1', 'P2', 'P3'])

export function exportData(sheets: Sheet[], applications: Application[]): string {
  const data: ExportData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sheets,
    applications,
  }
  return JSON.stringify(data, null, 2)
}

export function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface ImportResult {
  ok: boolean
  applications?: Application[]
  error?: string
}

export async function parseImportFile(file: File): Promise<ImportResult> {
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!data || typeof data !== 'object') {
      return { ok: false, error: '文件内容不是有效的 JSON 对象' }
    }
    if (typeof data.schemaVersion !== 'number') {
      return { ok: false, error: '缺少 schemaVersion 字段' }
    }
    if (data.schemaVersion > CURRENT_SCHEMA_VERSION) {
      return { ok: false, error: `备份来自更高版本（v${data.schemaVersion}），当前版本无法导入` }
    }
    if (!Array.isArray(data.applications)) {
      return { ok: false, error: '缺少 applications 字段' }
    }

    // 清洗数据
    const apps: Application[] = data.applications.map((raw: Record<string, unknown>) => ({
      id: String(raw.id || crypto.randomUUID()),
      sheetId: String(raw.sheetId || 'default'),
      company: String(raw.company || ''),
      position: String(raw.position || ''),
      stage: VALID_STAGES.has(raw.stage as string) ? raw.stage as Stage : 'DRAFT',
      endReason: raw.endReason,
      nextAction: String(raw.nextAction || ''),
      keyDate: String(raw.keyDate || ''),
      priority: VALID_PRIORITIES.has(raw.priority as string) ? raw.priority as Priority : 'P2',
      link: String(raw.link || ''),
      note: String(raw.note || ''),
      city: String(raw.city || ''),
      channel: String(raw.channel || ''),
      resumeVersion: String(raw.resumeVersion || ''),
      resumeLink: String(raw.resumeLink || ''),
      contact: String(raw.contact || ''),
      detailNote: String(raw.detailNote || ''),
      salary: String(raw.salary || ''),
      createdAt: String(raw.createdAt || new Date().toISOString()),
      updatedAt: String(raw.updatedAt || new Date().toISOString()),
      stageHistory: Array.isArray(raw.stageHistory) ? raw.stageHistory : [],
    }))

    return { ok: true, applications: apps }
  } catch {
    return { ok: false, error: '文件解析失败，请确认是有效的 JSON 文件' }
  }
}
