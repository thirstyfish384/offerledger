import posthog from 'posthog-js'

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  person_profiles: 'identified_only',
  loaded: (ph) => {
    console.log('[posthog] initialized, distinct_id:', ph.get_distinct_id())
  },
})

export const sessionStart = Date.now()
let viewStartTime = Date.now()

export function track(event: string, properties?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.log(`[analytics] ${event}`, properties)
  }
  posthog.capture(event, properties)
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
