
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

        # --- 2. Verify Orders Table is Not Empty ---
        await page.click("a[data-tab='orders']")
        await page.wait_for_selector("#orders.tab-content.active", state="visible")
        await page.wait_for_timeout(1000) # Wait for UI to update
        order_row_count = await page.locator("#orders-table-body tr").count()
        assert order_row_count > 0, "Orders table is empty!"
        await page.screenshot(path="verification/01_orders_table_not_empty.png")
        print("Orders table is not empty.")

        # --- 3. Verify New Order & Payment Workflow ---
        await page.click("#add-order-btn")
        await page.wait_for_selector("#order-modal", state="visible")

        # Select Partial and check for payment fields
        await page.select_option("#order-status", "Partial")
        await page.wait_for_selector("#payment-details-container:not(.hidden)", state="visible")
        print("Payment fields appear for Partial status.")

        # Fill out the order and payment details
        await page.fill("#order-customer-autocomplete", "Verification Customer")
        await page.wait_for_selector("#autocomplete-results div", state="visible")
        await page.click("#autocomplete-results div:visible")
        await page.select_option(".order-item-product", index=1)
        await page.fill("#order-amount-paid", "10")
        await page.fill("#order-reference", "REF123")
        await page.click("#order-form button[type='submit']")

        # Check that the new payment is in the payments table
        await page.click("a[data-tab='payments']")
        await page.wait_for_selector("#payments.tab-content.active", state="visible")
        await page.wait_for_timeout(1000)
        payment_row_count = await page.locator("#payments-table-body tr").count()
        assert payment_row_count > 0, "New payment was not created!"
        await page.screenshot(path="verification/02_new_payment_created.png")
        print("New payment was created successfully.")

        # --- 4. Verify New Payment Experience ---
        await page.click("#add-payment-btn")
        await page.wait_for_selector("#payment-modal", state="visible")

        # Check that the dropdown has the correct format
        option_text = await page.locator("#payment-order option:nth-child(2)").text_content()
        assert "Verification Customer" in option_text, "Payment dropdown format is incorrect!"
        print("New payment experience is working correctly.")

        await page.click("#payment-modal .close-btn")

        # --- 5. Verify Backup Button ---
        await page.click("a[data-tab='settings']")
        await page.wait_for_selector("#settings.tab-content.active", state="visible")

        async with page.expect_download() as download_info:
            await page.click("#backup-data-btn")

        download = await download_info.value
        assert download.suggested_filename.endswith(".xlsx"), "Backup button did not download an Excel file!"
        await page.screenshot(path="verification/03_backup_button.png")
        print("Backup button is functional.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
