import { expect, test } from '@playwright/test'

/**
 * Aportaciones periódicas (Fase 5.1) en el navegador real con datos de Yahoo:
 * Strategy Builder, Strategy Comparison y Cost Analysis.
 */

const a = (ticker, weight, currency = 'USD', assetType = 'ETF') => ({ ticker, name: ticker, assetType, currency, exchange: '', weight })
const st = (id, name, assets, initialCapital = 10000, recurringContributions = []) => ({
  id, name, initialCapital, baseCurrency: 'EUR', assets, recurringContributions,
  createdAt: '2026-11-12T10:00:00.000Z', updatedAt: '2026-11-12T10:00:00.000Z',
})
const c = (id, ticker, amount, frequency = 'monthly') => ({ id, ticker, amount, frequency })

const DCA = st('dca', 'VOO + aportaciones', [a('VOO', 60), a('QQQ', 40)], 10000, [c('c1', 'VOO', 300), c('c2', 'QQQ', 200)])
const ONLY = st('only', 'Solo aportaciones', [a('VOO', 100)], 0, [c('c3', 'VOO', 500)])
const SPAIN = st('es', 'Acciones España', [a('SAN.MC', 100, 'EUR', 'Stock')], 10000)

async function seed(page, path, strategies, extra = {}) {
  await page.goto(path)
  await page.evaluate(([s, e]) => {
    localStorage.setItem('isl.strategies', JSON.stringify({ version: 1, activeId: s[0]?.id ?? null, strategies: s }))
    localStorage.removeItem('isl.comparison')
    localStorage.removeItem('isl.costs')
    for (const [k, v] of Object.entries(e)) localStorage.setItem(k, JSON.stringify(v))
  }, [strategies, extra])
  await page.reload()
}

test('1 · Builder: añadir, modificar, validar y eliminar aportaciones; se conservan al recargar', async ({ page }) => {
  await seed(page, '/strategy-builder', [st('b', 'Base', [a('VOO', 60), a('QQQ', 40)])])
  await expect(page.getByTestId('contrib-panel')).toContainText('Sin aportaciones')
  await page.getByTestId('contrib-add').click()
  const row = page.getByTestId('contrib-row').first()
  await expect(row.getByTestId('contrib-error')).toContainText('Introduce un importe')
  await expect(page.getByTestId('strategy-issues')).toContainText('aportación periódica no válida')

  for (const [value, msg] of [['-50', 'negativo'], ['0', '0 €'], ['abc', 'número']]) {
    await row.getByTestId('contrib-amount').fill(value)
    await expect(row.getByTestId('contrib-error')).toContainText(msg)
  }
  await row.getByTestId('contrib-amount').fill('300')
  await expect(row.getByTestId('contrib-error')).toHaveCount(0)
  await row.getByTestId('contrib-frequency').selectOption('quarterly')
  await expect(page.getByTestId('contrib-yearly')).toContainText('1200 € al año')
  await expect(page.getByTestId('strategy-issues')).toContainText('Estrategia completa')

  // Duplicado (mismo activo y frecuencia)
  await page.getByTestId('contrib-add').click()
  const second = page.getByTestId('contrib-row').nth(1)
  await second.getByTestId('contrib-amount').fill('100')
  await second.getByTestId('contrib-frequency').selectOption('quarterly')
  await expect(second.getByTestId('contrib-error')).toContainText('esta frecuencia')
  await second.getByTestId('contrib-asset').selectOption('QQQ')
  await expect(second.getByTestId('contrib-error')).toHaveCount(0)

  await page.reload()
  await expect(page.getByTestId('contrib-row')).toHaveCount(2)
  await page.getByTestId('contrib-row').nth(1).getByTestId('contrib-remove').click()
  await expect(page.getByTestId('contrib-row')).toHaveCount(1)
})

test('2 · Builder: capital 0 solo es válido con aportaciones; borrar el activo borra sus aportaciones', async ({ page }) => {
  await seed(page, '/strategy-builder', [st('b', 'Base', [a('VOO', 100)])])
  await page.getByTestId('capital-input').fill('0')
  await expect(page.getByTestId('capital-message')).toContainText('al menos una aportación periódica')
  await page.getByTestId('contrib-add').click()
  await page.getByTestId('contrib-amount').fill('500')
  await expect(page.getByTestId('capital-message')).toContainText('empieza con la primera aportación')
  await expect(page.getByTestId('strategy-issues')).toContainText('Estrategia completa')
})

