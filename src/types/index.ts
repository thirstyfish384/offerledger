export type Stage =
  | 'DRAFT'        // 待投
  | 'APPLIED'      // 已投
  | 'ASSESSMENT'   // 测评/笔试
  | 'INTERVIEWING' // 面试中
  | 'WAITING'      // 等结果
  | 'OFFER'        // Offer
  | 'ENDED'        // 已结束

export type EndReason = 'REJECTED' | 'WITHDRAWN' | 'ARCHIVED'

export type Priority = 'P0' | 'P1' | 'P2' | 'P3'

export interface StageChange {
  stage: Stage
  changedAt: string // ISO 8601
}

export interface Application {
  id: string
  sheetId: string
  company: string
  position: string
  stage: Stage
  endReason?: EndReason
  nextAction: string
  keyDate: string       // YYYY-MM-DD or ''
  priority: Priority
  link: string
  note: string
  // 抽屉字段
  city: string
  channel: string
  resumeVersion: string
  resumeLink: string
  contact: string
  detailNote: string
  salary: string
  // 元数据
  createdAt: string
  updatedAt: string
  stageHistory: StageChange[]
}

export const STAGE_LABELS: Record<Stage, string> = {
  DRAFT: '待投',
  APPLIED: '已投',
  ASSESSMENT: '测评/笔试',
  INTERVIEWING: '面试中',
  WAITING: '等结果',
  OFFER: 'Offer',
  ENDED: '已结束',
}

export const STAGE_ORDER: Stage[] = [
  'DRAFT', 'APPLIED', 'ASSESSMENT', 'INTERVIEWING', 'WAITING', 'OFFER', 'ENDED',
]

export const ACTIVE_STAGES: Stage[] = [
  'DRAFT', 'APPLIED', 'ASSESSMENT', 'INTERVIEWING', 'WAITING', 'OFFER',
]

export const PRIORITY_LABELS: Record<Priority, string> = {
  P0: 'P0 紧急',
  P1: 'P1 重要',
  P2: 'P2 普通',
  P3: 'P3 低',
}

export const END_REASON_LABELS: Record<EndReason, string> = {
  REJECTED: '被拒绝',
  WITHDRAWN: '我放弃',
  ARCHIVED: '已归档',
}

export interface Sheet {
  id: string
  name: string
  order: number
  createdAt: string
}

export interface ExportData {
  schemaVersion: number
  exportedAt: string
  sheets: Sheet[]
  applications: Application[]
}
