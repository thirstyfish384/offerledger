import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db/connection.js'
import { toCamelCase, toSnakeCase } from '../types.js'
import type { AuthRequest } from '../types.js'

const router = Router()

const CURRENT_SCHEMA_VERSION = 2

const sheetSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().optional(),
  createdAt: z.string(),
})

const importSchema = z.object({
  schemaVersion: z.number(),
  sheets: z.array(sheetSchema).optional(),
  applications: z.array(z.record(z.string(), z.unknown())),
})

// GET /api/sync/export — export all user data
router.get('/export', (req, res) => {
  const { userId } = req as AuthRequest

  const sheets = db.prepare('SELECT * FROM sheets WHERE user_id = ? ORDER BY "order" ASC').all(userId!)
  const applications = db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY updated_at DESC').all(userId!)

  res.json({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sheets: sheets.map(s => toCamelCase(s as Record<string, unknown>)),
    applications: applications.map(a => toCamelCase(a as Record<string, unknown>)),
  })
})

// POST /api/sync/import — import data (used for IndexedDB migration & restore)
router.post('/import', (req, res) => {
  const { userId } = req as AuthRequest
  const parsed = importSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message })
    return
  }

  if (parsed.data.schemaVersion > CURRENT_SCHEMA_VERSION) {
    res.status(400).json({ error: `备份来自更高版本（v${parsed.data.schemaVersion}），当前版本无法导入` })
    return
  }

  const sheets = parsed.data.sheets ?? []
  const applications = parsed.data.applications

  const txn = db.transaction(() => {
    let sheetsImported = 0
    let appsImported = 0

    // Upsert sheets
    const upsertSheet = db.prepare(
      `INSERT OR REPLACE INTO sheets (id, user_id, name, "order", created_at) VALUES (?, ?, ?, ?, ?)`
    )
    for (const sheet of sheets) {
      upsertSheet.run(sheet.id, userId, sheet.name, sheet.order ?? 0, sheet.createdAt)
      sheetsImported++
    }

    // If no sheets provided but apps exist, ensure a default sheet
    if (sheets.length === 0 && applications.length > 0) {
      const existing = db.prepare('SELECT id FROM sheets WHERE user_id = ? LIMIT 1').get(userId!)
      if (!existing) {
        upsertSheet.run('default', userId, '我的求职', 0, new Date().toISOString())
        sheetsImported++
      }
    }

    // Upsert applications
    for (const rawApp of applications) {
      const snaked = toSnakeCase(rawApp as Record<string, unknown>)
      const id = String(snaked.id || crypto.randomUUID())
      const sheetId = String(snaked.sheet_id || 'default')

      // Ensure the sheet exists for this user
      const sheetExists = db.prepare('SELECT id FROM sheets WHERE id = ? AND user_id = ?').get(sheetId, userId!)
      const finalSheetId = sheetExists ? sheetId : (() => {
        const first = db.prepare('SELECT id FROM sheets WHERE user_id = ? LIMIT 1').get(userId!) as { id: string } | undefined
        return first?.id || 'default'
      })()

      db.prepare(`INSERT OR REPLACE INTO applications (
        id, user_id, sheet_id, company, position, stage, end_reason,
        next_action, key_date, priority, link, note,
        city, channel, resume_version, resume_link, contact, detail_note, salary,
        stage_history, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id,
        userId,
        finalSheetId,
        String(snaked.company || ''),
        String(snaked.position || ''),
        String(snaked.stage || 'DRAFT'),
        snaked.end_reason ?? null,
        String(snaked.next_action || ''),
        String(snaked.key_date || ''),
        String(snaked.priority || 'P2'),
        String(snaked.link || ''),
        String(snaked.note || ''),
        String(snaked.city || ''),
        String(snaked.channel || ''),
        String(snaked.resume_version || ''),
        String(snaked.resume_link || ''),
        String(snaked.contact || ''),
        String(snaked.detail_note || ''),
        String(snaked.salary || ''),
        typeof snaked.stage_history === 'string' ? snaked.stage_history : JSON.stringify(snaked.stage_history || []),
        String(snaked.created_at || new Date().toISOString()),
        String(snaked.updated_at || new Date().toISOString()),
      )
      appsImported++
    }

    return { sheets: sheetsImported, applications: appsImported }
  })

  const result = txn()
  res.json({ imported: result })
})

export default router
