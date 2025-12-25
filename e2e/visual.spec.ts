import { test, expect } from '@playwright/test';

test.describe('Visual Tests - Public Pages', () => {
  test('homepage visual check', async ({ page }) => {
    await page.goto('/');
    
    // Check key elements
    await expect(page.locator('text=Family Powerhouse')).toBeVisible();
    await expect(page.locator('text=Bring Your Family Together')).toBeVisible();
    await expect(page.locator('text=Start Free Today')).toBeVisible();
    await expect(page.locator('text=Continue as Guest')).toBeVisible();
    await expect(page.locator('text=See Features')).toBeVisible();
    
    // Feature cards
    await expect(page.locator('text=Money Pooling')).toBeVisible();
    await expect(page.locator('text=Family Chat')).toBeVisible();
    await expect(page.locator('text=Trip Planning')).toBeVisible();
    await expect(page.locator('text=Budget Tracker')).toBeVisible();
    await expect(page.locator('text=Ventures')).toBeVisible();
    await expect(page.locator('text=Accountability')).toBeVisible();
    
    // Take screenshot for manual review
    await page.screenshot({ path: 'e2e/screenshots/homepage.png', fullPage: true });
  });

  test('login page visual check', async ({ page }) => {
    await page.goto('/login');
    
    // Check key elements
    await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible();
    await expect(page.locator('text=Sign in to continue to your dashboard')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible();
    await expect(page.locator('text=Forgot password?')).toBeVisible();
    await expect(page.locator('text=Create an Account')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/screenshots/login.png', fullPage: true });
  });

  test('signup page visual check', async ({ page }) => {
    await page.goto('/signup');
    
    // Check key elements
    await expect(page.locator('h2:has-text("Create Your Account")')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Create Account")')).toBeVisible();
    await expect(page.locator('text=Sign In Instead')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/screenshots/signup.png', fullPage: true });
  });

  test('signup password strength indicator', async ({ page }) => {
    await page.goto('/signup');
    
    const passwordInput = page.locator('input[name="password"]');
    
    // Type weak password
    await passwordInput.fill('abc');
    await expect(page.locator('text=12+ characters')).toBeVisible();
    
    // Type stronger password
    await passwordInput.fill('StrongPass123');
    
    // Verify all check items are visible
    await expect(page.locator('text=12+ characters')).toBeVisible();
    await expect(page.locator('text=Uppercase letter')).toBeVisible();
    await expect(page.locator('text=Lowercase letter')).toBeVisible();
    await expect(page.locator('text=Number')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/screenshots/signup-password-strong.png', fullPage: true });
  });
});

test.describe('Navigation Flow', () => {
  test('homepage to signup flow', async ({ page }) => {
    await page.goto('/');
    
    // Click Get Started
    await page.click('text=Get Started');
    await expect(page).toHaveURL('/signup');
    await expect(page.locator('h2:has-text("Create Your Account")')).toBeVisible();
  });

  test('homepage to login flow', async ({ page }) => {
    await page.goto('/');
    
    // Click Sign In in nav
    await page.click('nav >> text=Sign In');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible();
  });

  test('login to signup navigation', async ({ page }) => {
    await page.goto('/login');
    
    await page.click('text=Create an Account');
    await expect(page).toHaveURL('/signup');
  });

  test('signup to login navigation', async ({ page }) => {
    await page.goto('/signup');
    
    await page.click('text=Sign In Instead');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Form Validation', () => {
  test('login form has required fields', async ({ page }) => {
    await page.goto('/login');
    
    // Email field should be required
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('required', '');
    
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('signup form validation - invalid email', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'not-an-email');
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator('text=Invalid email')).toBeVisible({ timeout: 5000 });
  });

  test('signup form validation - weak password', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'weak');
    await page.click('button[type="submit"]');
    
    // Should show password validation error
    await expect(page.locator('text=Password must be at least 12 characters')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Responsive Design', () => {
  test('homepage mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check mobile elements
    await expect(page.locator('text=Family Powerhouse')).toBeVisible();
    await expect(page.locator('text=Bring Your Family Together')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/screenshots/homepage-mobile.png', fullPage: true });
  });

  test('login page mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    // Left panel should be hidden on mobile (lg:flex)
    await expect(page.locator('text=Welcome back to your family hub')).not.toBeVisible();
    
    // Form should be visible
    await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/screenshots/login-mobile.png', fullPage: true });
  });

  test('signup page mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/signup');
    
    // Right panel should be hidden on mobile
    await expect(page.locator('text=Everything your family needs in one place')).not.toBeVisible();
    
    // Form should be visible
    await expect(page.locator('h2:has-text("Create Your Account")')).toBeVisible();
    
    await page.screenshot({ path: 'e2e/screenshots/signup-mobile.png', fullPage: true });
  });
});

test.describe('Guest Access', () => {
  test('guest button is visible on homepage', async ({ page }) => {
    await page.goto('/');
    
    const guestButton = page.locator('text=Continue as Guest');
    await expect(guestButton).toBeVisible();
    
    // Check helper text
    await expect(page.locator('text=Limited read-only access')).toBeVisible();
  });
});
