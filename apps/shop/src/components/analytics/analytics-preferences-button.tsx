'use client'

import { ANALYTICS_CONSENT_EVENT } from '@/lib/analytics'

export default function AnalyticsPreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT))}
      className="rounded-sm font-semibold hover:text-[#b5006e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b5006e]"
    >
      Gérer mes préférences
    </button>
  )
}
