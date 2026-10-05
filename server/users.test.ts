import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SqlitePlans } from './sqlitePlans'
import { SqliteUsers } from './users'
import { PasswordService } from './passwords'

describe('SqliteUsers', () => {
  it('migrates an existing planning database without dropping its contents', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'verlaufsplaner-users-')), 'planner.sqlite')
    new SqlitePlans(path).save({ id: 'plan-1', metadata: { title: 'Bestehende Planung' }, updatedAt: '2026-10-05T10:00:00.000Z', days: [] })
    const users = new SqliteUsers(path)
    const admin = users.create({ loginIdentifier: 'Ada.Admin', displayName: 'Ada Admin', role: 'ADMIN' })
    expect(new SqlitePlans(path).get('plan-1')).toMatchObject({ metadata: { title: 'Bestehende Planung' } })
    expect(users.findByLogin('ada.admin')).toMatchObject({ id: admin.id, role: 'ADMIN', isActive: true })
  })

  it('normalises unique login identifiers and records deactivation without deleting the account', () => {
    const users = new SqliteUsers(join(mkdtempSync(join(tmpdir(), 'verlaufsplaner-users-')), 'users.sqlite'))
    const user = users.create({ loginIdentifier: 'Lea.Teacher', displayName: 'Lea Lehrerin' })
    expect(user).toMatchObject({ loginIdentifier: 'lea.teacher', role: 'USER', isActive: true })
    expect(() => users.create({ loginIdentifier: 'LEA.TEACHER', displayName: 'Duplikat' })).toThrow()
    expect(users.deactivate(user.id)).toMatchObject({ isActive: false, deactivatedAt: expect.any(String) })
    expect(users.get(user.id)?.displayName).toBe('Lea Lehrerin')
  })

  it('stores only Argon2id hashes and verifies a password change', async () => {
    const users = new SqliteUsers(join(mkdtempSync(join(tmpdir(), 'verlaufsplaner-users-')), 'users.sqlite'))
    const user = users.create({ loginIdentifier: 'password.test', displayName: 'Passwort Test' })
    const passwords = new PasswordService(users)
    await passwords.setPassword(user.id, 'ein-lang-genuges-test-passwort')
    const firstHash = users.passwordHash(user.id)
    expect(firstHash).toMatch(/^\$argon2id\$/)
    expect(firstHash).not.toContain('ein-lang-genuges-test-passwort')
    await expect(passwords.verifyPassword(user, 'ein-lang-genuges-test-passwort')).resolves.toBe(true)
    await expect(passwords.changePassword(user, 'falsch', 'ein-anderes-lang-genuges-passwort')).resolves.toBe(false)
    await expect(passwords.changePassword(user, 'ein-lang-genuges-test-passwort', 'ein-anderes-lang-genuges-passwort')).resolves.toBe(true)
    await expect(passwords.verifyPassword(user, 'ein-lang-genuges-test-passwort')).resolves.toBe(false)
    await expect(passwords.verifyPassword(user, 'ein-anderes-lang-genuges-passwort')).resolves.toBe(true)
  })
})
