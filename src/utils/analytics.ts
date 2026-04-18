export const sessionStart = Date.now()
let viewStartTime = Date.now()

type GTag = (command: string, ...args: unknown[]) => void

export function track(event: string, properties?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.log(`[analytics] ${event}`, properties)
  }
  const gtag = (window as Window & { gtag?: GTag }).gtag
  gtag?.('event', event, properties)
}

export function countFilledFields(record: { company?: string; position?: string; stage?: string; keyDate?: string; priority?: string; channel?: string }): number {
  const fields = ['company', 'position', 'stage', 'keyDate', 'priority', 'channel'] as const
  return fields.filter(f => !!record[f]).length
}

export function calcDays(isoDate: string, end: number): number {
  return Math.floor((end - new Date(isoDate).getTime()) / 86400000)
}

export function getViewStartTime() { return viewStartTime }
export function resetViewStartTime() { viewStartTime = Date.now() }
