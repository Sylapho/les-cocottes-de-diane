import ArticleForm from '@/components/articles/article-form'
import { PageContainer, PageHeading } from '@/components/layout/page-layout'
import { getArticleCategories } from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import {
  canManageArticles,
  canUpdateArticlePrice,
  canViewStock,
} from '@/lib/permissions'

export default async function NewArticlePage() {
  const session = await requireUiPermission(canManageArticles)
  const categories = await getArticleCategories({ activeOnly: true })

  return (
    <PageContainer>
      <PageHeading
        context="Articles"
        contextHref="/articles"
        title="Créer un article"
        description="Renseignez l’essentiel pour publier votre article."
      />
      <ArticleForm
        categories={categories}
        canUpdatePrice={canUpdateArticlePrice(session.user)}
        canViewStock={canViewStock(session.user)}
      />
    </PageContainer>
  )
}
