import { test, expect } from '@playwright/test';

// Helper: generate a unique email for each test run to avoid collisions
function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

const TEST_PASSWORD = 'TestPass123!';
const SHORT_PASSWORD = 'short';

test.describe('Auth - Registration flow', () => {
  test('can register a new account and land on the home page', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/register');

    // The page should show the registration heading
    await expect(page.locator('h1')).toBeVisible();

    // Fill in registration form (ids come from RegisterForm.tsx)
    await page.fill('#reg-email', email);
    await page.fill('#reg-username', 'e2etester');
    await page.fill('#reg-password', TEST_PASSWORD);

    // Submit the form
    await page.click('button[type="submit"]');

    // After successful registration the app redirects to /
    await page.waitForURL('/', { timeout: 10000 });

    // The navbar should show the user menu (the User icon button with ChevronDown)
    // When logged in, the navbar renders a button with the username or display name
    await expect(page.locator('nav').getByText('e2etester')).toBeVisible();
  });

  test('shows validation error for password shorter than 8 characters', async ({ page }) => {
    await page.goto('/register');

    await page.fill('#reg-email', uniqueEmail());
    await page.fill('#reg-password', SHORT_PASSWORD);

    // Click submit -- the browser's native validation (minLength=8) should prevent submission
    // or the server should return an error
    await page.click('button[type="submit"]');

    // Expect to still be on the register page (form was not accepted)
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Auth - Login flow', () => {
  const loginEmail = uniqueEmail();

  // Register an account first so login tests have a valid user
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/register');
    await page.fill('#reg-email', loginEmail);
    await page.fill('#reg-password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });

    await context.close();
  });

  test('can login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // The page should show the login heading
    await expect(page.locator('h1')).toBeVisible();

    // Fill in login form (ids come from LoginForm.tsx)
    await page.fill('#email', loginEmail);
    await page.fill('#password', TEST_PASSWORD);

    await page.click('button[type="submit"]');

    // Should redirect to home
    await page.waitForURL('/', { timeout: 10000 });

    // Navbar should show the user dropdown (a button inside nav)
    // When logged in, the nav renders the User icon + name + ChevronDown
    await expect(page.locator('nav button').first()).toBeVisible();
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', loginEmail);
    await page.fill('#password', 'WrongPassword999!');

    await page.click('button[type="submit"]');

    // Should stay on the login page
    await expect(page).toHaveURL(/\/login/);

    // An error message should appear (rendered as a div with the error text)
    // The API returns "Invalid email or password" and the UI shows it in a styled div
    const errorBox = page.locator('form div').filter({ hasText: /invalid|error|incorrecto/i }).first();
    await expect(errorBox).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Auth - Logout flow', () => {
  test('can logout after logging in', async ({ page }) => {
    const email = uniqueEmail();

    // Register a fresh user
    await page.goto('/register');
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });

    // Open the user dropdown in the navbar
    // The dropdown toggle is a button inside nav with the ChevronDown icon
    // We need to wait for it to be visible first
    const userMenuButton = page.locator('nav button').filter({ hasText: email.split('@')[0] });
    await userMenuButton.waitFor({ state: 'visible', timeout: 5000 });
    await userMenuButton.click();

    // Wait for the dropdown menu to appear
    await page.waitForSelector('nav button:has-text("Cerrar sesión"), nav button:has-text("Log out")', { timeout: 5000 });

    // Click the logout option (last button in the dropdown, contains LogOut icon)
    const logoutButton = page.locator('nav button').filter({ hasText: /cerrar sesión|logout|log out/i }).first();
    await logoutButton.click();

    // After logout the app redirects to /
    await page.waitForURL('/', { timeout: 10000 });

    // The navbar should now show a login link instead of the user menu
    await expect(page.locator('nav a[href="/login"]')).toBeVisible();
  });
});

test.describe('Auth - Protected routes', () => {
  test('unauthenticated user visiting /profile is redirected to /login', async ({ page }) => {
    // Navigate to /profile without being logged in
    await page.goto('/profile');

    // The middleware redirects to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('non-admin user visiting /admin is redirected to /', async ({ page }) => {
    const email = uniqueEmail();

    // Register a regular user
    await page.goto('/register');
    await page.fill('#reg-email', email);
    await page.fill('#reg-password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });

    // Try to visit /admin — middleware checks role and redirects non-admins to /
    await page.goto('/admin');
    await expect(page).toHaveURL('/');
  });
});
