'use client'

import type { ArticleCategory } from '@/lib/article-categories'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type ChangeEvent, useTransition } from 'react'

type ArticleCategoryFilterProps = {
  categories: Pick<ArticleCategory, 'id' | 'name' | 'isActive'>[]
  selectedCategoryId: number | null
}

export default function ArticleCategoryFilter({
  categories,
  selectedCategoryId,
}: ArticleCategoryFilterProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    const categoryId = event.target.value

    if (categoryId) {
      params.set('category', categoryId)
    } else {
      params.delete('category')
    }

    params.delete('page')

    const query = params.toString()

    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  return (
    <div className="grid w-full min-w-0 gap-1.5 text-left sm:w-72">
      <label
        htmlFor="article-category-filter"
        className="text-sm font-semibold text-zinc-900"
      >
        Catégorie
      </label>
      <select
        id="article-category-filter"
        name="category"
        value={selectedCategoryId ?? ''}
        onChange={handleChange}
        aria-describedby="article-category-filter-status"
        className="min-h-11 w-full min-w-0 truncate rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        <option value="">Toutes les catégories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id} title={category.name}>
            {category.name}
            {category.isActive ? '' : ' (inactive)'}
          </option>
        ))}
      </select>
      <span
        id="article-category-filter-status"
        className="min-h-5 text-xs text-zinc-600"
        aria-live="polite"
      >
        {isPending
          ? 'Mise à jour des articles…'
          : `${categories.length} catégorie${categories.length > 1 ? 's' : ''} disponible${categories.length > 1 ? 's' : ''}`}
      </span>
    </div>
  )
}
