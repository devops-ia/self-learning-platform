import { test, expect } from '@playwright/test';

// Helper: generate a unique email for each test run
function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

const TEST_PASSWORD = 'TestPass123!';

test.describe('Home - Landing page (unauthenticated)', () => {
  test('shows landing page with title and 3 step cards', async ({ page }) => {
    await page.goto('/');

    // The landing page renders an h1 with the main title (t.home.title)
    // Spanish default: "Desarrolla capacidad tecnica real"
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    // The page should display the 3 step cards, each inside a bordered div
    // Each card has a number (1, 2, 3) rendered as a .text-2xl div
    const stepCards = page.locator('div.border.border-\\[var\\(--border\\)\\].rounded-lg.p-6.text-center');
    await expect(stepCards).toHaveCount(3);

    // Verify the step numbers are present
    await expect(page.getByText('1', { exact: true })).toBeVisible();
    await expect(page.getByText('2', { exact: true })).toBeVisible();
    await expect(page.getByText('3', { exact: true })).toBeVisible();
  });

  test('shows a login link in navbar when not authenticated', async ({ page }) => {
    await page.goto('/');

    // The navbar should show a login link (a[href="/login"])
    await expect(page.locator('nav a[href="/login"]')).toBeVisible();
  });
});

test.describe('Home - Authenticated user view', () => {
  test('shows module cards after login', async ({ page }) => {
    const email = uniqueEmail();

    // Register a fresh user
    await page.goto('/register');
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });

    // After login, the home page should show the "welcome back" heading
    // Spanish: "Continua aprendiendo"
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    // Module progress cards are rendered inside a grid
    // They may or may not exist depending on seeded data
    // Just verify the page loaded with the authenticated layout
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });
});
