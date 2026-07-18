import DeleteArticleCategoryForm from '@/components/article-categories/delete-article-category-form'
import {
  createArticleCategory,
  deleteArticleCategory,
  getArticleCategories,
  updateArticleCategory,
} from '@/lib/api'
import type { ArticleCategory } from '@/lib/article-categories'
import { requireUiPermission } from '@/lib/auth-session'
import {
  canManageArticles,
  canViewArticleCategories,
} from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import type React from 'react'

async function createArticleCategoryAction(formData: FormData) {
  'use server'

  await requireUiPermission(canManageArticles)

  await createArticleCategory(parseArticleCategoryForm(formData))

  revalidatePath('/article-categories')
  revalidatePath('/articles')
}

async function updateArticleCategoryAction(formData: FormData) {
  'use server'

  await requireUiPermission(canManageArticles)

  const id = Number(formData.get('id'))

  await updateArticleCategory(id, parseArticleCategoryForm(formData))

  revalidatePath('/article-categories')
  revalidatePath('/articles')
}

async function deleteArticleCategoryAction(formData: FormData) {
  'use server'

  await requireUiPermission(canManageArticles)

  const id = Number(formData.get('id'))

  await deleteArticleCategory(id)

  revalidatePath('/article-categories')
  revalidatePath('/articles')
}

function parseArticleCategoryForm(formData: FormData) {
  const sortOrder = Number(formData.get('sortOrder'))
  const slug = getFormString(formData, 'slug')
  const description = getFormString(formData, 'description')

  return {
    name: getFormString(formData, 'name'),
    slug: slug || undefined,
    description: description || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive: formData.get('isActive') === 'on',
  }
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === 'string' ? value.trim() : ''
}

export default async function ArticleCategoriesPage() {
  const session = await requireUiPermission(canViewArticleCategories)
  const userCanManageArticles = canManageArticles(session.user)
  const categories = await getArticleCategories()
  const activeCategories = categories.filter((category) => category.isActive)

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Catalogue
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Catégories d&apos;articles
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-600">
            {userCanManageArticles
              ? 'Gérez les catégories utilisées par le back-office et par la boutique publique.'
              : 'Consultez les catégories utilisées par le back-office et par la boutique publique.'}
          </p>
        </div>

        <div className="rounded border bg-white px-4 py-3 text-sm shadow-sm">
          <span className="font-semibold">{activeCategories.length}</span>{' '}
          active{activeCategories.length > 1 ? 's' : ''}
        </div>
      </div>

      {userCanManageArticles ? (
        <section className="mb-6 rounded border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Nouvelle catégorie</h2>
          <ArticleCategoryForm
            action={createArticleCategoryAction}
            submitLabel="Créer la catégorie"
            defaultActive
          />
        </section>
      ) : null}

      <section className="grid gap-4">
        {categories.length === 0 ? (
          <div className="rounded border bg-white p-6 text-sm text-zinc-600 shadow-sm">
            Aucune catégorie pour le moment.
          </div>
        ) : (
          categories.map((category) => (
            <ArticleCategoryRow
              key={category.id}
              category={category}
              canManage={userCanManageArticles}
            />
          ))
        )}
      </section>
    </main>
  )
}

function ArticleCategoryRow({
  category,
  canManage,
}: {
  category: ArticleCategory
  canManage: boolean
}) {
  const articlesCount = category._count?.articles ?? 0

  return (
    <article className="rounded border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{category.name}</h2>
            <span
              className={
                category.isActive
                  ? 'rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800'
                  : 'rounded bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600'
              }
            >
              {category.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600">/{category.slug}</p>
          <p className="mt-1 text-sm text-zinc-600">
            {articlesCount} article{articlesCount > 1 ? 's' : ''}
          </p>
          {category.description ? (
            <p className="mt-2 max-w-2xl text-sm text-zinc-700">
              {category.description}
            </p>
          ) : null}
        </div>

        {canManage ? (
          <DeleteArticleCategoryForm
            action={deleteArticleCategoryAction}
            categoryId={category.id}
            isUsed={articlesCount > 0}
          >
            <button
              type="submit"
              className={
                articlesCount > 0
                  ? 'rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700'
                  : 'rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700'
              }
            >
              {articlesCount > 0 ? 'Désactiver' : 'Supprimer'}
            </button>
          </DeleteArticleCategoryForm>
        ) : null}
      </div>

      {canManage ? (
        <ArticleCategoryForm
          action={updateArticleCategoryAction}
          category={category}
          submitLabel="Enregistrer"
        />
      ) : null}
    </article>
  )
}

function ArticleCategoryForm({
  action,
  category,
  submitLabel,
  defaultActive = false,
}: {
  action: (formData: FormData) => Promise<void>
  category?: ArticleCategory
  submitLabel: string
  defaultActive?: boolean
}) {
  return (
    <form action={action} className="mt-4 grid gap-4">
      {category ? (
        <input type="hidden" name="id" value={category.id} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1fr_1fr_140px]">
        <Field label="Nom">
          <input
            name="name"
            required
            maxLength={120}
            defaultValue={category?.name}
            className={inputClassName}
          />
        </Field>

        <Field label="Slug">
          <input
            name="slug"
            maxLength={120}
            defaultValue={category?.slug}
            placeholder="généré depuis le nom"
            className={inputClassName}
          />
        </Field>

        <Field label="Ordre">
          <input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={category?.sortOrder ?? 0}
            className={inputClassName}
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          name="description"
          maxLength={500}
          defaultValue={category?.description ?? ''}
          className={`${inputClassName} min-h-24 py-2`}
        />
      </Field>

      {!category ? (
        <label className="flex w-fit items-center gap-2 rounded border bg-zinc-50 px-3 py-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={defaultActive} />
          Active
        </label>
      ) : (
        <label className="flex w-fit items-center gap-2 rounded border bg-zinc-50 px-3 py-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={category.isActive}
          />
          Active
        </label>
      )}

      <button
        type="submit"
        className="w-fit rounded bg-black px-4 py-2 text-sm font-semibold text-white"
      >
        {submitLabel}
      </button>
    </form>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-zinc-900">
      {label}
      {children}
    </label>
  )
}

const inputClassName =
  'min-h-10 rounded border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-900 outline-none focus:border-black'
