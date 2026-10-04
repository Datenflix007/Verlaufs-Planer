import { expect, test } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { createPlan } from '../src/domain/factories'
import type { WorkspaceSettings } from '../src/domain/types'

const dateIn = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

test('speichert Prioritäten und ordnet Dashboard-Vorschauen nach ihrem Gewicht', async ({ page, request }) => {
  const originalWorkspace = await (await request.get('/api/workspace')).json() as WorkspaceSettings
  const lightningPlan = createPlan('Spätere Blitzplanung')
  const waitingPlan = createPlan('Frühere Warteplanung')
  lightningPlan.days[0]!.date = dateIn(14)
  lightningPlan.metadata.priorityId = 'lightning'
  waitingPlan.days[0]!.date = dateIn(2)
  waitingPlan.metadata.priorityId = 'waiting'

  try {
    await request.put('/api/workspace', { data: { ...originalWorkspace, todos: [] } })
    await request.put('/api/plans/' + lightningPlan.id, { data: lightningPlan })
    await request.put('/api/plans/' + waitingPlan.id, { data: waitingPlan })

    await page.goto('/settings/workspace')
    const waitingRow = page.locator('.priority-row', { hasText: 'Kann warten' })
    for (let index = 0; index < 3; index += 1) await waitingRow.getByRole('button', { name: 'Kann warten eine Position nach oben' }).click()
    await expect.poll(async () => (await (await request.get('/api/workspace')).json() as WorkspaceSettings).priorities[0]).toMatchObject({ id: 'waiting', order: 0, weight: 4 })

    const reorderedWorkspace = await (await request.get('/api/workspace')).json() as WorkspaceSettings
    await request.put('/api/workspace', {
      data: {
        ...reorderedWorkspace,
        todos: [
          { id: randomUUID(), title: 'Späterer Warten-Termin', dueDate: dateIn(12), priorityId: 'waiting', completed: false },
          { id: randomUUID(), title: 'Früherer Blitz-Termin', dueDate: dateIn(1), priorityId: 'lightning', completed: false },
        ],
      },
    })

    await page.goto('/')
    await expect(page.locator('.widget-upcoming-plans .dashboard-list li strong')).toContainText(['Frühere Warteplanung', 'Spätere Blitzplanung'])
    await expect(page.locator('.widget-upcoming-todos .dashboard-list li strong')).toContainText(['Späterer Warten-Termin', 'Früherer Blitz-Termin'])
    await expect(page.locator('.widget-upcoming-todos .dashboard-list')).toContainText('⚡ Blitz')

    await page.goto('/plan/' + lightningPlan.id)
    await page.getByLabel('Priorität').selectOption('waiting')
    await expect.poll(async () => (await (await request.get('/api/plans/' + lightningPlan.id)).json()).metadata.priorityId).toBe('waiting')
  } finally {
    await Promise.all([
      request.delete('/api/plans/' + lightningPlan.id),
      request.delete('/api/plans/' + waitingPlan.id),
      request.put('/api/workspace', { data: originalWorkspace }),
    ])
  }
})
