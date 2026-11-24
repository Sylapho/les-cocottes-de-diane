import ArticleImage from '@/components/articles/article-image'
import { FilterMenu } from '@/components/layout/filter-menu'
import {
  Callout,
  ListPagination,
  PageContainer,
  PageHeading,
} from '@/components/layout/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getArticleCategories, getArticles, type Article } from '@/lib/api'
import { getArticleCategoryLabel } from '@/lib/article-categories'
import {
  ARTICLES_PAGE_SIZE,
  buildArticlesHref,
  filterArticles,
  formatArticleStock,
  getArticleCounts,
  parseArticleListFilters,
  type ArticleListFilters,
  type ArticleTab,
} from '@/lib/article-list'
import { resolveArticleCategoryId } from '@/lib/article-list-filters'
import { requireUiPermission } from '@/lib/auth-session'
import { paginate } from '@/lib/commande-list'
import { formatCurrencyFromCents } from '@/lib/money'
import { canManageArticles, canViewArticles } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type ArticlesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getVisibility(article: Article) {
  if (article.archivedAt) {
    return { label: 'Archivé', variant: 'neutral' as const }
  }

  return article.online
    ? { label: 'En ligne', variant: 'success' as const }
    : { label: 'Hors ligne', variant: 'neutral' as const }
}

function getCategoryName(article: Article) {
  return article.categoryId == null
    ? 'Sans catégorie'
    : getArticleCategoryLabel(article.category)
}

function SearchForm({ filters }: { filters: ArticleListFilters }) {
  return (
    <form action="/articles" role="search" className="min-w-0 flex-1 basis-72">
      {filters.tab !== 'all' ? (
        <input type="hidden" name="tab" value={filters.tab} />
      ) : null}
      {filters.categoryId !== null ? (
        <input type="hidden" name="category" value={filters.categoryId} />
      ) : null}
      <label htmlFor="articles-search" className="sr-only">
        Rechercher un article
      </label>
      <Input
        id="articles-search"
        type="search"
        name="q"
        defaultValue={filters.q}
        placeholder="Rechercher un article…"
      />
    </form>
  )
}

