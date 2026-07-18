'use client'

import { type ReactNode, useId, useState } from 'react'

type ArticleCategorySectionProps = {
  name: string
  description?: string | null
  articleCount: number
  status?: 'inactive' | 'uncategorized'
  children: ReactNode
}

export default function ArticleCategorySection({
  name,
  description,
  articleCount,
  status,
  children,
}: ArticleCategorySectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const contentId = useId()

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-16 w-full items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-left transition hover:bg-[var(--primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] motion-reduce:transition-none sm:px-5"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-zinc-950">{name}</h3>
            {status ? (
              <span
                className={
                  status === 'inactive'
                    ? 'rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-700'
                    : 'rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800'
                }
              >
                {status === 'inactive' ? 'Inactive' : 'À classer'}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-zinc-600">
            {articleCount} article{articleCount > 1 ? 's' : ''}
          </p>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm font-normal text-zinc-600">
              {description}
            </p>
          ) : null}
        </div>

        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-white text-[var(--primary-dark)] transition motion-reduce:transition-none ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <div id={contentId} hidden={!isOpen} className="p-4 sm:p-5">
        {children}
      </div>
    </section>
  )
}
