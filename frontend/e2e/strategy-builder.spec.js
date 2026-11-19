import { expect, test } from '@playwright/test'

/**
 * Flujos principales del Strategy Builder en un navegador real.
 * Cada test empieza con un navegador limpio (localStorage vacío).
 * Los tests marcados «Yahoo» buscan activos reales a través del backend.
 */

const BUILDER = '/strategy-builder'

async function seed(page, strategies, activeId) {
  await page.goto(BUILDER)
  await page.evaluate(([s, a]) => {
    localStorage.setItem('isl.strategies', JSON.stringify({ version: 1, activeId: a, strategies: s }))
  }, [strategies, activeId ?? strategies[0]?.id ?? null])
  await page.reload()
}

const strat = (id, name, assets = [], initialCapital = 10000) => ({
  id, name, initialCapital, baseCurrency: 'EUR', assets,
  createdAt: '2026-11-12T10:00:00.000Z', updatedAt: '2026-11-12T10:00:00.000Z',
})
const asset = (ticker, weight, currency = 'USD', assetType = 'ETF') => ({ ticker, name: `${ticker} name`, assetType, currency, exchange: 'NYSEArca', weight })

async function addReal(page, query, ticker) {
  const form = page.getByTestId('asset-search')
  await form.getByLabel('Buscar activo para añadir').fill(query)
  await form.getByRole('button', { name: 'Buscar' }).click()
  await page.getByTestId(`add-${ticker}`).click()
  await expect(page.locator(`[data-testid="asset-row"][data-ticker="${ticker}"]`)).toBeVisible()
}

const allocationText = page => page.getByTestId('allocation-text')

test('1 · estado vacío y creación de la primera estrategia', async ({ page }) => {
  await page.goto(BUILDER)
  await expect(page.getByTestId('empty-state')).toBeVisible()
  await expect(page.getByText('Crea tu primera estrategia')).toBeVisible()
  await page.getByTestId('create-first').click()
  await expect(page.getByTestId('strategy-name')).toHaveText('Estrategia A')
  await expect(page.getByTestId('strategy-status')).toHaveText('Incompleta')
  await expect(allocationText(page)).toContainText('Añade activos')
})

test('2 · nombres: renombrar, vacío, demasiado largo y duplicado', async ({ page }) => {
  await seed(page, [strat('a', 'Estrategia A'), strat('b', 'Cartera tecnológica')], 'a')
  await page.getByTestId('rename').click()
  const input = page.getByTestId('rename-input')

  await input.fill('   ')
  await page.getByTestId('rename-save').click()
  await expect(page.getByTestId('rename-error')).toHaveText('El nombre no puede estar vacío.')

  await input.fill('x'.repeat(41))
  await page.getByTestId('rename-save').click()
  await expect(page.getByTestId('rename-error')).toContainText('como máximo 40')

  await input.fill('cartera TECNOLÓGICA')
  await page.getByTestId('rename-save').click()
  await expect(page.getByTestId('rename-error')).toHaveText('Ya tienes una estrategia con ese nombre.')

  await input.fill('Mi estrategia 2035')
  await input.press('Enter')
  await expect(page.getByTestId('strategy-name')).toHaveText('Mi estrategia 2035')
  await expect(page.getByTestId('strategy-item').first()).toContainText('Mi estrategia 2035')
})

test('3 · capital inicial: válidos e inválidos', async ({ page }) => {
  await seed(page, [strat('a', 'Estrategia A')])
  const capital = page.getByTestId('capital-input')
  const msg = page.getByTestId('capital-message')

  for (const [value, expected] of [
    ['-500', 'no puede ser negativo'],
    ['0', 'al menos una aportación periódica'],
    ['diez mil', 'debe ser un número'],
    ['', 'Introduce el capital'],
    ['2.000.000.000', 'máximo permitido'],
    ['100,555', '2 decimales'],
  ]) {
    await capital.fill(value)
    await expect(msg).toContainText(expected)
    await expect(capital).toHaveAttribute('aria-invalid', 'true')
  }

  await capital.fill('50.000')
  await expect(capital).toHaveAttribute('aria-invalid', 'false')
  await capital.blur()
  await expect(capital).toHaveValue('50.000')
  await expect(page.getByTestId('strategy-item').first()).toContainText('50.000 €')
})

