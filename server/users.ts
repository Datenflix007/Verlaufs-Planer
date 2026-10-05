import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { appConfig } from './config'
import { userRoles, type CreateUserAccount, type UserAccount, type UserRole } from '../src/domain/users'

type StoredUser = Omit<UserAccount, 'isActive' | 'deactivatedAt'> & { isActive: number; deactivatedAt: string | null }

const normaliseLogin = (value: string): string => {
  const login = value.trim().toLocaleLowerCase('en-US')
  if (login.length < 3 || login.length > 254 || /\s/.test(login)) throw new Error('Der Login-Identifier muss 3 bis 254 Zeichen ohne Leerzeichen enthalten.')
  return login
}

const normaliseDisplayName = (value: string): string => {
  const name = value.trim()
  if (!name || name.length > 160) throw new Error('Der Anzeigename muss zwischen 1 und 160 Zeichen enthalten.')
  return name
}

const ensureRole = (role: UserRole): UserRole => {
  if (!userRoles.includes(role)) throw new Error('Unbekannte Benutzerrolle.')
  return role
}

/** SQLite-backed account foundation. Auth-02 adds password hashes; this repository never stores plaintext passwords. */
export class SqliteUsers {
  private readonly database: DatabaseSync

  constructor(path = appConfig().databasePath) {
    mkdirSync(dirname(path), { recursive: true })
    this.database = new DatabaseSync(path)
    this.database.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      login_identifier TEXT NOT NULL COLLATE NOCASE UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('USER', 'ADMIN')),
      is_active INTEGER NOT NULL CHECK(is_active IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deactivated_at TEXT
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_users_active_login ON users(is_active, login_identifier);`)
    const columns = this.database.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>
    if (!columns.some((column) => column.name === 'password_hash')) this.database.exec('ALTER TABLE users ADD COLUMN password_hash TEXT')
  }

  private toUser(row: StoredUser | undefined): UserAccount | undefined {
    return row && { ...row, isActive: row.isActive === 1, deactivatedAt: row.deactivatedAt ?? undefined }
  }

  create(input: CreateUserAccount): UserAccount {
    const now = new Date().toISOString()
    const user: UserAccount = { id: randomUUID(), loginIdentifier: normaliseLogin(input.loginIdentifier), displayName: normaliseDisplayName(input.displayName), role: ensureRole(input.role ?? 'USER'), isActive: true, createdAt: now, updatedAt: now }
    this.database.prepare('INSERT INTO users (id, login_identifier, display_name, role, is_active, created_at, updated_at, deactivated_at) VALUES (?, ?, ?, ?, 1, ?, ?, NULL)').run(user.id, user.loginIdentifier, user.displayName, user.role, now, now)
    return user
  }

  get(id: string): UserAccount | undefined {
    return this.toUser(this.database.prepare('SELECT id, login_identifier AS loginIdentifier, display_name AS displayName, role, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt, deactivated_at AS deactivatedAt FROM users WHERE id = ?').get(id) as StoredUser | undefined)
  }

  findByLogin(loginIdentifier: string): UserAccount | undefined {
    return this.toUser(this.database.prepare('SELECT id, login_identifier AS loginIdentifier, display_name AS displayName, role, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt, deactivated_at AS deactivatedAt FROM users WHERE login_identifier = ?').get(normaliseLogin(loginIdentifier)) as StoredUser | undefined)
  }

  list(): UserAccount[] {
    return (this.database.prepare('SELECT id, login_identifier AS loginIdentifier, display_name AS displayName, role, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt, deactivated_at AS deactivatedAt FROM users ORDER BY created_at').all() as StoredUser[]).map((row) => this.toUser(row)!)
  }

  deactivate(id: string): UserAccount | undefined {
    const existing = this.get(id)
    if (!existing || !existing.isActive) return existing
    const now = new Date().toISOString()
    this.database.prepare('UPDATE users SET is_active = 0, updated_at = ?, deactivated_at = ? WHERE id = ?').run(now, now, id)
    return this.get(id)
  }

  passwordHash(id: string): string | undefined {
    const row = this.database.prepare('SELECT password_hash AS passwordHash FROM users WHERE id = ?').get(id) as { passwordHash: string | null } | undefined
    return row?.passwordHash ?? undefined
  }

  setPasswordHash(id: string, passwordHash: string): void {
    if (!passwordHash.startsWith('$argon2id$')) throw new Error('Es dürfen ausschließlich Argon2id-Passworthashes gespeichert werden.')
    const now = new Date().toISOString()
    if (this.database.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, now, id).changes !== 1) throw new Error('Benutzer nicht gefunden.')
  }
}
