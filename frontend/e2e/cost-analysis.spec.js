import { expect, test } from '@playwright/test'

/**
 * Cost Analysis en un navegador real, con datos reales de Yahoo y el dataset
 * de tarifas del backend (backend en marcha).
 */

const PAGE = '/costs'
const a = (ticker, weight, currency = 'USD', assetType = 'ETF') => ({ ticker, name: ticker, assetType, currency, exchange: '', weight })
const st = (id, name, assets, initialCapital = 10000) => ({
  id, name, initialCapital, baseCurrency: 'EUR', assets,
  createdAt: '2026-11-12T10:00:00.000Z', updatedAt: '2026-11-12T10:00:00.000Z',
})

const SPAIN = st('es', 'Acciones España', [a('SAN.MC', 50, 'EUR', 'Stock'), a('ITX.MC', 50, 'EUR', 'Stock')], 10000)
const MIXED = st('mx', 'Mixta global', [a('VOO', 50), a('IWDA.AS', 30, 'EUR'), a('AAPL', 20, 'USD', 'Stock')], 20000)
const CRYPTO = st('cr', 'Con cripto', [a('VOO', 70), a('BTC-USD', 30, 'USD', 'Crypto')], 5000)

async function seed(page, strategies, costs) {
  await page.goto(PAGE)
  await page.evaluate(([s, c]) => {
    localStorage.setItem('isl.strategies', JSON.stringify({ version: 1, activeId: s[0]?.id ?? null, strategies: s }))
    if (c) localStorage.setItem('isl.costs', JSON.stringify(c)); else localStorage.removeItem('isl.costs')
  }, [strategies, costs ?? null])
  await page.reload()
}

const rows = page => page.getByTestId('cost-row')
const euros = txt => Number(txt.replace(/[^\d,-]/g, '').replace(',', '.'))
const line = (page, label, i = 0) => page.getByTestId('cost-card').nth(i).locator('tr', { has: page.locator('th', { hasText: label }) }).first().locator('td')
const pickScenario = (page, name) => page.getByTestId('cost-scenario').filter({ hasText: name }).click()

test('1 · sin estrategias: estado vacío con enlace al Strategy Builder', async ({ page }) => {
  await seed(page, [])
  await expect(page.getByTestId('cost-empty')).toContainText('Necesitas al menos una estrategia completa')
})

test('2 · solo acciones españolas con ING: comisión, custodia y sin divisa', async ({ page }) => {
  await seed(page, [SPAIN], { selected: ['es'], range: { period: '1Y' }, scenario: 'ing' })
  await expect(rows(page)).toHaveCount(1)
  const card = page.getByTestId('cost-card').first()
  await expect(line(page, 'Compras iniciales')).toHaveText('16,00 €')           // 2 × (3 € + 0,10 % × 5.000 €)
  await expect(line(page, 'Cambio de divisa (compra)')).toHaveText('0,00 €')   // activos en euros
  await expect(page.getByTestId('cost-strip')).toContainText('Tarifas consultadas a 12/11/2026')
  await expect(page.getByTestId('cost-ter')).toContainText('No aplica')
})

test('3 · ETF y acciones en USD: divisa aplicada; broker sin custodia', async ({ page }) => {
  await seed(page, [MIXED], { selected: ['mx'], range: { period: '3Y' }, scenario: 'myinvestor' })
  const card = page.getByTestId('cost-card').first()
  await expect(line(page, 'Cambio de divisa (compra)')).toHaveText('42,00 €')  // 0,30 % de 14.000 € en USD
  await expect(line(page, 'Custodia')).toHaveText('0,00 €')
  await expect(line(page, 'Compras iniciales')).toHaveText('24,00 €')          // 0,12 % de 20.000 €
})

test('4 · comisión fija (Trade Republic): 1 € por operación', async ({ page }) => {
  await seed(page, [MIXED], { selected: ['mx'], range: { period: '5Y' }, scenario: 'traderepublic' })
  await expect(line(page, 'Compras iniciales')).toHaveText('3,00 €')
  await expect(line(page, 'Ventas')).toHaveText('3,00 €')
})

