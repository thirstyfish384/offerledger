import type { Stage } from '../types'

interface Suggestion {
  nextAction: string
  keyDateOffset?: number // 距今天数，undefined 表示需用户填写
}

const SUGGESTIONS: Partial<Record<Stage, Suggestion>> = {
  DRAFT: { nextAction: '修改简历、投递申请' },
  APPLIED: { nextAction: '等待回复，关注邮箱', keyDateOffset: 7 },
  ASSESSMENT: { nextAction: '准备笔试' },
  INTERVIEWING: { nextAction: '准备面试、复习岗位要求' },
  WAITING: { nextAction: '复盘面试，准备备选方案', keyDateOffset: 5 },
  OFFER: { nextAction: '评估 Offer、确认意向' },
  ENDED: { nextAction: '' },
}

export function getSuggestion(stage: Stage): Suggestion | null {
  return SUGGESTIONS[stage] ?? null
}

export function getOffsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
