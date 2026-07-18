import {
  Page,
  PageHeader,
  SectionCard,
} from '@/components/ui/dashboard'

export default function ArticlesLoading() {
  return (
    <Page>
      <PageHeader
        eyebrow="Catalogue"
        title="Articles"
        description="Chargement du catalogue et des catégories…"
      />
      <SectionCard className="lc-section-spaced" title="Catalogue produits">
        <p className="py-8 text-center text-sm text-zinc-600" role="status">
          Chargement des articles et des catégories…
        </p>
      </SectionCard>
    </Page>
  )
}
