import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Application, Stage, EndReason, StageChange } from '../types'

function genId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

export function useApplications(sheetId: string) {
  const applications = useLiveQuery(
    () => db.applications.where('sheetId').equals(sheetId).toArray(),
    [sheetId],
  ) ?? []

  async function addApplication(
    company: string,
    position: string,
  ): Promise<Application> {
    const ts = now()
    const app: Application = {
      id: genId(),
      sheetId,
      company,
      position,
      stage: 'DRAFT',
      nextAction: '修改简历、投递申请',
      keyDate: '',
      priority: 'P2',
      link: '',
      note: '',
      city: '',
      channel: '',
      resumeVersion: '',
      resumeLink: '',
      contact: '',
      detailNote: '',
      salary: '',
      createdAt: ts,
      updatedAt: ts,
      stageHistory: [{ stage: 'DRAFT', changedAt: ts }],
    }
    await db.applications.add(app)
    return app
  }

  async function updateApplication(
    id: string,
    changes: Partial<Omit<Application, 'id' | 'createdAt'>>,
  ) {
    await db.applications.update(id, { ...changes, updatedAt: now() })
  }

  async function updateStage(
    id: string,
    stage: Stage,
    endReason?: EndReason,
  ) {
    const app = await db.applications.get(id)
    if (!app) return
    const change: StageChange = { stage, changedAt: now() }
    const updates: Partial<Application> = {
      stage,
      endReason: stage === 'ENDED' ? (endReason ?? 'ARCHIVED') : undefined,
      stageHistory: [...app.stageHistory, change],
      updatedAt: now(),
    }
    await db.applications.update(id, updates)
  }

  async function deleteApplication(id: string) {
    await db.applications.delete(id)
  }

  async function deleteMany(ids: string[]) {
    await db.applications.bulkDelete(ids)
  }

  async function bulkUpdateStage(
    ids: string[],
    stage: Stage,
    endReason?: EndReason,
  ) {
    await db.transaction('rw', db.applications, async () => {
      for (const id of ids) {
        await updateStage(id, stage, endReason)
      }
    })
  }

  async function clearAll() {
    await db.applications.where('sheetId').equals(sheetId).delete()
  }

  async function importApplications(apps: Application[]) {
    await db.transaction('rw', db.applications, async () => {
      // Clear current sheet's data
      await db.applications.where('sheetId').equals(sheetId).delete()
      // Assign all imported apps to current sheet
      const mapped = apps.map(a => ({ ...a, sheetId }))
      await db.applications.bulkAdd(mapped)
    })
  }

  return {
    applications,
    addApplication,
    updateApplication,
    updateStage,
    deleteApplication,
    deleteMany,
    bulkUpdateStage,
    clearAll,
    importApplications,
  }
}
