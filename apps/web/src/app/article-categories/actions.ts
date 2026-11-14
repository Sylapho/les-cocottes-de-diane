'use server'

import {
  createArticleCategory,
  deleteArticleCategory,
  updateArticleCategory,
} from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import {
  actionError,
  actionSuccess,
  getFormString,
  type FormActionState,
} from '@/lib/form-action-state'
import { canManageArticles } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

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

function revalidateCatalogue() {
  revalidatePath('/article-categories')
  revalidatePath('/articles')
}

export async function saveArticleCategoryAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  // Permission errors redirect, so they stay outside the try/catch.
  await requireUiPermission(canManageArticles)

  const id = Number(formData.get('id'))
  const data = parseArticleCategoryForm(formData)

  if (!data.name) {
    return actionError(new Error('Le nom de la catégorie est obligatoire.'))
  }

  try {
    if (Number.isInteger(id) && id > 0) {
      await updateArticleCategory(id, data)
    } else {
      await createArticleCategory(data)
    }
  } catch (error) {
    return actionError(error)
  }

  revalidateCatalogue()

  return actionSuccess(
    Number.isInteger(id) && id > 0 ? 'Catégorie enregistrée' : 'Catégorie créée',
  )
}

export async function deleteArticleCategoryAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  await requireUiPermission(canManageArticles)

  const id = Number(formData.get('id'))

  try {
    const category = await deleteArticleCategory(id)

    revalidateCatalogue()

    // The API deactivates a category still used by articles.
    return actionSuccess(
      category?.isActive === false
        ? 'Catégorie désactivée'
        : 'Catégorie supprimée',
    )
  } catch (error) {
    return actionError(error)
  }
}
