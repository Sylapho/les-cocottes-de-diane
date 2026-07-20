'use client'

import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsContext,
  isObviousAutomatedBrowser,
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/analytics'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

export default function ShopAnalytics() {
  const [choice, setChoice] = useState<AnalyticsConsent | null | undefined>(
    undefined,
  )
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  const trackActivity = useCallback(() => {
    if (choice !== 'granted' || isObviousAutomatedBrowser(window.navigator)) {
      return
    }

    let context: ReturnType<typeof getAnalyticsContext>

    try {
      context = getAnalyticsContext(window.localStorage)
    } catch {
      return
    }

    if (!context?.shouldTrack) {
      return
    }

    void fetch('/api/analytics/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: context.visitorId,
        sessionId: context.sessionId,
      }),
      cache: 'no-store',
      keepalive: true,
    }).catch(() => undefined)
  }, [choice])

  useEffect(() => {
    const readChoiceHandle = window.setTimeout(() => {
      try {
        setChoice(readAnalyticsConsent(window.localStorage))
      } catch {
        setChoice('denied')
      }
    }, 0)

    const openPreferences = () => setPreferencesOpen(true)
    window.addEventListener(ANALYTICS_CONSENT_EVENT, openPreferences)

    return () => {
      window.clearTimeout(readChoiceHandle)
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, openPreferences)
    }
  }, [])

  useEffect(() => {
    if (choice !== 'granted') {
      return
    }

    const initialHandle = window.setTimeout(trackActivity, 0)
    const handleActivity = () => trackActivity()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        trackActivity()
      }
    }

    window.addEventListener('pointerdown', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearTimeout(initialHandle)
      window.removeEventListener('pointerdown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [choice, trackActivity])

  function selectChoice(nextChoice: AnalyticsConsent) {
    try {
      writeAnalyticsConsent(window.localStorage, nextChoice)
      setChoice(nextChoice)
    } catch {
      setChoice('denied')
    }
    setPreferencesOpen(false)
  }

  if (choice === undefined || (choice !== null && !preferencesOpen)) {
    return null
  }

  return (
    <section
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl bg-[#181014] p-4 text-white shadow-lg sm:bottom-5 sm:flex sm:items-center sm:gap-5 sm:p-5"
      aria-label="Préférences de mesure d’audience"
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-black">Mesure d’audience anonyme</h2>
        <p className="mt-1 text-sm leading-6 text-[#f5eaf0]">
          Avec votre accord, nous mesurons les visites et commandes avec un
          identifiant aléatoire pseudonymisé, sans stocker votre adresse IP.
          Vous pouvez changer d’avis à tout moment.{' '}
          <Link
            href="/cookies"
            className="font-bold underline underline-offset-2"
          >
            En savoir plus
          </Link>
        </p>
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap gap-2 sm:mt-0 sm:justify-end">
        <button
          type="button"
          onClick={() => selectChoice('denied')}
          className="min-h-11 rounded-full border border-white/35 px-4 text-sm font-bold transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={() => selectChoice('granted')}
          className="min-h-11 rounded-full bg-[#d41482] px-4 text-sm font-black transition hover:bg-[#ef399b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Autoriser
        </button>
      </div>
    </section>
  )
}
