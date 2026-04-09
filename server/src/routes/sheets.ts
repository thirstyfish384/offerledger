import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { db } from '../db/connection.js'
import { AppError } from '../middleware/errorHandler.js'
import { toCamelCase } from '../types.js'
import type { AuthRequest } from '../types.js'

const router = Router()

const createSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '表单名称不能为空').max(50),
  order: z.number().int().optional(),
  createdAt: z.string().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  order: z.number().int().optional(),
})

const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
})

// GET /api/sheets
router.get('/', (req, res) => {
  const { userId } = req as AuthRequest
  const rows = db.prepare('SELECT * FROM sheets WHERE user_id = ? ORDER BY "order" ASC').all(userId!)
  res.json(rows.map(r => toCamelCase(r as Record<string, unknown>)))
})

// POST /api/sheets
router.post('/', (req, res) => {
  const { userId } = req as AuthRequest
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }

  const { name, createdAt } = parsed.data
  const id = parsed.data.id || uuidv4()

  // Auto-calculate order
  const maxRow = db.prepare('SELECT MAX("order") as max_order FROM sheets WHERE user_id = ?').get(userId!) as { max_order: number | null }
  const order = parsed.data.order ?? ((maxRow.max_order ?? -1) + 1)

  const ts = createdAt || new Date().toISOString()

  db.prepare('INSERT INTO sheets (id, user_id, name, "order", created_at) VALUES (?, ?, ?, ?, ?)').run(id, userId, name, order, ts)

  const row = db.prepare('SELECT * FROM sheets WHERE id = ?').get(id)
  res.status(201).json(toCamelCase(row as Record<string, unknown>))
})

// PUT /api/sheets/reorder (must be before /:id)
router.put('/reorder', (req, res) => {
  const { userId } = req as AuthRequest
  const parsed = reorderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }

  const updateStmt = db.prepare('UPDATE sheets SET "order" = ? WHERE id = ? AND user_id = ?')
  const txn = db.transaction((ids: string[]) => {
    for (let i = 0; i < ids.length; i++) {
      updateStmt.run(i, ids[i], userId)
    }
  })
  txn(parsed.data.orderedIds)

  const rows = db.prepare('SELECT * FROM sheets WHERE user_id = ? ORDER BY "order" ASC').all(userId!)
  res.json(rows.map(r => toCamelCase(r as Record<string, unknown>)))
})

// PUT /api/sheets/:id
router.put('/:id', (req, res) => {
  const { userId } = req as AuthRequest
  const { id } = req.params
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }

  const existing = db.prepare('SELECT id FROM sheets WHERE id = ? AND user_id = ?').get(id, userId!)
  if (!existing) throw new AppError(404, '表单不存在')

  const updates: string[] = []
  const values: unknown[] = []
  if (parsed.data.name !== undefined) { updates.push('name = ?'); values.push(parsed.data.name) }
  if (parsed.data.order !== undefined) { updates.push('"order" = ?'); values.push(parsed.data.order) }

  if (updates.length > 0) {
    values.push(id, userId)
    db.prepare(`UPDATE sheets SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)
  }

  const row = db.prepare('SELECT * FROM sheets WHERE id = ?').get(id)
  res.json(toCamelCase(row as Record<string, unknown>))
})

// DELETE /api/sheets/:id
router.delete('/:id', (req, res) => {
  const { userId } = req as AuthRequest
  const { id } = req.params

  const existing = db.prepare('SELECT id FROM sheets WHERE id = ? AND user_id = ?').get(id, userId!)
  if (!existing) throw new AppError(404, '表单不存在')

  const sheetCount = (db.prepare('SELECT COUNT(*) as cnt FROM sheets WHERE user_id = ?').get(userId!) as { cnt: number }).cnt
  if (sheetCount <= 1) throw new AppError(400, '至少保留一个表单')

  const txn = db.transaction(() => {
    db.prepare('DELETE FROM applications WHERE sheet_id = ? AND user_id = ?').run(id, userId)
    db.prepare('DELETE FROM sheets WHERE id = ? AND user_id = ?').run(id, userId)
  })
  txn()

  res.status(204).end()
})

export default router
