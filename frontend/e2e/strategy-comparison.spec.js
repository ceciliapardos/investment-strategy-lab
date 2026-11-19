import { expect, test } from '@playwright/test'

/**
 * Strategy Comparison en un navegador real, con datos reales de Yahoo
 * (backend en marcha). Las estrategias se cargan en localStorage con el mismo
 * formato que guarda el Strategy Builder.
 */

const PAGE = '/comparison'
const a = (ticker, weight, currency = 'USD', assetType = 'ETF') => ({ ticker, name: ticker, assetType, currency, exchange: '', weight })
const st = (id, name, assets, initialCapital = 10000) => ({
  id, name, initialCapital, baseCurrency: 'EUR', assets,
  createdAt: '2026-11-12T10:00:00.000Z', updatedAt: '2026-11-12T10:00:00.000Z',
})

const GLOBAL = st('g', 'Cartera global', [a('IWDA.AS', 80, 'EUR'), a('VOO', 20)], 50000)
const TECH = st('t', 'Cartera tecnológica', [a('QQQ', 60), a('AAPL', 20, 'USD', 'Stock'), a('MSFT', 20, 'USD', 'Stock')], 20000)
const SP = st('s', 'Solo S&P 500', [a('VOO', 100)], 10000)

async function seed(page, strategies, comparison) {
  await page.goto(PAGE)
  await page.evaluate(([s, c]) => {
    localStorage.setItem('isl.strategies', JSON.stringify({ version: 1, activeId: s[0]?.id ?? null, strategies: s }))
    if (c) localStorage.setItem('isl.comparison', JSON.stringify(c)); else localStorage.removeItem('isl.comparison')
  }, [strategies, comparison ?? null])
  await page.reload()
}

const rows = page => page.getByTestId('cmp-row')
const mainLines = page => page.locator('.cmp-chart .recharts-wrapper').first().locator('.recharts-line')

test('1 · sin estrategias suficientes: estado vacío con enlace al Strategy Builder', async ({ page }) => {
  await seed(page, [])
  await expect(page.getByTestId('cmp-empty')).toContainText('Necesitas al menos dos estrategias para compararlas')
  await seed(page, [SP])
  await expect(page.getByTestId('cmp-empty')).toContainText('Tienes una estrategia')
  await page.getByTestId('cmp-go-builder').click()
  await expect(page).toHaveURL(/strategy-builder/)
})

test('2 · estrategias inválidas: explica qué falta (suma distinta de 100 %)', async ({ page }) => {
  await seed(page, [SP, st('x', 'Incompleta', [a('VOO', 60)])])
  const empty = page.getByTestId('cmp-empty')
  await expect(empty).toContainText('solo 1 está lista')
  await expect(empty).toContainText('Incompleta')
  await expect(empty).toContainText('Faltan 40 % por asignar.')
})

test('3 · comparar dos estrategias (5 años): métricas, gráfico, drawdown y composición', async ({ page }) => {
  await seed(page, [GLOBAL, SP])
  await expect(rows(page)).toHaveCount(2)
  await expect(page.getByTestId('cmp-effective')).toBeVisible()
  await expect(page.getByTestId('cmp-strip')).toContainText('Convertidos desde USD')
  await expect(mainLines(page)).toHaveCount(2)
  await expect(page.locator('.cmp-chart .recharts-wrapper')).toHaveCount(2) // evolución + caída desde máximos
  await expect(page.getByTestId('cmp-composition')).toHaveCount(2)
  const first = rows(page).first()
  await expect(first).toContainText('Cartera global')
  await expect(first).toContainText('50.000 €')
  await expect(first).toContainText('%')
  // Sin rankings ni "mejor estrategia"
  await expect(page.locator('main')).not.toContainText(/mejor estrategia|recomendada|ganadora/i)
})

