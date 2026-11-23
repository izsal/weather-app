import { test, expect } from '@playwright/test'

test('loads weather dashboard and switches temperature unit', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Qwarts' })).toBeVisible()
  await expect(page.locator('.loading-state')).toBeHidden({ timeout: 20_000 }).catch(() => {})
  await page.getByLabel('Pengaturan tampilan').click()
  const fahrenheit = page.getByRole('button', { name: '°F', exact: true })
  await expect(fahrenheit).toBeVisible()
  await fahrenheit.click()
  await expect(fahrenheit).toHaveAttribute('aria-pressed', 'true')
})

test('searches a city and opens weather details', async ({ page }) => {
  await page.goto('/')
  const input = page.getByRole('combobox', { name: 'Cari kota' })
  await input.fill('Bandung')
  await input.press('Enter')
  await expect(page.locator('h2')).toContainText(/Bandung|Bandung/i, { timeout: 20_000 })
})
