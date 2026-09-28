import { expect, test } from '@playwright/test'
import { createPlan } from '../src/domain/factories'
import { copyFile, readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'

test('Mindmap bearbeiten, lokal speichern und auf dem Audience-Fenster zeigen', async ({ page, request, context }) => {
  const plan = createPlan('Mindmap Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)
  await expect(page.getByTitle('Mindmap')).toBeVisible()
  await page.getByTitle('Mindmap').click()
  await expect(page.locator('.map-node input')).toBeVisible()
  await page.locator('.map-node input').fill('Fotosynthese')
  await page.locator('.map-node input').press('Enter')
  await page.getByRole('button', { name: '+ Unterast' }).click()
  await page.locator('.map-node input').fill('Voraussetzungen')
  await page.locator('.map-node input').press('Enter')
  await page.locator('.map-toolbar').getByRole('button', { name: '+', exact: true }).click()
  await expect(page.locator('.map-toolbar small')).toHaveText('110%')
  await page.getByRole('button', { name: 'Zentrieren' }).click()
  await expect(page.locator('.map-toolbar small')).toHaveText('100%')
  await page.getByRole('button', { name: 'Bearbeitung beenden' }).last().click()
  await page.getByRole('button', { name: '+ Folie' }).click()
  await page.locator('.thumb').first().click()
  await expect(page.locator('.map-node')).toContainText(['Fotosynthese', 'Voraussetzungen'])
  await expect.poll(async () => {
    const response = await request.get(`/api/plans/${plan.id}`)
    const saved = await response.json()
    return saved.presentation?.slides?.[0]?.elements?.[0]?.content?.mindmap?.nodes?.length
  }).toBe(2)
  await page.reload()
  await expect(page.locator('.map-node')).toContainText(['Fotosynthese', 'Voraussetzungen'])
  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Präsentieren' }).click()
  const audience = await popupPromise
  await expect(page.getByText('Presenter Console')).toBeVisible()
  await expect(audience.locator('.map-node')).toContainText(['Fotosynthese', 'Voraussetzungen'])
  await page.locator('.live-mindmap-panel').getByRole('button', { name: '+ Unterast' }).click()
  await page.locator('.live-mindmap-panel .map-node input').fill('Chlorophyll')
  await page.locator('.live-mindmap-panel .map-node input').press('Enter')
  await expect(audience.locator('.map-node')).toContainText(['Fotosynthese', 'Voraussetzungen', 'Chlorophyll'])
  await expect.poll(async () => {
    const response = await request.get(`/api/plans/${plan.id}`)
    const saved = await response.json()
    return saved.presentation?.slides?.[0]?.elements?.[0]?.content?.mindmap?.nodes?.length
  }).toBe(3)
  await page.getByRole('button', { name: 'Nächste →' }).click()
  await expect(audience.getByText('Titel hinzufügen')).toBeVisible()
  await expect(audience.locator('.map-node')).toHaveCount(0)
  await page.getByRole('button', { name: 'Präsentation beenden' }).click()
  await expect(audience.getByText('Präsentation beendet.')).toBeVisible()
})

test('exportiert alle Folien als selbstständiges HTML und als PDF', async ({ page, request, context }) => {
  test.setTimeout(60_000)
  const plan = createPlan('Export Browserprüfung')
  await request.put(`/api/plans/${plan.id}`, { data: plan })
  await page.goto(`/plan/${plan.id}/presentation`)
  await page.getByTitle('Mindmap').click()
  await page.locator('.map-node input').fill('Fotosynthese')
  await page.locator('.map-node input').press('Enter')
  await page.getByRole('button', { name: 'Bearbeitung beenden' }).last().click()
  await page.getByRole('button', { name: '+ Folie' }).click()

  const htmlDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'HTML exportieren' }).click()
  const htmlFile = await htmlDownload
  expect(htmlFile.suggestedFilename()).toMatch(/\.html$/)
  const html = await readFile(await htmlFile.path(), 'utf8')
  expect(html).toContain('data:image/png;base64,')
  const htmlPage = await context.newPage()
  await htmlPage.setContent(html)
  await expect(htmlPage.getByText('Folie 1 / 2')).toBeVisible()
  await htmlPage.getByRole('button', { name: 'Nächste Folie' }).click()
  await expect(htmlPage.getByText('Folie 2 / 2')).toBeVisible()
  await htmlPage.close()

  const pdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF exportieren' }).click()
  const pdfFile = await pdfDownload
  expect(pdfFile.suggestedFilename()).toMatch(/\.pdf$/)
  const pdfPath = await pdfFile.path()
  const pdf = await PDFDocument.load(await readFile(pdfPath))
  expect(pdf.getPageCount()).toBe(2)
  expect(pdf.getPage(0).getSize()).toMatchObject({ width: 960, height: 540 })
  await copyFile(pdfPath, 'test-results/presentation-export.pdf')
})
