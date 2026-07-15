import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access'

export const authAccessControl = createAccessControl({
  ...defaultStatements,
} as const)

const administrator = authAccessControl.newRole({
  ...adminAc.statements,
})

const employee = authAccessControl.newRole({})

export const betterAuthRoles = {
  admin: administrator,
  gerant: employee,
  vendeur: employee,
  production: employee,
  stock: employee,
  comptable: employee,
}