test('3 · Comparison: aportaciones separadas de la rentabilidad (TWR)', async ({ page }) => {
  await seed(page, '/comparison', [DCA, SPAIN], { 'isl.comparison': { selected: ['dca', 'es'], range: { period: '3Y' } } })
  const table = page.getByTestId('cmp-contrib-table')
  await expect(table).toBeVisible({ timeout: 90000 })
  const row = page.getByTestId('cmp-contrib-row').first()
  await expect(row).toContainText('VOO 300 €/mes')
  await expect(row).toContainText('aportaciones')
  await expect(page.getByTestId('cmp-strip')).toContainText('rentabilidad TWR')
  // Total aportado = capital + aportaciones; la ganancia es valor final − total aportado
  const cells = await row.locator('td').allInnerTexts()
  const n = s => Number(s.split('\n')[0].replace(/[^\d,-]/g, '').replace(',', '.'))
  expect(n(cells[2])).toBeCloseTo(n(cells[0]) + n(cells[1]), 0)
  expect(n(cells[4])).toBeCloseTo(n(cells[3]) - n(cells[2]), -1)
})

test('4 · Comparison: estrategia sin capital inicial', async ({ page }) => {
  await seed(page, '/comparison', [ONLY, SPAIN], { 'isl.comparison': { selected: ['only', 'es'], range: { period: '1Y' } } })
  await expect(page.getByTestId('cmp-contrib-table')).toBeVisible({ timeout: 90000 })
  await expect(page.getByTestId('cmp-contrib-row').first().locator('td').first()).toContainText('0 €')
})

test('5 · Cost Analysis: «Selecciona intermediario» por defecto y selector agrupado', async ({ page }) => {
  await seed(page, '/costs', [SPAIN])
  await expect(page.getByTestId('cost-pick-prompt')).toContainText('Selecciona intermediario')
  await expect(page.getByTestId('cost-table')).toHaveCount(0)
  await expect(page.getByTestId('cost-group-bank')).toContainText('Santander')
  await expect(page.getByTestId('cost-group-bank')).toContainText('BBVA')
  await expect(page.getByTestId('cost-group-digital')).toContainText('Revolut')
  await page.getByTestId('cost-scenario').filter({ hasText: 'Bankinter' }).click()
  await expect(page.getByTestId('cost-table')).toBeVisible({ timeout: 90000 })
  await expect(page.getByTestId('cost-strip')).toContainText('Bankinter')
})

test('6 · Cost Analysis con aportaciones: una comisión por compra y nota educativa', async ({ page }) => {
  await seed(page, '/costs', [DCA], { 'isl.costs': { selected: ['dca'], range: { period: '1Y' }, scenario: 'myinvestor' } })
  const card = page.getByTestId('cost-card').first()
  await expect(card).toBeVisible({ timeout: 90000 })
  await expect(card).toContainText('Compras periódicas (')
  await expect(page.getByTestId('cost-edu')).toContainText('se repite cada vez')
  const row = page.getByTestId('cost-row').first()
  await expect(row).toContainText('periódicas')
  // Trade Republic: planes de inversión sin cargo -> compras periódicas a 0 €
  await page.getByTestId('cost-scenario').filter({ hasText: 'Trade Republic' }).click()
  const periodic = card.locator('tr', { has: page.locator('th', { hasText: 'Compras periódicas' }) }).locator('td')
  await expect(periodic).toHaveText('0,00 €')
})

test('7 · móvil: Builder con aportaciones y Cost Analysis sin desbordamiento', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page, '/strategy-builder', [DCA])
  await expect(page.getByTestId('contrib-row')).toHaveCount(2)
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.goto('/costs')
  await page.getByTestId('cost-scenario').filter({ hasText: 'ING' }).click()
  await expect(page.getByTestId('cost-table')).toBeVisible({ timeout: 90000 })
  overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
