const { test, expect } = require('@playwright/test');

test.describe('UI Verification', () => {
  let uniqueId;

  test.beforeAll(() => {
    uniqueId = new Date().getTime();
  });

  test('should register, login, and capture screenshots', async ({ page }) => {
    // Listen for all console events and log them to the test output
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    // Desktop viewport is default
    await page.goto('http://localhost:3000');

    // Registration
    await page.click('#show-register');
    await page.fill('#register-email', `user+${uniqueId}@example.com`);
    await page.fill('#register-password', 'password123');
    await page.click('#register-form button[type="submit"]');

    // Wait for app to load after login
    await expect(page.locator('#app-container')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', { timeout: 10000 });

    // Capture Dashboard
    await page.screenshot({ path: 'verification/dashboard-fix.png' });

    // Navigate and Capture Orders
    await page.click('a.nav-link[data-view="orders"]');
    await expect(page.locator('#orders')).toBeVisible();
    await page.screenshot({ path: 'verification/orders-fix.png' });

    // Navigate and Capture Customers
    await page.click('a.nav-link[data-view="customers"]');
    await expect(page.locator('#customers')).toBeVisible();
    await page.screenshot({ path: 'verification/customers-fix.png' });
  });
});
