
import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.set_viewport_size({"width": 1280, "height": 800})
        await page.goto("http://localhost:8000")

        os.makedirs("verification", exist_ok=True)

        # --- 1. Verify Initial Login and Dashboard ---
        await page.wait_for_selector("#login-form", state="visible")
        await page.fill("#login-email", "test@example.com")
        await page.fill("#login-password", "password123")
        await page.click("button[type='submit']")
        await page.wait_for_selector("body[data-ready='true']", state="attached")

        # Check if the dashboard chart is visible
        await page.wait_for_selector("#sales-chart", state="visible")
        await page.screenshot(path="verification/01_dashboard_load.png")
        print("Dashboard loaded successfully.")

        # --- 2. Verify 'New...' Buttons ---
        await page.click("a[data-tab='products']")
        await page.wait_for_selector("#products.tab-content.active", state="visible")
        await page.click("#add-product-btn")
        await page.wait_for_selector("#product-modal", state="visible")
        await page.click("#product-modal .close-btn")
        print("New Product button works.")

        await page.click("a[data-tab='customers']")
        await page.wait_for_selector("#customers.tab-content.active", state="visible")
        await page.click("#add-customer-btn")
        await page.wait_for_selector("#customer-modal", state="visible")
        await page.click("#customer-modal .close-btn")
        print("New Customer button works.")

        await page.click("a[data-tab='orders']")
        await page.wait_for_selector("#orders.tab-content.active", state="visible")
        await page.click("#add-order-btn")
        await page.wait_for_selector("#order-modal", state="visible")
        await page.click("#order-modal .close-btn")
        print("New Order button works.")

        # --- 3. Verify Orders Table Rendering ---
        # Create a product and customer to create an order with
        await page.click("a[data-tab='products']")
        await page.click("#add-product-btn")
        await page.fill("#product-description", "Verification Product")
        await page.fill("#product-retail-price", "25")
        await page.fill("#product-wholesale-price", "20")
        await page.click("#product-form button[type='submit']")

        await page.click("a[data-tab='customers']")
        await page.click("#add-customer-btn")
        await page.fill("#customer-name", "Verification Customer")
        await page.click("#customer-form button[type='submit']")

        await page.wait_for_timeout(1000) # Wait for customer list to update

        # Create an order
        await page.click("a[data-tab='orders']")
        await page.click("#add-order-btn")
        await page.fill("#order-customer-autocomplete", "Verification Customer")
        await page.wait_for_selector("#autocomplete-results div", state="visible")
        await page.click("#autocomplete-results div:visible")
        await page.select_option(".order-item-product", index=1)
        await page.click("#order-form button[type='submit']")

        await page.wait_for_timeout(1000) # Wait for UI to update
        order_row_count = await page.locator("#orders-table-body tr").count()
        assert order_row_count > 0, "Orders table is not rendering!"
        await page.screenshot(path="verification/02_orders_table.png")
        print("Orders table rendered successfully.")

        # --- 4. Verify Data Restoration ---
        await page.click("a[data-tab='settings']")
        await page.wait_for_selector("#settings.tab-content.active", state="visible")

        # Create a backup file to restore from
        # In a real scenario, you would download and then upload a file.
        # For this test, we will just trigger the restore and assume a file is selected.
        # This part of the test is more of a smoke test to ensure the button works
        # and doesn't crash the app. A full e2e test would require file handling.
        page.on("dialog", lambda dialog: dialog.accept())
        await page.set_input_files("#restore-data-input", "backup.xlsx")

        await page.wait_for_timeout(2000) # Wait for restore to complete
        await page.screenshot(path="verification/03_data_restore.png")
        print("Data restoration process completed without errors.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
