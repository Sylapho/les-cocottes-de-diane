import {
  AdminUserDeletionError,
  deleteAdminUser,
  requireGerantSession,
} from '@/lib/admin-users'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireGerantSession()

  if (!session) {
    return NextResponse.json({ message: 'Accès interdit' }, { status: 403 })
  }

  const { id } = await context.params

  try {
    await deleteAdminUser(id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AdminUserDeletionError) {
      return NextResponse.json(
        { message: err.message },
        { status: err.code === 'USER_NOT_FOUND' ? 404 : 403 },
      )
    }

    return NextResponse.json(
      { message: 'Impossible de supprimer cet utilisateur.' },
      { status: 500 },
    )
  }
}
