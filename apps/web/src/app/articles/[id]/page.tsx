import ArticleImage from '@/components/articles/article-image'
import DeleteArticleButton from '@/components/articles/delete-article-button'
import ProduceArticleForm from '@/components/articles/produce-article-form'
import {
  Callout,
  KeyFigures,
  PageContainer,
  PageHeading,
  Panel,
} from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import {
  getArticle,
  getArticleNomenclature,
  getProductionCapacity,
} from '@/lib/api'
import { getArticleCategoryLabel } from '@/lib/article-categories'
import { requireUiPermission } from '@/lib/auth-session'
import { formatCurrencyFromCents } from '@/lib/money'
import {
  canDeleteArticle,
  canManageArticleProduction,
  canManageArticles,
  canUpdateArticlePrice,
  canViewArticles,
  canViewStock,
} from '@/lib/permissions'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function plural(count: number, singular: string, pluralForm: string) {
  return Math.abs(count) > 1 ? pluralForm : singular
}

export default async function ArticleDetailPage({
  params,
  searchParams,
}: PageProps) {
  const session = await requireUiPermission(canViewArticles)
  const userCanManageArticles = canManageArticles(session.user)
  const userCanDeleteArticle = canDeleteArticle(session.user)
  const userCanManageArticleProduction = canManageArticleProduction(
    session.user,
  )
  const userCanViewStock = canViewStock(session.user)
  const { id } = await params
  const articleId = Number(id)

  if (!Number.isInteger(articleId)) {
    notFound()
  }

  const query = (await searchParams) ?? {}
  const justSaved = query.saved === '1'
  const [article, nomenclature, capacity] = await Promise.all([
    getArticle(articleId),
    userCanViewStock ? getArticleNomenclature(articleId) : Promise.resolve([]),
    userCanViewStock ? getProductionCapacity(articleId) : Promise.resolve(null),
  ])

  const coutTotalCents = nomenclature.reduce(
    (total, line) => total + Math.round(line.quantite * line.mp.coutUnitaireCents),
    0,
  )
  const margeCents = article.prixCents - coutTotalCents
  const hasNomenclature = nomenclature.length > 0
  const visibility = article.archivedAt
    ? { label: 'Archivé', detail: 'Retiré du catalogue' }
    : article.online
      ? { label: 'En ligne', detail: 'Visible aux clients' }
      : { label: 'Hors ligne', detail: 'Masqué sur la boutique' }

  return (
    <PageContainer>
      <PageHeading
        context="Articles"
        contextHref="/articles"
        title={article.nom}
        description={
          justSaved ? 'Articles / Détail · fiche enregistrée' : 'Articles / Détail'
        }
      />

      {justSaved ? (
        <Callout tone="success" title="Modifications enregistrées">
          La fiche de l’article est à jour.
        </Callout>
      ) : null}

      {article.archivedAt ? (
        <Callout tone="warning" title="Article archivé">
          Il n’apparaît plus dans le catalogue ; il est conservé pour
          l’historique des ventes et des commandes.
        </Callout>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {userCanManageArticles && !article.archivedAt ? (
          <Button asChild className="sm:min-w-44">
            <Link href={`/articles/${article.id}/edit`}>Modifier l’article</Link>
          </Button>
        ) : null}
        {userCanManageArticleProduction ? (
          <Button asChild variant="secondary" className="sm:min-w-44">
            <Link href={`/articles/${article.id}/nomenclature`}>
              Voir la nomenclature
            </Link>
          </Button>
        ) : null}
        {userCanDeleteArticle && !article.archivedAt ? (
          <DeleteArticleButton articleId={article.id} articleName={article.nom} />
        ) : null}
      </div>

      <Panel title="Informations du catalogue">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {article.imageUrl ? (
            <ArticleImage
              article={article}
              className="size-24 shrink-0 overflow-hidden rounded-md bg-muted"
            />
          ) : null}
          <div className="flex flex-col gap-4">
            <dl className="flex flex-col gap-1">
              <dt className="text-xs leading-[17px] text-muted-foreground">
                Catégorie
              </dt>
              <dd className="text-sm leading-5 font-medium">
                {article.categoryId == null
                  ? 'Sans catégorie'
                  : getArticleCategoryLabel(article.category)}
              </dd>
            </dl>
            <p className="text-sm leading-5 text-muted-foreground">
              {article.description || 'Aucune description renseignée.'}
            </p>
          </div>
        </div>
        <KeyFigures
          className="max-sm:grid-cols-1"
          items={[
            {
              label: 'Prix TTC',
              value: formatCurrencyFromCents(article.prixCents),
              detail: canUpdateArticlePrice(session.user)
                ? `TVA ${article.tvaBps / 100} %`
                : `TVA ${article.tvaBps / 100} % · modifiable par un administrateur`,
            },
            {
              label: 'Stock d’articles',
              value: article.stock,
              detail: `${plural(article.stock, 'Unité disponible', 'Unités disponibles')}`,
            },
            {
              label: 'Boutique',
              value: visibility.label,
              detail: visibility.detail,
            },
          ]}
        />
      </Panel>

      {userCanViewStock ? (
        <Panel
          title="Production et coûts"
          footer={
            hasNomenclature
              ? undefined
              : 'Aucune nomenclature : la vente et la production restent possibles, sans consommer de matières premières.'
          }
        >
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <dt className="text-xs leading-[17px] text-muted-foreground">
                Production possible
              </dt>
              <dd className="text-sm leading-5 font-medium">
                {hasNomenclature
                  ? `${capacity?.capacite ?? 0} ${plural(capacity?.capacite ?? 0, 'unité', 'unités')}`
                  : 'Non limitée par les matières'}
              </dd>
              {capacity?.limitingIngredient ? (
                <dd className="text-xs leading-[17px] text-muted-foreground">
                  Matière limitante : {capacity.limitingIngredient.nom} (
                  {capacity.limitingIngredient.stock}{' '}
                  {capacity.limitingIngredient.unite})
                </dd>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs leading-[17px] text-muted-foreground">
                Coût matières estimé
              </dt>
              <dd className="text-sm leading-5 font-medium">
                {hasNomenclature
                  ? formatCurrencyFromCents(coutTotalCents)
                  : 'Non calculé'}
              </dd>
              <dd className="text-xs leading-[17px] text-muted-foreground">
                {nomenclature.length}{' '}
                {plural(nomenclature.length, 'matière', 'matières')}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs leading-[17px] text-muted-foreground">
                Marge brute estimée
              </dt>
              <dd className="text-sm leading-5 font-medium">
                {hasNomenclature
                  ? formatCurrencyFromCents(margeCents)
                  : 'Non calculée'}
              </dd>
            </div>
          </dl>
          {userCanManageArticleProduction && capacity && !article.archivedAt ? (
            <ProduceArticleForm
              articleId={article.id}
              maxQuantity={hasNomenclature ? capacity.capacite : undefined}
            />
          ) : null}
        </Panel>
      ) : null}
    </PageContainer>
  )
}
