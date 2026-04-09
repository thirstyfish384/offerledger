import type { Request } from 'express'

export interface AuthRequest extends Request {
  userId?: string
}

// camelCase <-> snake_case mapping for Application
const FIELD_MAP: [string, string][] = [
  ['sheetId', 'sheet_id'],
  ['endReason', 'end_reason'],
  ['nextAction', 'next_action'],
  ['keyDate', 'key_date'],
  ['resumeVersion', 'resume_version'],
  ['resumeLink', 'resume_link'],
  ['detailNote', 'detail_note'],
  ['stageHistory', 'stage_history'],
  ['createdAt', 'created_at'],
  ['updatedAt', 'updated_at'],
  ['userId', 'user_id'],
  ['passwordHash', 'password_hash'],
]

const camelToSnake = new Map(FIELD_MAP.map(([c, s]) => [c, s]))
const snakeToCamel = new Map(FIELD_MAP.map(([c, s]) => [s, c]))

export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake.get(key) || key
    if (snakeKey === 'stage_history' && Array.isArray(value)) {
      result[snakeKey] = JSON.stringify(value)
    } else {
      result[snakeKey] = value
    }
  }
  return result
}

export function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel.get(key) || key
    if (camelKey === 'stageHistory' && typeof value === 'string') {
      try { result[camelKey] = JSON.parse(value) } catch { result[camelKey] = [] }
    } else {
      result[camelKey] = value
    }
  }
  // Remove internal fields from API responses
  delete result.userId
  delete result.passwordHash
  return result
}
