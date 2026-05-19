
import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Capture console errors
        errors = []
        page.on("pageerror", lambda err: errors.append(err))

        await page.set_viewport_size({"width": 1280, "height": 800})
        await page.goto("http://localhost:8000")

        os.makedirs("verification", exist_ok=True)

        # --- 1. Verify Initial Login and Dashboard ---
        await page.wait_for_selector("#login-form", state="visible")
        await page.fill("#login-email", "test@example.com")
        await page.fill("#login-password", "password123")
        await page.click("button[type='submit']")
        await page.wait_for_selector("body[data-ready='true']", state="attached")

        # Check if the dashboard chart and pending orders list are visible
        await page.wait_for_selector("#sales-chart", state="visible")
        await page.wait_for_selector("#pending-orders-list tr", state="visible")
        await page.screenshot(path="verification/01_dashboard_load.png")
        print("Dashboard and pending payments loaded successfully.")

        # --- 2. Verify Orders Table Loading ---
        await page.click("a[data-tab='orders']")
        await page.wait_for_selector("#orders.tab-content.active", state="visible")
        await page.wait_for_selector("#orders-table-body tr", state="visible")
        await page.screenshot(path="verification/02_orders_table_load.png")
        print("Orders table loaded successfully.")

        # --- 3. Verify No Console Errors ---
        assert len(errors) == 0, f"Console errors found: {errors}"
        print("No console errors found.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
