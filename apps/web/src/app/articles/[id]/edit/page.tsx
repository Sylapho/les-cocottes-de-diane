import ArticleForm from '@/components/articles/article-form'
import { PageContainer, PageHeading } from '@/components/layout/page-layout'
import { getArticle, getArticleCategories } from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import {
  canManageArticles,
  canUpdateArticlePrice,
  canViewStock,
} from '@/lib/permissions'
import { notFound } from 'next/navigation'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditArticlePage({ params }: PageProps) {
  const session = await requireUiPermission(canManageArticles)
  const { id } = await params
  const articleId = Number(id)

  if (!Number.isInteger(articleId)) {
    notFound()
  }

  const [article, categories] = await Promise.all([
    getArticle(articleId),
    getArticleCategories({ activeOnly: true }),
  ])
  const userCanUpdatePrice = canUpdateArticlePrice(session.user)

  return (
    <PageContainer>
      <PageHeading
        context="Articles"
        contextHref="/articles"
        title={article.nom}
        description={
          userCanUpdatePrice
            ? `Modifier · ${article.stock} ${Math.abs(article.stock) > 1 ? 'unités' : 'unité'} en stock`
            : 'Modifier · prix en consultation'
        }
      />
      <ArticleForm
        article={article}
        categories={categories}
        canUpdatePrice={userCanUpdatePrice}
        canViewStock={canViewStock(session.user)}
      />
    </PageContainer>
  )
}
