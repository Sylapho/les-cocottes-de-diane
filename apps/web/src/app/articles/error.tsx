'use client'

import { Page, PageHeader, SectionCard } from '@/components/ui/dashboard'

export default function ArticlesError({ reset }: { reset: () => void }) {
  return (
    <Page>
      <PageHeader
        eyebrow="Catalogue"
        title="Articles"
        description="Le catalogue ne peut pas être affiché pour le moment."
      />
      <SectionCard className="lc-section-spaced" title="Erreur de chargement">
        <div className="grid justify-items-start gap-4" role="alert">
          <p className="text-sm text-zinc-700">
            Une erreur est survenue pendant la récupération des articles ou des
            catégories.
          </p>
          <button
            type="button"
            onClick={reset}
            className="lc-button lc-button-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            Réessayer
          </button>
        </div>
      </SectionCard>
    </Page>
  )
}
