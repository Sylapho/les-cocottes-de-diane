import { ArticleCategorySheet } from '@/components/article-categories/article-category-sheet'
import {
  Callout,
  PageContainer,
  PageHeading,
} from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getArticleCategories } from '@/lib/api'
import type { ArticleCategory } from '@/lib/article-categories'
import { requireUiPermission } from '@/lib/auth-session'
import {
  canManageArticles,
  canViewArticleCategories,
} from '@/lib/permissions'
import { cn } from '@/lib/utils'

function EditTrigger({ category }: { category: ArticleCategory }) {
  return (
    <ArticleCategorySheet
      category={category}
      trigger={
        <button
          type="button"
          className="rounded-sm whitespace-nowrap text-muted-foreground hover:text-foreground hover:underline"
          aria-label={`Modifier la catégorie ${category.name}`}
        >
          Modifier <span aria-hidden="true">→</span>
        </button>
      }
    />
  )
}

export default async function ArticleCategoriesPage() {
  const session = await requireUiPermission(canViewArticleCategories)
  const userCanManageArticles = canManageArticles(session.user)
  const categories = await getArticleCategories()

  return (
    <PageContainer>
      <PageHeading
        context="Catégories"
        title="Catégories"
        description="Organisez le catalogue et son ordre d’affichage."
      />

      {userCanManageArticles ? (
        <div>
          <ArticleCategorySheet
            trigger={<Button className="w-full sm:w-56">Créer une catégorie</Button>}
          />
        </div>
      ) : null}

      {categories.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucune catégorie pour le moment</EmptyTitle>
            <EmptyDescription>
              Les catégories regroupent les articles sur la boutique.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Ordre</TableHead>
                  <TableHead>État</TableHead>
                  {userCanManageArticles ? <TableHead>Action</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="max-w-80 truncate text-muted-foreground">
                      {category.description || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category._count?.articles ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.sortOrder}
                    </TableCell>
                    <TableCell
                      className={cn(
                        category.isActive
                          ? 'text-muted-foreground'
                          : 'text-warning',
                      )}
                    >
                      {category.isActive ? 'Active' : 'Inactive'}
                    </TableCell>
                    {userCanManageArticles ? (
                      <TableCell>
                        <EditTrigger category={category} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-6 md:hidden">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6"
              >
                <h3 className="text-lg leading-[26px] font-semibold">
                  {category.name}
                </h3>
                {category.description ? (
                  <p className="text-sm leading-5 text-muted-foreground">
                    {category.description}
                  </p>
                ) : null}
                <p className="text-sm leading-5">
                  {category._count?.articles ?? 0} article(s) · ordre{' '}
                  {category.sortOrder} ·{' '}
                  <span className={cn(!category.isActive && 'text-warning')}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
                {userCanManageArticles ? (
                  <ArticleCategorySheet
                    category={category}
                    trigger={
                      <Button variant="secondary" className="w-full">
                        Modifier
                      </Button>
                    }
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <Callout tone="info" title="Les articles restent protégés">
        Une catégorie utilisée est désactivée lors de sa suppression. Une
        catégorie vide peut être supprimée définitivement.
      </Callout>
    </PageContainer>
  )
}