function ArticlesTable({
  articles,
  canManage,
}: {
  articles: Article[]
  canManage: boolean
}) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Article</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Prix TTC</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Boutique</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((article) => (
              <TableRow key={article.id} className="relative">
                <TableCell>
                  <span className="flex items-center gap-3">
                    <ArticleImage
                      article={article}
                      className="size-9 shrink-0 overflow-hidden rounded-md bg-muted text-muted-foreground"
                    />
                    {/* Stretched link: the whole row opens the article. */}
                    <Link
                      href={`/articles/${article.id}`}
                      className="font-medium after:absolute after:inset-0"
                    >
                      {article.nom}
                    </Link>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getCategoryName(article)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatCurrencyFromCents(article.prixCents)}
                </TableCell>
                <TableCell
                  className={cn(
                    'whitespace-nowrap',
                    article.stock <= 0 ? 'text-danger' : 'text-muted-foreground',
                  )}
                >
                  {formatArticleStock(article.stock)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getVisibility(article).label}
                </TableCell>
                <TableCell>
                  {canManage && !article.archivedAt ? (
                    <Link
                      href={`/articles/${article.id}/edit`}
                      className="relative z-10 whitespace-nowrap text-muted-foreground hover:text-foreground hover:underline"
                      aria-label={`Modifier ${article.nom}`}
                    >
                      Modifier <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <span className="whitespace-nowrap text-muted-foreground">
                      Voir <span aria-hidden="true">→</span>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-6 md:hidden">
        {articles.map((article) => {
          const visibility = getVisibility(article)

          return (
            <li
              key={article.id}
              className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
            >
              <div className="flex items-center gap-3">
                <ArticleImage
                  article={article}
                  className="size-11 shrink-0 overflow-hidden rounded-md bg-muted text-muted-foreground"
                />
                <h3 className="text-lg leading-[26px] font-semibold">
                  {article.nom}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm leading-5">
                <span>{formatCurrencyFromCents(article.prixCents)}</span>
                <span
                  className={cn(article.stock <= 0 && 'text-danger')}
                >
                  {formatArticleStock(article.stock)}
                </span>
                <Badge variant={visibility.variant}>{visibility.label}</Badge>
              </div>
              <Button asChild variant="secondary" className="w-full">
                <Link
                  href={
                    canManage && !article.archivedAt
                      ? `/articles/${article.id}/edit`
                      : `/articles/${article.id}`
                  }
                >
                  {canManage && !article.archivedAt ? 'Modifier' : 'Voir'}
                </Link>
              </Button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default async function ArticlesPage({
  searchParams,
}: ArticlesPageProps) {
  const session = await requireUiPermission(canViewArticles)
  const userCanManageArticles = canManageArticles(session.user)
  const params = (await searchParams) ?? {}
  const [articles, categories] = await Promise.all([
    getArticles(),
    getArticleCategories(),
  ])
  const filters = parseArticleListFilters(
    params,
    resolveArticleCategoryId(params, categories),
  )
  const counts = getArticleCounts(articles)
  const pagination = paginate(
    filterArticles(articles, filters),
    filters.page,
    ARTICLES_PAGE_SIZE,
  )
  const selectedCategory = categories.find(
    (category) => category.id === filters.categoryId,
  )
  const tabs: { value: ArticleTab; label: string; count: number }[] = [
    { value: 'all', label: 'Tous', count: counts.all },
    { value: 'online', label: 'En ligne', count: counts.online },
    { value: 'offline', label: 'Hors ligne', count: counts.offline },
    ...(counts.archived > 0
      ? [
          {
            value: 'archived' as const,
            label: 'Archivés',
            count: counts.archived,
          },
        ]
      : []),
  ]
  const hasFilters =
    filters.tab !== 'all' || filters.categoryId !== null || Boolean(filters.q)

  return (
    <PageContainer>
      <PageHeading
        context="Articles"
        title="Articles"
        description="Un catalogue clair, des disponibilités fiables."
      />

      <div className="flex flex-wrap gap-3">
        <SearchForm filters={filters} />
        <FilterMenu
          ariaLabel="Catégorie"
          label={selectedCategory?.name ?? 'Toutes les catégories'}
          className="min-w-52"
          options={[
            {
              label: 'Toutes les catégories',
              href: buildArticlesHref(filters, { categoryId: null }),
              active: filters.categoryId === null,
            },
            ...categories.map((category) => ({
              label: category.isActive
                ? category.name
                : `${category.name} (inactive)`,
              href: buildArticlesHref(filters, { categoryId: category.id }),
              active: filters.categoryId === category.id,
            })),
          ]}
        />
        {userCanManageArticles ? (
          <Button asChild className="min-w-52">
            <Link href="/articles/new">Créer un article</Link>
          </Button>
        ) : null}
      </div>

      <nav
        aria-label="Filtrer par visibilité"
        className="-mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0"
      >
        {tabs.map((tab) => {
          const active = filters.tab === tab.value

          return (
            <Button
              key={tab.value}
              asChild
              variant={active ? 'default' : 'secondary'}
              className="shrink-0 px-6"
            >
              <Link
                href={buildArticlesHref(filters, { tab: tab.value })}
                aria-current={active ? 'page' : undefined}
              >
                {tab.label} · {tab.count}
              </Link>
            </Button>
          )
        })}
      </nav>

      {pagination.total > 0 ? (
        <>
          <ArticlesTable
            articles={pagination.items}
            canManage={userCanManageArticles}
          />
          <ListPagination
            start={pagination.start}
            end={pagination.end}
            total={pagination.total}
            page={pagination.page}
            pageCount={pagination.pageCount}
            itemLabel={['article', 'articles']}
            hrefForPage={(page) => buildArticlesHref(filters, { page })}
          />
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {articles.length === 0
                ? 'Aucun article pour le moment'
                : 'Aucun article ne correspond à ces filtres'}
            </EmptyTitle>
            <EmptyDescription>
              {articles.length === 0
                ? 'Créez un premier article pour alimenter la boutique.'
                : 'Modifiez la recherche ou réinitialisez les filtres.'}
            </EmptyDescription>
          </EmptyHeader>
          {hasFilters ? (
            <EmptyContent>
              <Button asChild variant="secondary">
                <Link href="/articles">Réinitialiser les filtres</Link>
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      )}

      <Callout tone="info" title="Visibilité et disponibilité sont distinctes">
        Un article en ligne peut être indisponible. Ajustez les stocks dans le
        parcours dédié, sans modifier les prix.
      </Callout>
    </PageContainer>
  )
}
