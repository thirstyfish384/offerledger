import Dexie, { type Table } from 'dexie'
import type { Application, Sheet } from '../types'

class JobTrackerDB extends Dexie {
  applications!: Table<Application, string>
  sheets!: Table<Sheet, string>

  constructor() {
    super('JobTrackerDB')

    this.version(1).stores({
      applications: 'id, company, position, stage, priority, keyDate, updatedAt',
    })

    this.version(2).stores({
      applications: 'id, sheetId, company, position, stage, priority, keyDate, updatedAt',
      sheets: 'id',
    }).upgrade(async tx => {
      const defaultSheet = {
        id: 'default',
        name: '我的求职',
        order: 0,
        createdAt: new Date().toISOString(),
      }
      await tx.table('sheets').add(defaultSheet)
      await tx.table('applications').toCollection().modify({ sheetId: 'default' })
    })

    this.version(3).stores({
      applications: 'id, sheetId, company, position, stage, priority, keyDate, updatedAt',
      sheets: 'id, order',
    }).upgrade(async tx => {
      // Add order field to existing sheets that don't have it
      let idx = 0
      await tx.table('sheets').toCollection().modify(sheet => {
        if (sheet.order == null) {
          sheet.order = idx++
        }
      })
    })
  }
}

export const db = new JobTrackerDB()
