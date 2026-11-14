'use client'

import {
  deleteArticleCategoryAction,
  saveArticleCategoryAction,
} from '@/app/article-categories/actions'
import { UnsavedChangesDialog } from '@/components/layout/unsaved-changes-dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { ArticleCategory } from '@/lib/article-categories'
import {
  initialFormActionState,
  type FormActionState,
} from '@/lib/form-action-state'
import {
  startTransition,
  useActionState,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

export function ArticleCategorySheet({
  category,
  trigger,
}: {
  // Absent in creation mode.
  category?: ArticleCategory
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [, saveAction, saving] = useActionState(
    async (previousState: FormActionState, formData: FormData) => {
      const result = await saveArticleCategoryAction(previousState, formData)

      setFormError(result.status === 'error' ? (result.message ?? '') : '')

      if (result.status === 'success') {
        toast.success(result.message)
        setDirty(false)
        setOpen(false)
      }

      return result
    },
    initialFormActionState,
  )
  const [, deleteAction, deleting] = useActionState(
    async (previousState: FormActionState, formData: FormData) => {
      const result = await deleteArticleCategoryAction(previousState, formData)

      setDeleteOpen(false)

      if (result.status === 'success') {
        toast.success(result.message)
        setDirty(false)
        setOpen(false)
      } else {
        toast.error('La catégorie n’a pas été supprimée', {
          description: result.message,
        })
      }

      return result
    },
    initialFormActionState,
  )
  const articlesCount = category?._count?.articles ?? 0
  const isUsed = articlesCount > 0

  function handleOpenChange(next: boolean) {
    if (!next && dirty && !saving) {
      setLeaveOpen(true)
      return
    }

    if (next) {
      setDirty(false)
      setFormError('')
    }

    setOpen(next)
  }

  const prefix = category ? `category-${category.id}` : 'category-new'

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="gap-5 p-8 sm:max-w-[520px]">
          <SheetTitle className="text-3xl leading-[42px]">
            {category ? 'Modifier la catégorie' : 'Créer une catégorie'}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Nom, slug, description, ordre d’affichage et état de la catégorie.
          </SheetDescription>

          <form
            // onSubmit (not action=) so React keeps the fields after an error.
            onSubmit={(event) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)
              startTransition(() => saveAction(formData))
            }}
            onChange={() => setDirty(true)}
            className="flex flex-col gap-5"
          >
            {category ? (
              <input type="hidden" name="id" value={category.id} />
            ) : null}

            <Field>
              <FieldLabel htmlFor={`${prefix}-name`}>Nom *</FieldLabel>
              <Input
                id={`${prefix}-name`}
                name="name"
                required
                maxLength={120}
                defaultValue={category?.name}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`${prefix}-slug`}>Slug</FieldLabel>
              <Input
                id={`${prefix}-slug`}
                name="slug"
                maxLength={120}
                defaultValue={category?.slug}
                placeholder="généré depuis le nom"
                aria-describedby={`${prefix}-slug-help`}
              />
              <FieldDescription id={`${prefix}-slug-help`}>
                Utilisé dans l’adresse de la catégorie sur la boutique.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor={`${prefix}-description`}>Description</FieldLabel>
              <Textarea
                id={`${prefix}-description`}
                name="description"
                maxLength={500}
                defaultValue={category?.description ?? ''}
                rows={3}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`${prefix}-order`}>Ordre</FieldLabel>
              <Input
                id={`${prefix}-order`}
                name="sortOrder"
                type="number"
                min={0}
                defaultValue={category?.sortOrder ?? 0}
              />
            </Field>

            <label
              htmlFor={`${prefix}-active`}
              className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border px-3 text-sm leading-5 font-medium"
            >
              Active
              <Switch
                id={`${prefix}-active`}
                name="isActive"
                defaultChecked={category?.isActive ?? true}
                onCheckedChange={() => setDirty(true)}
              />
            </label>

            {formError ? <FieldError role="alert">{formError}</FieldError> : null}

            <div className="flex flex-col gap-3">
              <Button type="submit" disabled={saving} aria-busy={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleOpenChange(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              {category ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-danger hover:text-danger"
                  onClick={() => setDeleteOpen(true)}
                  disabled={saving}
                >
                  {isUsed ? 'Désactiver la catégorie…' : 'Supprimer la catégorie…'}
                </Button>
              ) : null}
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {category ? (
        <AlertDialog
          open={deleteOpen}
          onOpenChange={(next) => !deleting && setDeleteOpen(next)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isUsed ? 'Désactiver' : 'Supprimer'} « {category.name} » ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isUsed
                  ? `${articlesCount} ${articlesCount > 1 ? 'articles utilisent' : 'article utilise'} cette catégorie. Elle sera désactivée ; les articles restent intacts et vous pourrez la réactiver.`
                  : 'Aucun article n’utilise cette catégorie : elle sera supprimée définitivement.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={category.id} />
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  Conserver la catégorie
                </AlertDialogCancel>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={deleting}
                  aria-busy={deleting}
                >
                  {deleting
                    ? 'En cours…'
                    : isUsed
                      ? 'Désactiver la catégorie'
                      : 'Supprimer la catégorie'}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <UnsavedChangesDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        subject="cette catégorie"
        onDiscard={() => {
          setDirty(false)
          setOpen(false)
        }}
      />
    </>
  )
}