test('4 · Yahoo: añadir activos reales, pesos, validaciones, duplicado, eliminar y persistencia', async ({ page }) => {
  await page.goto(BUILDER)
  await page.getByTestId('create-first').click()

  await addReal(page, 'VOO', 'VOO')
  await addReal(page, 'QQQ', 'QQQ')
  await addReal(page, 'Apple', 'AAPL')
  await expect(page.getByTestId('asset-count')).toHaveText('3')
  await expect(page.locator('[data-ticker="AAPL"]')).toContainText('Acción')
  await expect(page.locator('[data-ticker="VOO"]')).toContainText('USD')

  // Duplicado
  const form = page.getByTestId('asset-search')
  await form.getByLabel('Buscar activo para añadir').fill('VOO')
  await form.getByRole('button', { name: 'Buscar' }).click()
  await page.getByTestId('add-VOO').click()
  await expect(page.getByTestId('picker-message')).toHaveText('VOO ya forma parte de esta estrategia.')
  await expect(page.getByTestId('asset-row')).toHaveCount(3)

  // Suma inferior, superior y exacta
  await page.getByTestId('weight-VOO').fill('50')
  await page.getByTestId('weight-QQQ').fill('35')
  await expect(allocationText(page)).toHaveText('85 % asignado — queda 15 %')
  await page.getByTestId('weight-AAPL').fill('23')
  await expect(allocationText(page)).toHaveText('108 % asignado — debes reducir 8 %')
  await expect(page.getByTestId('allocation')).toHaveAttribute('data-status', 'over')
  await page.getByTestId('weight-AAPL').fill('15')
  await expect(allocationText(page)).toHaveText('100 % asignado — la cartera está completa')
  await expect(page.getByTestId('strategy-status')).toHaveText('✓ Lista para comparar')
  await expect(page.getByTestId('composition-total')).toHaveText('100 %')

  // Pesos inválidos (la app no corrige nada por su cuenta)
  for (const [value, expected] of [
    ['-5', 'no puede ser negativo'],
    ['abc', 'debe ser un número'],
    ['0', '0 %'],
    ['150', 'superar el 100 %'],
    ['12,555', '2 decimales'],
  ]) {
    await page.getByTestId('weight-AAPL').fill(value)
    await expect(page.getByTestId('weight-error-AAPL')).toContainText(expected)
    await expect(page.getByTestId('strategy-status')).toHaveText('Incompleta')
  }

  // Decimales con coma
  await page.getByTestId('weight-AAPL').fill('7,5')
  await page.getByTestId('weight-QQQ').fill('42,5')
  await expect(allocationText(page)).toHaveText('100 % asignado — la cartera está completa')

  // Eliminar un activo: los demás pesos NO cambian
  await page.getByTestId('remove-AAPL').click()
  await expect(page.getByTestId('asset-row')).toHaveCount(2)
  await expect(page.getByTestId('weight-VOO')).toHaveValue('50')
  await expect(page.getByTestId('weight-QQQ')).toHaveValue('42,5')
  await expect(allocationText(page)).toHaveText('92,5 % asignado — queda 7,5 %')

  // Persistencia tras recargar
  await page.getByTestId('capital-input').fill('25.000')
  await page.reload()
  await expect(page.getByTestId('strategy-name')).toHaveText('Estrategia A')
  await expect(page.getByTestId('weight-VOO')).toHaveValue('50')
  await expect(page.getByTestId('weight-QQQ')).toHaveValue('42,5')
  await expect(page.getByTestId('capital-input')).toHaveValue('25.000')
  await expect(allocationText(page)).toHaveText('92,5 % asignado — queda 7,5 %')
})

test('5 · varias estrategias: crear 4, cambiar, duplicar y eliminar con confirmación', async ({ page }) => {
  await seed(page, [strat('a', 'Cartera conservadora', [asset('VOO', 60), asset('BND', 40)])])
  for (let i = 0; i < 3; i++) await page.getByTestId('new-strategy').click()
  await expect(page.getByTestId('strategy-item')).toHaveCount(4)
  await expect(page.getByTestId('strategy-name')).toHaveText('Estrategia C') // la última creada queda seleccionada

  // Cambiar de estrategia
  await page.getByTestId('strategy-item').filter({ hasText: 'Cartera conservadora' }).click()
  await expect(page.getByTestId('strategy-name')).toHaveText('Cartera conservadora')
  await expect(page.getByTestId('weight-VOO')).toHaveValue('60')
  await expect(page.getByTestId('strategy-status')).toHaveText('✓ Lista para comparar')

  // Duplicar: copia independiente
  await page.getByTestId('duplicate-strategy').click()
  await expect(page.getByTestId('strategy-name')).toHaveText('Cartera conservadora — copia')
  await expect(page.getByTestId('strategy-item')).toHaveCount(5)
  await page.getByTestId('weight-VOO').fill('70')
  await page.getByTestId('strategy-item').filter({ hasText: /^Cartera conservadora2 activos/ }).click()
  await expect(page.getByTestId('weight-VOO')).toHaveValue('60') // el original no cambia

  // Eliminar: cancelar y luego confirmar
  await page.getByTestId('delete-strategy').click()
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByTestId('strategy-item')).toHaveCount(5)
  await page.getByTestId('delete-strategy').click()
  await expect(page.getByRole('alertdialog')).toContainText('¿Eliminar «Cartera conservadora»?')
  await page.getByTestId('confirm-dialog-ok').click()
  await expect(page.getByTestId('strategy-item')).toHaveCount(4)
  await expect(page.getByTestId('strategy-item').filter({ hasText: /^Cartera conservadora2/ })).toHaveCount(0)

  await page.reload()
  await expect(page.getByTestId('strategy-item')).toHaveCount(4)
})

test('6 · eliminar todas las estrategias muestra el estado vacío (también tras recargar)', async ({ page }) => {
  await seed(page, [strat('a', 'Uno'), strat('b', 'Dos')])
  for (let i = 0; i < 2; i++) {
    await page.getByTestId('delete-strategy').click()
    await page.getByTestId('confirm-dialog-ok').click()
  }
  await expect(page.getByTestId('empty-state')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('empty-state')).toBeVisible()
})

test('7 · móvil: sin desbordamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(BUILDER)
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(await overflow()).toBe(false)
  await seed(page, [strat('a', 'Un nombre bastante largo de estrategia 2035', [asset('VOO', 50), asset('QQQ', 60), asset('^GSPC', null, 'USD', 'Index')])])
  await expect(page.getByTestId('asset-row')).toHaveCount(3)
  expect(await overflow()).toBe(false)
  await expect(page.getByTestId('allocation-text')).toContainText('debes reducir 10 %')
})

test('8 · regresión: Explore Markets y News siguen funcionando (Yahoo + noticias)', async ({ page }) => {
  await page.goto('/markets?ticker=VOO')
  await expect(page.locator('.metric')).toHaveCount(5)   // + Sharpe (Fase 7)
  await expect(page.locator('.pchart')).toBeVisible()

  await page.goto('/news')
  await expect(page.locator('.ncard').first()).toBeVisible()
  expect(await page.locator('.ncard').count()).toBeGreaterThan(5)
})
