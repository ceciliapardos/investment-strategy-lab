import { expect, test } from '@playwright/test'

/**
 * Fase 7: Sharpe, benchmark, sensibilidad a costes y «Mi lista» (favoritos),
 * en el navegador real con datos reales de Yahoo (backend en marcha). Sin IA.
 */

const a = (ticker, weight, currency = 'USD', assetType = 'ETF') => ({ ticker, name: ticker, assetType, currency, exchange: '', weight })
const st = (id, name, assets, initialCapital = 10000) => ({
  id, name, initialCapital, baseCurrency: 'EUR', assets, recurringContributions: [],
  createdAt: '2026-11-12T10:00:00.000Z', updatedAt: '2026-11-12T10:00:00.000Z',
})
const SP = st('sp', 'Solo S&P 500', [a('VOO', 100)])
const ES = st('es', 'Acciones España', [a('SAN.MC', 100, 'EUR', 'Stock')])

async function seed(page, path, strategies, extra = {}) {
  await page.goto(path)
  await page.evaluate(([s, e]) => {
    localStorage.setItem('isl.strategies', JSON.stringify({ version: 1, activeId: s[0]?.id ?? null, strategies: s }))
    for (const k of ['isl.comparison', 'isl.costs', 'isl.favorites']) localStorage.removeItem(k)
    for (const [k, v] of Object.entries(e)) localStorage.setItem(k, JSON.stringify(v))
  }, [strategies, extra])
  await page.reload()
}

// ------------------------------ Mi lista ------------------------------
test('1 · Mi lista: vacía, añadir, persistir al recargar, abrir y quitar', async ({ page }) => {
  await seed(page, '/markets', [])
  await expect(page.getByTestId('fav-empty')).toBeVisible()
  await page.goto('/markets?ticker=VOO')
  const toggle = page.getByTestId('fav-toggle')
  await expect(toggle).toHaveText('Añadir a Mi lista', { timeout: 60000 })
  await toggle.click()
  await expect(toggle).toHaveText('En Mi lista')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await page.reload()                                                     // persistencia
  await expect(page.getByTestId('fav-toggle')).toHaveText('En Mi lista', { timeout: 60000 })
  await page.goto('/markets')
  await expect(page.getByTestId('fav-item')).toHaveCount(1)
  await expect(page.getByTestId('fav-item')).toContainText('VOO')
  await page.getByTestId('fav-open').click()                              // abrir favorito
  await expect(page).toHaveURL(/ticker=VOO/)
  await page.goto('/markets')
  await page.getByTestId('fav-remove').click()
  await expect(page.getByTestId('fav-empty')).toBeVisible()
})

test('2 · Mi lista: un mismo ticker no se duplica', async ({ page }) => {
  await seed(page, '/markets', [], { 'isl.favorites': { version: 1, items: [{ ticker: 'VOO', name: 'Vanguard', type: 'ETF' }] } })
  await page.goto('/markets?ticker=voo')
  await expect(page.getByTestId('fav-toggle')).toHaveText('En Mi lista', { timeout: 60000 })
  await page.goto('/markets')
  await expect(page.getByTestId('fav-item')).toHaveCount(1)
})

// ------------------------------ Sharpe ------------------------------
test('3 · Sharpe en Explore Markets (con rf 0 % indicado)', async ({ page }) => {
  await seed(page, '/markets', [])
  await page.goto('/markets?ticker=VOO')
  await expect(page.locator('.metric', { hasText: 'Ratio de Sharpe (rf 0 %)' })).toBeVisible({ timeout: 60000 })
  await expect(page.locator('.metric', { hasText: 'Ratio de Sharpe' }).locator('.metric__value')).toHaveText(/^-?\d+,\d{2}$/)
})

