'use server'

import {
  createPickupPoint,
  deactivatePickupPoint,
  reactivatePickupPoint,
  updatePickupPoint,
} from '@/lib/api'
import { requireUiPermission } from '@/lib/auth-session'
import {
  actionError,
  actionSuccess,
  getFormString,
  type FormActionState,
} from '@/lib/form-action-state'
import { canManagePickupPoints } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

function parsePickupPointForm(formData: FormData) {
  const allowedWeekdays = formData
    .getAll('allowedWeekdays')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value))
  const alternatingWeekAnchorDate = getFormString(
    formData,
    'alternatingWeekAnchorDate',
  )

  return {
    label: getFormString(formData, 'label'),
    address: getFormString(formData, 'address'),
    schedule: getFormString(formData, 'schedule'),
    allowedWeekdays,
    alternatingWeekAnchorDate: alternatingWeekAnchorDate || null,
  }
}

export async function savePickupPointAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  // Permission errors redirect, so they stay outside the try/catch.
  await requireUiPermission(canManagePickupPoints)

  const id = Number(formData.get('id'))
  const isEdit = Number.isInteger(id) && id > 0
  const data = parsePickupPointForm(formData)

  if (!data.label || !data.address || !data.schedule) {
    return actionError(
      new Error('Le nom, l’adresse et les informations de retrait sont obligatoires.'),
    )
  }

  if (data.allowedWeekdays.length === 0) {
    return actionError(new Error('Choisissez au moins un jour de retrait.'))
  }

  try {
    if (isEdit) {
      await updatePickupPoint(id, data)
    } else {
      await createPickupPoint({
        ...data,
        active: formData.get('active') === 'on',
      })
    }
  } catch (error) {
    return actionError(error)
  }

  revalidatePath('/admin/pickup-points')

  return actionSuccess(isEdit ? 'Point de retrait enregistré' : 'Point de retrait créé')
}

export async function setPickupPointActiveAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  await requireUiPermission(canManagePickupPoints)

  const id = Number(formData.get('id'))
  const active = formData.get('active') === 'true'

  try {
    if (active) {
      await reactivatePickupPoint(id)
    } else {
      await deactivatePickupPoint(id)
    }
  } catch (error) {
    return actionError(error)
  }

  revalidatePath('/admin/pickup-points')

  return actionSuccess(active ? 'Point de retrait réactivé' : 'Point de retrait désactivé')
}
