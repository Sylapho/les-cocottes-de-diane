import Link from 'next/link'
import ArticleCategoryFilter from '@/components/articles/article-category-filter'
import ArticleCategorySection from '@/components/articles/article-category-section'
import ArticleImage from '@/components/articles/article-image'
import {
  ButtonLink,
  EmptyState,
  Page,
  PageHeader,
  SectionCard,
  StatCard,
} from '@/components/ui/dashboard'
import { getArticleCategories, getArticles, type Article } from '@/lib/api'
import { getArticleCategoryLabel } from '@/lib/article-categories'
import {
  filterArticlesByCategory,
  groupArticlesByCategory,
  resolveArticleCategoryId,
} from '@/lib/article-list-filters'
import { requireUiPermission } from '@/lib/auth-session'
import { formatCurrencyFromCents } from '@/lib/money'
import { canManageArticles, canViewArticles } from '@/lib/permissions'

function stockTone(stock: number) {
  if (stock <= 0) return 'danger'
  if (stock <= 3) return 'warning'
  return 'success'
}

function stockLabel(stock: number) {
  if (stock <= 0) return 'Rupture'
  if (stock <= 3) return 'Bas'
  return 'OK'
}

type ArticlesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
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
  const selectedCategoryId = resolveArticleCategoryId(params, categories)
  const filteredArticles = filterArticlesByCategory(
    articles,
    selectedCategoryId,
  )
  const groupedArticles = groupArticlesByCategory(filteredArticles, categories)
  const activeArticles = articles.filter((article) => !article.archivedAt)
  const archivedArticles = articles.filter((article) => article.archivedAt)
  const onlineArticles = activeArticles.filter((article) => article.online)
  const lowStockArticles = activeArticles.filter((article) => article.stock <= 3)
  const averagePrice = articles.length
    ? Math.round(
        articles.reduce((total, article) => total + article.prixCents, 0) /
          articles.length,
      )
    : 0
  const catalogueDescription =
    selectedCategoryId !== null
      ? `${filteredArticles.length} article${filteredArticles.length > 1 ? 's' : ''} affiché${filteredArticles.length > 1 ? 's' : ''} sur ${articles.length}.`
      : articles.length > 0
        ? `Prix moyen : ${formatCurrencyFromCents(averagePrice)}.`
        : 'Les articles créés apparaîtront ici.'

  return (
    <Page>
      <PageHeader
        eyebrow="Catalogue"
        title="Articles"
        description="Pilotez les produits vendus en boutique : prix, catégorie, visibilité en ligne et disponibilité."
        actions={
          userCanManageArticles ? (
            <ButtonLink href="/articles/new" variant="primary">
              Nouvel article
            </ButtonLink>
          ) : null
        }
      />

      <section className="lc-stat-grid">
        <StatCard
          label="Articles"
          value={articles.length}
          detail={`${archivedArticles.length} archivé${archivedArticles.length > 1 ? 's' : ''}`}
        />
        <StatCard
          label="En ligne"
          value={onlineArticles.length}
          detail="Visibles côté boutique"
          tone="success"
        />
        <StatCard
          label="Stock bas"
          value={lowStockArticles.length}
          detail="À produire ou réapprovisionner"
          tone={lowStockArticles.length > 0 ? 'warning' : 'success'}
        />
      </section>

      <SectionCard
        className="lc-section-spaced"
        title="Catalogue produits"
        description={catalogueDescription}
        actions={
          <ArticleCategoryFilter
            categories={categories}
            selectedCategoryId={selectedCategoryId}
          />
        }
      >
        {articles.length === 0 ? (
          <EmptyState
            title="Aucun article disponible"
            description="Créez un premier article pour alimenter le catalogue de la boutique et commencer à suivre le stock."
            action={
              userCanManageArticles ? (
                <ButtonLink href="/articles/new" variant="primary">
                  Créer un article
                </ButtonLink>
              ) : null
            }
          />
        ) : filteredArticles.length === 0 ? (
          <EmptyState
            title="Aucun article trouvé"
            description="Aucun article ne correspond à cette catégorie."
          />
        ) : (
          <div className="grid gap-5">
            {groupedArticles.map((group) => (
              <ArticleCategorySection
                key={group.key}
                name={group.name}
                description={group.description}
                articleCount={group.articles.length}
                status={group.status}
              >
                <ul className="lc-catalog-grid">
                  {group.articles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      canManage={userCanManageArticles}
                    />
                  ))}
                </ul>
              </ArticleCategorySection>
            ))}
          </div>
        )}
      </SectionCard>
    </Page>
  )
}

function ArticleCard({
  article,
  canManage,
}: {
  article: Article
  canManage: boolean
}) {
  const tone = stockTone(article.stock)

  return (
    <li className="lc-catalog-card">
      <div className="lc-catalog-card-head">
        <ArticleImage article={article} className="lc-catalog-image" />
        <div className="lc-catalog-card-title">
          <div className="lc-catalog-title-row">
            <h4>{article.nom}</h4>
            <span
              className={
                article.archivedAt
                  ? 'lc-status-pill lc-status-pill-muted'
                  : article.online
                    ? 'lc-status-pill lc-status-pill-success'
                    : 'lc-status-pill lc-status-pill-muted'
              }
            >
              {article.archivedAt
                ? 'Archivé'
                : article.online
                  ? 'En ligne'
                  : 'Hors ligne'}
            </span>
          </div>
          <p className="lc-catalog-category">
            {article.categoryId == null
              ? 'Sans catégorie'
              : getArticleCategoryLabel(article.category)}
          </p>
        </div>
      </div>

      <p className="lc-catalog-description">
        {article.description || 'Aucune description renseignée.'}
      </p>

      <dl className="lc-catalog-metrics">
        <div>
          <dt>Prix TTC</dt>
          <dd>{formatCurrencyFromCents(article.prixCents)}</dd>
        </div>
        <div>
          <dt>Stock</dt>
          <dd>
            {article.stock}
            <span
              className={
                tone === 'danger'
                  ? 'lc-stock-pill lc-stock-pill-danger'
                  : tone === 'warning'
                    ? 'lc-stock-pill lc-stock-pill-warning'
                    : 'lc-stock-pill lc-stock-pill-success'
              }
            >
              {stockLabel(article.stock)}
            </span>
          </dd>
        </div>
      </dl>

      <div className="lc-catalog-actions">
        <Link
          href={`/articles/${article.id}`}
          className="lc-button lc-button-secondary"
        >
          Voir
        </Link>

        {canManage ? (
          <Link
            href={`/articles/${article.id}/edit`}
            className="lc-button lc-button-ghost"
          >
            Modifier
          </Link>
        ) : null}
      </div>
    </li>
  )
}
