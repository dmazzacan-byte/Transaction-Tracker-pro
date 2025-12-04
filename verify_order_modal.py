
import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Set a specific viewport size for consistency
        await page.set_viewport_size({"width": 1280, "height": 800})

        # Serve the app from a local server
        # This requires running `python -m http.server 8000` in the repo root
        await page.goto("http://localhost:8000")

        # --- Authentication ---
        # Wait for the login form to be visible
        await page.wait_for_selector("#login-form", state="visible")

        # Use a dummy email and password for testing
        await page.fill("#login-email", "test@example.com")
        await page.fill("#login-password", "password123")
        await page.click("button[type='submit']")

        # Wait for the main app container to be visible after login
        await page.wait_for_selector("#app-container", state="visible")

        # Create verification directory if it doesn't exist
        os.makedirs("verification", exist_ok=True)

        # --- 1. Verify Advanced Filters ---
        # Navigate to the Orders tab
        await page.click("a[data-tab='orders']")
        # Wait for the orders tab content to be visible
        await page.wait_for_selector("#orders.tab-content.active", state="visible")

        # Take a screenshot to show the new filters
        await page.screenshot(path="verification/01_advanced_filters.png")
        print("Screenshot 1: Advanced filters in Orders tab captured.")

        # --- 2. Verify Enhanced Order Modal ---
        # Click the 'New Order' button
        await page.click("#add-order-btn")

        # Wait for the modal to appear
        await page.wait_for_selector("#order-modal", state="visible")

        # Add a second item to the order to test the multi-item functionality
        await page.click("#add-order-item-btn")

        # Take a screenshot of the modal
        await page.screenshot(path="verification/02_enhanced_order_modal.png")
        print("Screenshot 2: Enhanced 'New Order' modal with multiple items captured.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
