import { contactEmail } from '@/lib/site-nav'
import type { ReactNode } from 'react'

type ErrorStateProps = {
  code: string
  title: ReactNode
  description: string
  action: ReactNode
}

export default function ErrorState({ code, title, description, action }: ErrorStateProps) {
  return (
    <main className="mx-auto flex w-full max-w-360 flex-1 flex-col items-start gap-8 px-5 py-10 lg:p-20">
      <p className="font-serif text-display text-raspberry" aria-hidden="true">
        {code}
      </p>
      <div className="flex flex-col gap-8">
        <p className="text-eyebrow font-bold text-raspberry uppercase">
          <span className="sr-only">Erreur {code} · </span>Oups
        </p>
        <h1 className="font-serif text-h2 lg:text-h1">{title}</h1>
      </div>
      <p className="text-body text-muted">{description}</p>
      <div className="w-full sm:w-75">{action}</div>
      <p className="text-small text-muted">
        Besoin d’aide ?{' '}
        <a href={`mailto:${contactEmail}`} className="underline-offset-4 hover:underline">
          {contactEmail}
        </a>
      </p>
    </main>
  )
}
