import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { db } from '../db/connection.js'
import { AppError } from '../middleware/errorHandler.js'
import { toCamelCase, toSnakeCase } from '../types.js'
import type { AuthRequest } from '../types.js'

const router = Router()

const VALID_STAGES = ['DRAFT', 'APPLIED', 'ASSESSMENT', 'INTERVIEWING', 'WAITING', 'OFFER', 'ENDED'] as const
const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const
const VALID_END_REASONS = ['REJECTED', 'WITHDRAWN', 'ARCHIVED'] as const

const stageChangeSchema = z.object({
  stage: z.enum(VALID_STAGES),
  changedAt: z.string(),
})

const createSchema = z.object({
  id: z.string().optional(),
  sheetId: z.string(),
  company: z.string().default(''),
  position: z.string().default(''),
  stage: z.enum(VALID_STAGES).default('DRAFT'),
  endReason: z.enum(VALID_END_REASONS).nullish(),
  nextAction: z.string().default(''),
  keyDate: z.string().default(''),
  priority: z.enum(VALID_PRIORITIES).default('P2'),
  link: z.string().default(''),
  note: z.string().default(''),
  city: z.string().default(''),
  channel: z.string().default(''),
  resumeVersion: z.string().default(''),
  resumeLink: z.string().default(''),
  contact: z.string().default(''),
  detailNote: z.string().default(''),
  salary: z.string().default(''),
  stageHistory: z.array(stageChangeSchema).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

const updateSchema = createSchema.partial().omit({ id: true })

const bulkStageSchema = z.object({
  ids: z.array(z.string()).min(1),
  stage: z.enum(VALID_STAGES),
  endReason: z.enum(VALID_END_REASONS).nullish(),
})

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1),
})

// GET /api/applications?sheetId=xxx
router.get('/', (req, res) => {
  const { userId } = req as AuthRequest
  const { sheetId } = req.query

  let rows
  if (sheetId) {
    rows = db.prepare('SELECT * FROM applications WHERE user_id = ? AND sheet_id = ? ORDER BY updated_at DESC').all(userId!, sheetId)
  } else {
    rows = db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY updated_at DESC').all(userId!)
  }

  res.json(rows.map(r => toCamelCase(r as Record<string, unknown>)))
})

// GET /api/applications/:id
router.get('/:id', (req, res) => {
  const { userId } = req as AuthRequest
  const row = db.prepare('SELECT * FROM applications WHERE id = ? AND user_id = ?').get(req.params.id, userId!)
  if (!row) throw new AppError(404, '记录不存在')
  res.json(toCamelCase(row as Record<string, unknown>))
})

// POST /api/applications
router.post('/', (req, res) => {
  const { userId } = req as AuthRequest
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }

  const data = parsed.data
  const id = data.id || uuidv4()
  const ts = new Date().toISOString()
  const snaked = toSnakeCase({
    ...data,
    id,
    createdAt: data.createdAt || ts,
    updatedAt: data.updatedAt || ts,
  })

  const columns = ['id', 'user_id', ...Object.keys(snaked).filter(k => k !== 'id')]
  const placeholders = columns.map(() => '?')
  const values = columns.map(c => c === 'user_id' ? userId : snaked[c])

  db.prepare(`INSERT INTO applications (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`).run(...values)

  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id)
  res.status(201).json(toCamelCase(row as Record<string, unknown>))
})

// PUT /api/applications/:id
router.put('/:id', (req, res) => {
  const { userId } = req as AuthRequest
  const { id } = req.params

  const existing = db.prepare('SELECT * FROM applications WHERE id = ? AND user_id = ?').get(id, userId!)
  if (!existing) throw new AppError(404, '记录不存在')

  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }

  const snaked = toSnakeCase(parsed.data as Record<string, unknown>)
  snaked.updated_at = new Date().toISOString()

  const updates = Object.keys(snaked).map(k => `${k} = ?`)
  const values = [...Object.values(snaked), id, userId]

  db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)

  const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(id)
  res.json(toCamelCase(row as Record<string, unknown>))
})

// DELETE /api/applications/:id
router.delete('/:id', (req, res) => {
  const { userId } = req as AuthRequest
  const result = db.prepare('DELETE FROM applications WHERE id = ? AND user_id = ?').run(req.params.id, userId!)
  if (result.changes === 0) throw new AppError(404, '记录不存在')
  res.status(204).end()
})

// POST /api/applications/bulk-stage
router.post('/bulk-stage', (req, res) => {
  const { userId } = req as AuthRequest
  const parsed = bulkStageSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }

  const { ids, stage, endReason } = parsed.data
  const ts = new Date().toISOString()

  const txn = db.transaction(() => {
    let updated = 0
    for (const id of ids) {
      const app = db.prepare('SELECT stage_history FROM applications WHERE id = ? AND user_id = ?').get(id, userId!) as { stage_history: string } | undefined
      if (!app) continue

      let history: { stage: string; changedAt: string }[] = []
      try { history = JSON.parse(app.stage_history) } catch { /* empty */ }
      history.push({ stage, changedAt: ts })

      db.prepare(
        'UPDATE applications SET stage = ?, end_reason = ?, stage_history = ?, updated_at = ? WHERE id = ? AND user_id = ?'
      ).run(stage, stage === 'ENDED' ? (endReason ?? 'ARCHIVED') : null, JSON.stringify(history), ts, id, userId)
      updated++
    }
    return updated
  })

  const updated = txn()
  res.json({ updated })
})

// POST /api/applications/bulk-delete
router.post('/bulk-delete', (req, res) => {
  const { userId } = req as AuthRequest
  const parsed = bulkDeleteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }

  const placeholders = parsed.data.ids.map(() => '?').join(', ')
  const result = db.prepare(`DELETE FROM applications WHERE id IN (${placeholders}) AND user_id = ?`).run(...parsed.data.ids, userId!)
  res.json({ deleted: result.changes })
})

export default router
