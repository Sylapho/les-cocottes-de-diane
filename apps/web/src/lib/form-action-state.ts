// Return value of the catalogue Server Actions, consumed with useActionState.
// `at` changes on every completed submission so clients can react to it.
export type FormActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  at: number
}

export const initialFormActionState: FormActionState = {
  status: 'idle',
  at: 0,
}

export function actionSuccess(message?: string): FormActionState {
  return { status: 'success', message, at: Date.now() }
}

export function actionError(error: unknown): FormActionState {
  return {
    status: 'error',
    message:
      error instanceof Error && error.message
        ? error.message
        : 'Une erreur inattendue est survenue.',
    at: Date.now(),
  }
}

export function getFormString(formData: FormData, key: string) {
  const value = formData.get(key)

  return typeof value === 'string' ? value.trim() : ''
}