test('5 · escenario personalizado: porcentaje con mínimo, divisa, custodia y validación', async ({ page }) => {
  await seed(page, [SPAIN], { selected: ['es'], range: { period: '1Y' } })
  await expect(page.getByTestId('cost-pick-prompt')).toBeVisible()        // sin intermediario por defecto
  await pickScenario(page, 'Costes personalizados')
  await expect(rows(page)).toHaveCount(1, { timeout: 60000 })
  await page.getByTestId('custom-buy_rate').fill('0,1')
  await page.getByTestId('custom-buy_min').fill('10')
  await expect(line(page, 'Compras iniciales')).toHaveText('20,00 €', { timeout: 30000 }) // 5 € -> mínimo 10 € × 2
  await page.getByTestId('custom-fx_rate').fill('abc')
  await expect(page.getByTestId('cost-custom')).toContainText('Introduce un número')
  await page.getByTestId('custom-fx_rate').fill('')
  await expect(page.getByTestId('cost-strip-scenario')).toHaveText('Costes personalizados')
})

test('6 · coste cero: sin costes de intermediación el resultado es el de Comparison', async ({ page }) => {
  await seed(page, [SPAIN], { selected: ['es'], range: { period: '1Y' }, scenario: 'none' })
  const row = rows(page).first()
  await expect(row.getByTestId('cost-during')).toHaveText('0,00 €')
  const gross = await row.locator('td').nth(1).locator('b').innerText()
  await expect(row.getByTestId('cost-net')).toHaveText(gross)
})

test('7 · datos de broker incompletos con cripto + TER disponible', async ({ page }) => {
  await seed(page, [CRYPTO], { selected: ['cr'], range: { period: '1Y' }, scenario: 'ing' })
  await expect(page.getByTestId('cost-incomplete')).toContainText('BTC-USD')
  await expect(rows(page).first()).toContainText('Datos incompletos')
  const voo = page.getByTestId('cost-ter-row').filter({ hasText: 'VOO' })
  await expect(voo.getByTestId('cost-ter-value')).toContainText('%')
  await expect(page.getByTestId('cost-ter')).toContainText('no se vuelve a restar')
})

test('8 · varias estrategias y capitales distintos; comparación de intermediarios sin ranking', async ({ page }) => {
  await seed(page, [SPAIN, MIXED, CRYPTO], { selected: ['es', 'mx', 'cr'], range: { period: '3Y' }, scenario: 'ing' })
  await expect(rows(page)).toHaveCount(3)
  await expect(rows(page).nth(0)).toContainText('Acciones España')    // orden de selección, no por resultado
  await expect(rows(page).nth(1)).toContainText('20.000 €')
  await expect(page.getByTestId('cost-impact-delta')).toHaveCount(3)
  const brokers = page.getByTestId('cost-broker-row')
  await expect(brokers).toHaveCount(12)                              // 10 perfiles tarifarios + sin costes + personalizado
  await expect(page.getByTestId('cost-brokers')).toContainText('Bancos tradicionales')
  await expect(page.getByTestId('cost-brokers')).toContainText('Brokers y bancos digitales')
  await page.getByTestId('cost-focus').selectOption('mx')
  await expect(brokers.first()).toContainText('Santander')
  await expect(page.locator('body')).not.toContainText(/mejor broker|recomendado/i)
})

test('9 · periodo corto vs largo: la custodia de ING crece con el tiempo', async ({ page }) => {
  await seed(page, [SPAIN], { selected: ['es'], range: { period: '1Y' }, scenario: 'ing' })
  const custody = async () => euros(await line(page, 'Custodia').innerText())
  await expect(rows(page)).toHaveCount(1)
  const short = await custody()
  await page.getByRole('button', { name: '10A', exact: true }).click()
  await expect.poll(custody, { timeout: 90000 }).toBeGreaterThan(short)
})

test('10 · recarga: se recuerdan estrategias, periodo, intermediario y costes personalizados', async ({ page }) => {
  await seed(page, [SPAIN], { selected: ['es'], range: { period: '1Y' } })
  await pickScenario(page, 'Costes personalizados')
  await page.getByTestId('custom-buy_fixed').fill('2,5')
  await page.waitForTimeout(500)
  await page.reload()
  await expect(page.getByTestId('custom-buy_fixed')).toHaveValue('2,5')
  await expect(line(page, 'Compras iniciales')).toHaveText('5,00 €', { timeout: 60000 })
})

test('11 · móvil: sin desbordamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page, [SPAIN, MIXED], { selected: ['es', 'mx'], range: { period: '1Y' }, scenario: 'ing' })
  await expect(rows(page)).toHaveCount(2)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('12 · navegación: Cost Analysis disponible desde la barra y la Home', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Cost Analysis' }).first().click()
  await expect(page).toHaveURL(/\/costs$/)
  await expect(page.getByRole('heading', { name: 'Cost Analysis' })).toBeVisible()
})
