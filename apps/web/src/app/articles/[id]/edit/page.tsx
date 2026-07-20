import Link from 'next/link'
import { getArticle, getArticleCategories } from '@/lib/api'
import EditArticleForm from '@/components/articles/edit-article-form'
import { requireUiPermission } from '@/lib/auth-session'
import {
  canManageArticles,
  canUpdateArticlePrice,
} from '@/lib/permissions'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditArticlePage({ params }: PageProps) {
  const session = await requireUiPermission(canManageArticles)
  const { id } = await params
  const articleId = Number(id)
  const [article, categories] = await Promise.all([
    getArticle(articleId),
    getArticleCategories({ activeOnly: true }),
  ])

  return (
    <main className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/articles" className="rounded border px-3 py-2 text-sm">
          ← Retour à la liste
        </Link>

        <Link
          href={`/articles/${article.id}`}
          className="rounded border px-3 py-2 text-sm"
        >
          Voir l’article
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold">Modifier : {article.nom}</h1>

      <EditArticleForm
        article={article}
        categories={categories}
        canUpdatePrice={canUpdateArticlePrice(session.user)}
      />
    </main>
  )
}
