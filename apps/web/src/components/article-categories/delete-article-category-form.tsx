'use client'

import type { ReactNode } from 'react'

type DeleteArticleCategoryFormProps = {
  action: (formData: FormData) => Promise<void>
  categoryId: number
  isUsed: boolean
  children: ReactNode
}

export default function DeleteArticleCategoryForm({
  action,
  categoryId,
  isUsed,
  children,
}: DeleteArticleCategoryFormProps) {
  function confirmDelete() {
    const message = isUsed
      ? 'Cette catégorie est utilisée par des articles. Elle sera désactivée. Continuer ?'
      : 'Supprimer cette catégorie ?'

    return window.confirm(message)
  }

  return (
    <form action={action} onSubmit={(event) => !confirmDelete() && event.preventDefault()}>
      <input type="hidden" name="id" value={categoryId} />
      {children}
    </form>
  )
}
