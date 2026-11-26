'use client'

import { ANALYTICS_CONSENT_EVENT } from '@/lib/analytics'

export default function AnalyticsPreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT))}
      className="rounded-sm underline-offset-4 hover:underline"
    >
      Gérer mes préférences
    </button>
  )
}
