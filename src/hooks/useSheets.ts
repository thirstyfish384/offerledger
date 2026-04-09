import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Sheet } from '../types'

export function useSheets() {
  const sheets = useLiveQuery(
    () => db.sheets.orderBy('order').toArray(),
    [],
  ) ?? []

  async function ensureDefault(): Promise<string> {
    const count = await db.sheets.count()
    if (count === 0) {
      const sheet: Sheet = {
        id: 'default',
        name: '我的求职',
        order: 0,
        createdAt: new Date().toISOString(),
      }
      await db.sheets.add(sheet)
      return sheet.id
    }
    const first = await db.sheets.orderBy('order').first()
    return first!.id
  }

  async function addSheet(name: string): Promise<Sheet> {
    const all = await db.sheets.toArray()
    const maxOrder = all.reduce((max, s) => Math.max(max, s.order ?? 0), -1)
    const sheet: Sheet = {
      id: crypto.randomUUID(),
      name,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    }
    await db.sheets.add(sheet)
    return sheet
  }

  async function renameSheet(id: string, name: string) {
    await db.sheets.update(id, { name })
  }

  async function deleteSheet(id: string) {
    await db.transaction('rw', [db.sheets, db.applications], async () => {
      await db.applications.where('sheetId').equals(id).delete()
      await db.sheets.delete(id)
    })
  }

  async function reorderSheets(orderedIds: string[]) {
    await db.transaction('rw', db.sheets, async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.sheets.update(orderedIds[i], { order: i })
      }
    })
  }

  return {
    sheets,
    ensureDefault,
    addSheet,
    renameSheet,
    deleteSheet,
    reorderSheets,
  }
}
