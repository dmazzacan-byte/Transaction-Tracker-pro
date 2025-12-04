const { test, expect } = require('@playwright/test');

test.describe('Dashboard Layout Verification', () => {
  test('should display the dashboard with the correct layout', async ({ page }) => {
    await page.goto('http://localhost:8000');

    // Wait for the login form to be visible before trying to fill it
    await expect(page.locator('#login-form')).toBeVisible({ timeout: 10000 });

    // Use a unique email for registration to avoid conflicts
    const userEmail = `test-${Date.now()}@example.com`;

    // Register a new user since the test environment might be clean
    await page.click('#show-register');
    await expect(page.locator('#register-form')).toBeVisible({ timeout: 5000 });
    await page.fill('#register-email', userEmail);
    await page.fill('#register-password', 'password123');
    await page.click('#register-form button[type="submit"]');

    // After registration, Firebase should automatically log the user in.
    // Wait for the app container to become visible, indicating a successful login/redirect.
    await expect(page.locator('#app-container')).toBeVisible({ timeout: 15000 });

    // The body should have the data-ready="true" attribute
    await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });

    // Explicitly click the dashboard link to ensure we are on the correct tab.
    await page.click('.nav-link[data-tab="dashboard"]');

    // Wait for the chart canvases to be present in the DOM.
    await page.waitForSelector('#sales-chart');
    await page.waitForSelector('#product-sales-chart');
    await page.waitForSelector('#customer-ranking-chart');

    // A small delay to ensure charts have visually rendered before taking a screenshot.
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'verification/dashboard_fix_verify.png', fullPage: true });
  });
});
