export const userRoles = ['USER', 'ADMIN'] as const
export type UserRole = typeof userRoles[number]

/** Public account data. Password hashes deliberately do not belong to this domain shape. */
export interface UserAccount {
  id: string
  loginIdentifier: string
  displayName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
  deactivatedAt?: string
}

export interface CreateUserAccount {
  loginIdentifier: string
  displayName: string
  role?: UserRole
}
