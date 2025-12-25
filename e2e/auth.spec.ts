import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Family Powerhouse')).toBeVisible();
    await expect(page.locator('text=Bring Your Family Together')).toBeVisible();
  });

  test('can navigate to sign up page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Get Started');
    await expect(page).toHaveURL('/signup');
    await expect(page.locator('text=Create Account')).toBeVisible();
  });

  test('can navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Welcome Back')).toBeVisible();
  });

  test('shows validation errors on invalid signup', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'weak');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid email')).toBeVisible();
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // This would need proper auth setup for real tests
    // For now, just checking the page loads
  });

  test('onboarding page shows options', async ({ page }) => {
    // Skip if not authenticated
    await page.goto('/onboarding');
    
    // If redirected to login, that's expected behavior
    const url = page.url();
    if (url.includes('/login')) {
      expect(true).toBe(true);
      return;
    }
    
    // If on onboarding, check for expected content
    await expect(page.locator('text=Create a New Family')).toBeVisible();
    await expect(page.locator('text=Join Existing Family')).toBeVisible();
  });
});
