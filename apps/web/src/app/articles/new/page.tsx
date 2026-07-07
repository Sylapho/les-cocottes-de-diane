import NewArticleForm from '@/components/articles/new-article-form'
import { getArticleCategories } from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import { canManageArticles } from '@/lib/permissions'

export default async function NewArticlePage() {
  await requireUiPermission(canManageArticles)
  const categories = await getArticleCategories({ activeOnly: true })

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Créer un article</h1>
      <NewArticleForm categories={categories} />
    </main>
  )
}
