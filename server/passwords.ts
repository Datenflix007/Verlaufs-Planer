import * as argon2 from 'argon2'
import type { UserAccount } from '../src/domain/users'
import { SqliteUsers } from './users'

const minimumPasswordLength = 12
const argon2idOptions: argon2.HashOptions = { type: 2, memoryCost: 19 * 1024, timeCost: 2, parallelism: 1 }

const requirePassword = (password: string): void => {
  if (password.length < minimumPasswordLength || password.length > 1024) throw new Error(`Das Passwort muss zwischen ${minimumPasswordLength} und 1024 Zeichen lang sein.`)
}

/** Keeps plaintext passwords in memory only for the duration of an Argon2id operation. */
export class PasswordService {
  constructor(private readonly users: SqliteUsers) {}

  async setPassword(userId: string, password: string): Promise<void> {
    requirePassword(password)
    this.users.setPasswordHash(userId, await argon2.hash(password, argon2idOptions))
  }

  async verifyPassword(user: UserAccount | undefined, password: string): Promise<boolean> {
    if (!user?.isActive || !password) return false
    const hash = this.users.passwordHash(user.id)
    return hash ? argon2.verify(hash, password) : false
  }

  async changePassword(user: UserAccount | undefined, currentPassword: string, nextPassword: string): Promise<boolean> {
    if (!await this.verifyPassword(user, currentPassword)) return false
    await this.setPassword(user!.id, nextPassword)
    return true
  }
}
