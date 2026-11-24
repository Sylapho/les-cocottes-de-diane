'use client'

import ArticleImage from '@/components/articles/article-image'
import { NavIcon } from '@/components/layout/nav-icons'
import { Panel } from '@/components/layout/page-layout'
import { UnsavedChangesDialog } from '@/components/layout/unsaved-changes-dialog'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { Article } from '@/lib/api'
import { getApiErrorMessage, getUnknownErrorMessage } from '@/lib/api-error'
import type { ArticleCategory } from '@/lib/article-categories'
import { buildArticleUpdatePayload } from '@/lib/article-update'
import { centsToEuros, eurosToCents } from '@/lib/money'
import { useSessionFetch } from '@/lib/use-session-fetch'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL
// Keep in sync with ARTICLE_IMAGE_MAX_SIZE_BYTES in apps/api/src/articles/article-image-upload.ts.
const ARTICLE_IMAGE_MAX_SIZE_BYTES = 2 * 1024 * 1024
const ARTICLE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
const NO_CATEGORY = 'none'

type ArticleFormProps = {
  categories: ArticleCategory[]
  // Absent in creation mode.
  article?: Article
  canUpdatePrice: boolean
  canViewStock: boolean
}

export default function ArticleForm({
  categories,
  article,
  canUpdatePrice,
  canViewStock,
}: ArticleFormProps) {
  const router = useRouter()
  const sessionFetch = useSessionFetch()
  const isEdit = Boolean(article)
  const cancelHref = article ? `/articles/${article.id}` : '/articles'

  const [nom, setNom] = useState(article?.nom ?? '')
  const [categoryId, setCategoryId] = useState(
    article?.categoryId ? String(article.categoryId) : NO_CATEGORY,
  )
  const [prix, setPrix] = useState(
    article ? String(centsToEuros(article.prixCents)).replace('.', ',') : '',
  )
  const [description, setDescription] = useState(article?.description ?? '')
  const [online, setOnline] = useState(article?.online ?? true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [dirty, setDirty] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageError, setImageError] = useState('')
  const imagePreviewUrlRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current)
      }
    }
  }, [])

  // Inactive current category stays selectable so editing never drops it.
  const categoryOptions =
    article?.category && !article.category.isActive
      ? [article.category, ...categories]
      : categories

  function markDirty() {
    setDirty(true)
  }

  function setSelectedImage(file: File | null) {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current)
      imagePreviewUrlRef.current = null
    }

    setImageFile(file)

    if (!file) {
      setImagePreviewUrl('')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    imagePreviewUrlRef.current = previewUrl
    setImagePreviewUrl(previewUrl)
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setSelectedImage(null)
      return
    }

    if (!ARTICLE_IMAGE_ACCEPT.split(',').includes(file.type)) {
      setImageError('Format invalide. Utilisez une image JPEG, PNG ou WebP.')
      event.target.value = ''
      setSelectedImage(null)
      return
    }

    if (file.size > ARTICLE_IMAGE_MAX_SIZE_BYTES) {
      setImageError('Image trop lourde. Taille maximale : 2 Mo.')
      event.target.value = ''
      setSelectedImage(null)
      return
    }

    setImageError('')
    setSelectedImage(file)
    markDirty()
  }

  async function uploadArticleImage(articleId: number, file: File) {
    const formData = new FormData()
    formData.append('image', file)

    const response = await sessionFetch(
      `${API_URL}/articles/${articleId}/image`,
      { method: 'POST', body: formData },
    )

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(response, "Erreur lors de l'upload image."),
      )
    }
  }

  function getPrixCents() {
    const normalized = prix.trim().replace(',', '.')

    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      return null
    }

    return eurosToCents(Number(normalized))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!nom.trim()) {
      setError('Le nom de l’article est obligatoire.')
      return
    }

    const prixCents = getPrixCents()

    if (prixCents === null) {
      setError('Saisissez un prix valide, par exemple 7,50.')
      return
    }

    setLoading(true)

    const payload = {
      nom: nom.trim(),
      categoryId: categoryId === NO_CATEGORY ? null : Number(categoryId),
      prixCents,
      description: description.trim() || undefined,
      online,
    }

    try {
      const response = await sessionFetch(
        article ? `${API_URL}/articles/${article.id}` : `${API_URL}/articles`,
        {
          method: article ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            article
              ? buildArticleUpdatePayload(payload, canUpdatePrice)
              : payload,
          ),
        },
      )

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            article
              ? 'Erreur lors de la mise à jour.'
              : 'Erreur lors de la création.',
          ),
        )
      }

      const articleId = article
        ? article.id
        : ((await response.json()) as { id: number }).id

      if (imageFile) {
        try {
          await uploadArticleImage(articleId, imageFile)
        } catch (uploadError) {
          // The article itself is saved: report the image failure only.
          toast.error('Article enregistré, mais l’image n’a pas été envoyée', {
            description: getUnknownErrorMessage(uploadError),
          })
        }
      }

      setDirty(false)
      router.push(`/articles/${articleId}?saved=1`)
      router.refresh()
    } catch (err) {
      setError(getUnknownErrorMessage(err))
      toast.error('Échec de l’enregistrement', {
        description: article
          ? 'L’article n’a pas été modifié. Vos saisies sont conservées.'
          : 'L’article n’a pas été créé. Vos saisies sont conservées.',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    if (dirty) {
      setLeaveOpen(true)
      return
    }

    router.push(cancelHref)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Informations de l’article">
            <Field>
              <FieldLabel htmlFor="article-nom">Nom *</FieldLabel>
              <Input
                id="article-nom"
                value={nom}
                onChange={(event) => {
                  setNom(event.target.value)
                  markDirty()
                }}
                maxLength={120}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="article-category">Catégorie</FieldLabel>
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value)
                  markDirty()
                }}
              >
                <SelectTrigger id="article-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Sans catégorie</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.isActive
                        ? category.name
                        : `${category.name} (inactive)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="article-description">Description</FieldLabel>
              <Textarea
                id="article-description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                  markDirty()
                }}
                placeholder="Présentez l’article aux clients…"
                rows={4}
              />
            </Field>
          </Panel>

          <Panel title="Prix de vente">
            <Field className="sm:max-w-60">
              <FieldLabel htmlFor="article-prix">Prix TTC (€) *</FieldLabel>
              <Input
                id="article-prix"
                value={prix}
                onChange={(event) => {
                  setPrix(event.target.value)
                  markDirty()
                }}
                inputMode="decimal"
                placeholder="0,00"
                disabled={isEdit && !canUpdatePrice}
                aria-describedby="article-prix-help"
                required
              />
              <FieldDescription id="article-prix-help">
                {isEdit && !canUpdatePrice
                  ? 'Seul un administrateur peut modifier ce prix.'
                  : 'Montant affiché aux clients, toutes taxes comprises.'}
              </FieldDescription>
            </Field>
          </Panel>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Panel title="Visibilité boutique">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="article-online"
                className="flex items-center gap-2 text-sm leading-5 font-medium"
              >
                <span
                  aria-hidden="true"
                  className={
                    online
                      ? 'size-2 rounded-full bg-success'
                      : 'size-2 rounded-full bg-muted-foreground'
                  }
                />
                <span className={online ? 'text-success' : undefined}>
                  {online ? 'En ligne' : 'Hors ligne'}
                </span>
              </label>
              <Switch
                id="article-online"
                checked={online}
                onCheckedChange={(checked) => {
                  setOnline(checked)
                  markDirty()
                }}
              />
            </div>
            <p className="text-sm leading-5 text-muted-foreground">
              {online
                ? 'Visible sur la boutique. La quantité disponible dépend du stock d’articles.'
                : 'Masqué sur la boutique, toujours disponible en interne.'}
            </p>
            {article ? (
              <p className="text-sm leading-5 font-medium">
                Stock actuel : {article.stock}{' '}
                {Math.abs(article.stock) > 1 ? 'unités' : 'unité'}
              </p>
            ) : null}
            {article && canViewStock ? (
              <Button asChild variant="secondary" className="w-full">
                <Link href="/stock">Voir le stock</Link>
              </Button>
            ) : null}
          </Panel>

          <Panel title="Image de l’article">
            <div className="flex flex-col gap-3 rounded-lg bg-muted p-4">
              {imagePreviewUrl ? (
                <Image
                  src={imagePreviewUrl}
                  alt="Aperçu de la nouvelle image"
                  width={160}
                  height={160}
                  unoptimized
                  className="size-40 rounded-md object-cover"
                />
              ) : article?.imageUrl ? (
                <ArticleImage
                  article={article}
                  className="size-40 overflow-hidden rounded-md bg-card"
                />
              ) : (
                <NavIcon name="articles" className="text-muted-foreground" />
              )}
              <p className="text-sm leading-5 font-medium">
                {imageFile
                  ? imageFile.name
                  : article?.imageUrl
                    ? 'Remplacer l’image'
                    : 'Ajouter une image'}
              </p>
              <p className="text-xs leading-[17px] text-muted-foreground">
                JPEG, PNG ou WebP · 2 Mo maximum
              </p>
            </div>
            <input
              ref={fileInputRef}
              id="article-image"
              type="file"
              accept={ARTICLE_IMAGE_ACCEPT}
              onChange={handleImageChange}
              className="sr-only"
              aria-describedby={imageError ? 'article-image-error' : undefined}
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              Choisir un fichier
            </Button>
            {imageError ? (
              <FieldError id="article-image-error" role="alert">
                {imageError}
              </FieldError>
            ) : null}
          </Panel>
        </aside>
      </div>

      {error ? (
        <FieldError role="alert" className="text-sm">
          {error}
        </FieldError>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={loading} aria-busy={loading} className="sm:min-w-64">
          {loading
            ? 'Enregistrement…'
            : isEdit
              ? 'Enregistrer les modifications'
              : 'Créer l’article'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={loading}
          className="sm:min-w-32"
        >
          Annuler
        </Button>
      </div>

      <UnsavedChangesDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        onDiscard={() => router.push(cancelHref)}
      />
    </form>
  )
}