// ------------------------------ Benchmark ------------------------------
test('4 · Benchmark S&P 500 TR: mismo periodo, sección separada, línea en el gráfico y Sharpe', async ({ page }) => {
  await seed(page, '/comparison', [SP, ES], { 'isl.comparison': { selected: ['sp', 'es'], range: { period: '3Y' } } })
  await expect(page.getByTestId('cmp-table')).toBeVisible({ timeout: 90000 })
  await expect(page.getByTestId('cmp-sharpe')).toHaveCount(2)
  await expect(page.getByTestId('cmp-benchmark')).toHaveCount(0)          // opcional: sin referencia por defecto
  await page.getByTestId('cmp-benchmark-select').selectOption('sp500tr')
  const sec = page.getByTestId('cmp-benchmark')
  await expect(sec).toBeVisible({ timeout: 90000 })
  await expect(page.getByTestId('cmp-benchmark-kind')).toHaveText(/Índice directo/i)
  await expect(sec).toContainText('^SP500TR')
  await expect(page.getByTestId('cmp-benchmark-table')).toContainText('Sharpe')
  await expect(page.getByTestId('cmp-benchmark-lines').locator('li')).toHaveCount(2)
  await expect(page.getByTestId('cmp-benchmark-lines')).toContainText('frente a')
  await expect(page.getByTestId('cmp-legend-benchmark')).toBeVisible()
  await expect(page.getByTestId('cmp-row')).toHaveCount(2)                // no es una estrategia más
  await expect(sec).not.toContainText(/batió|superó al mercado/i)
})

test('5 · Benchmark MSCI World: etiquetado como proxy ETF', async ({ page }) => {
  await seed(page, '/comparison', [SP, ES], { 'isl.comparison': { selected: ['sp', 'es'], range: { period: '1Y' }, benchmark: 'msci_world' } })
  await expect(page.getByTestId('cmp-benchmark')).toBeVisible({ timeout: 90000 })
  await expect(page.getByTestId('cmp-benchmark-kind')).toHaveText(/proxy/i)
  await expect(page.getByTestId('cmp-benchmark')).toContainText('IWDA.AS')
})

// ------------------------------ Sensibilidad a costes ------------------------------
test('6 · Sensibilidad a costes: separada, 4 perfiles, coste creciente con la rotación', async ({ page }) => {
  await seed(page, '/costs', [ES])
  const sec = page.getByTestId('cost-sensitivity')
  await expect(sec).toBeVisible({ timeout: 60000 })
  await expect(page.getByTestId('sens-badge')).toContainText('simulación educativa')
  await expect(page.getByTestId('sens-row')).toHaveCount(4, { timeout: 60000 })
  const diffs = async () => (await page.getByTestId('sens-diff').allInnerTexts()).map(t => Number(t.replace(/[^\d]/g, '')))
  await expect.poll(async () => { const d = await diffs(); return d[0] < d[3] }).toBe(true)
  // Sin comisiones y sin coste recurrente: ninguna diferencia
  await page.getByTestId('sens-broker').selectOption('none')
  await page.getByTestId('sens-recurring_pct').fill('0')
  await expect.poll(async () => (await diffs()).every(d => d === 0), { timeout: 30000 }).toBe(true)
  // Horizonte más largo → más diferencia con coste recurrente
  await page.getByTestId('sens-recurring_pct').fill('0,5')
  await page.getByTestId('sens-years').fill('10')
  await expect.poll(async () => (await diffs())[0] > 0, { timeout: 30000 }).toBe(true)
  const d10 = (await diffs())[0]
  await page.getByTestId('sens-years').fill('30')
  await expect.poll(async () => (await diffs())[0] > d10, { timeout: 30000 }).toBe(true)
  await expect(page.getByTestId('sens-chart')).toBeVisible()
})

test('7 · móvil: Comparison con benchmark, Explore y sensibilidad sin desbordamiento', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page, '/comparison', [SP, ES], { 'isl.comparison': { selected: ['sp', 'es'], range: { period: '1Y' }, benchmark: 'sp500tr' } })
  await expect(page.getByTestId('cmp-benchmark')).toBeVisible({ timeout: 90000 })
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)
  await page.goto('/costs')
  await expect(page.getByTestId('sens-row')).toHaveCount(4, { timeout: 60000 })
  expect(await overflow()).toBeLessThanOrEqual(0)
  await page.goto('/markets')
  await expect(page.getByTestId('fav-list')).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
})