test('4 · tres estrategias con distinto capital, periodo de 1 año', async ({ page }) => {
  await seed(page, [GLOBAL, TECH, SP])
  await expect(rows(page)).toHaveCount(3)
  await page.getByRole('button', { name: '1A', exact: true }).click()
  await expect(page.getByTestId('cmp-effective')).toBeVisible()
  await expect(rows(page)).toHaveCount(3)
  const capitals = await rows(page).locator('td:nth-child(2)').allInnerTexts()
  expect(capitals).toEqual(['50.000 €', '20.000 €', '10.000 €'])
  await expect(mainLines(page)).toHaveCount(3)
})

test('5 · fechas personalizadas (inicio en sábado) y fechas incorrectas', async ({ page }) => {
  await seed(page, [GLOBAL, SP])
  await page.getByRole('button', { name: 'Fechas' }).click()
  const [from, to] = await page.locator('.period__dates input').all()
  await from.fill('2024-01-06')
  await to.fill('2024-12-31')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByTestId('cmp-notice').filter({ hasText: 'no fue un día con cotización común' })).toBeVisible()
  await expect(page.getByTestId('cmp-effective')).toContainText('8 ene 2024')

  await from.fill('2024-06-01')
  await to.fill('2024-01-01')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.locator('.period__error')).toHaveText('La fecha inicial debe ser anterior a la final.')
})

test('6 · activo con histórico corto limita el periodo común (IBIT)', async ({ page }) => {
  await seed(page, [SP, st('b', 'Con bitcoin ETF', [a('VOO', 90), a('IBIT', 10)])], { selected: ['s', 'b'], range: { period: 'MAX' } })
  const notice = page.getByTestId('cmp-notice').filter({ hasText: 'Máximo periodo común' })
  await expect(notice).toContainText('IBIT')
  await expect(page.getByTestId('cmp-effective')).toContainText('2024')
})

test('7 · periodo sin datos comunes', async ({ page }) => {
  await seed(page, [GLOBAL, SP], { selected: ['g', 's'], range: { start: '1995-01-02', end: '1996-01-02' } })
  await expect(page.getByTestId('cmp-nodata')).toContainText('No hay datos')
})

test('8 · selección y periodo se conservan al recargar; vuelta al Strategy Builder', async ({ page }) => {
  await seed(page, [GLOBAL, TECH, SP])
  await expect(rows(page)).toHaveCount(3)
  await page.getByLabel('Comparar Cartera tecnológica').uncheck({ force: true })
  await page.getByRole('button', { name: '10A', exact: true }).click()
  await expect(rows(page)).toHaveCount(2)
  await page.reload()
  await expect(rows(page)).toHaveCount(2)
  await expect(page.getByRole('button', { name: '10A', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // Mostrar/ocultar una línea desde la leyenda
  await expect(mainLines(page)).toHaveCount(2)
  await page.getByTestId('cmp-legend-item').first().click()
  await expect(mainLines(page)).toHaveCount(1)

  await page.getByRole('link', { name: 'Strategy Builder' }).first().click()
  await expect(page).toHaveURL(/strategy-builder/)
  await expect(page.getByTestId('strategy-item')).toHaveCount(3)
})

test('9 · editar una estrategia inválida lleva al Strategy Builder con ella seleccionada', async ({ page }) => {
  await seed(page, [GLOBAL, SP, st('x', 'Por terminar', [a('VOO', 50)])])
  await page.getByRole('button', { name: 'Editar' }).click()
  await expect(page).toHaveURL(/strategy-builder/)
  await expect(page.getByTestId('strategy-name')).toHaveText('Por terminar')
})

test('10 · móvil: sin desbordamiento horizontal de la página', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page, [GLOBAL, TECH, SP])
  await expect(rows(page)).toHaveCount(3)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
})

test('11 · regresión: Strategy Builder, Explore Markets y News', async ({ page }) => {
  await seed(page, [GLOBAL, SP])
  await page.goto('/strategy-builder')
  await expect(page.getByTestId('strategy-item')).toHaveCount(2)
  await page.goto('/markets?ticker=VOO')
  await expect(page.locator('.metric')).toHaveCount(5)   // + Sharpe (Fase 7)
  await page.goto('/news')
  await expect(page.locator('.ncard').first()).toBeVisible()
})
