
import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.set_viewport_size({"width": 1280, "height": 800})
        await page.goto("http://localhost:8000")

        # --- Authentication ---
        await page.wait_for_selector("#login-form", state="visible")
        await page.fill("#login-email", "test@example.com")
        await page.fill("#login-password", "password123")
        await page.click("button[type='submit']")
        await page.wait_for_selector("body[data-ready='true']", state="attached")

        os.makedirs("verification", exist_ok=True)

        # --- 1. Verify Product Creation ---
        await page.click("a[data-tab='products']")
        await page.wait_for_selector("#products.tab-content.active", state="visible")
        initial_product_count = await page.locator("#products-table-body tr").count()

        await page.click("#add-product-btn")
        await page.wait_for_selector("#product-modal", state="visible")
        await page.fill("#product-description", "Test Product")
        await page.fill("#product-retail-price", "10")
        await page.fill("#product-wholesale-price", "8")
        await page.click("#product-form button[type='submit']")

        await page.wait_for_timeout(1000) # Wait for UI to update
        new_product_count = await page.locator("#products-table-body tr").count()

        print(f"Initial product count: {initial_product_count}")
        print(f"New product count: {new_product_count}")
        assert new_product_count == initial_product_count + 1, "Product was created multiple times!"
        await page.screenshot(path="verification/01_product_creation.png")

        # --- 2. Verify Customer Creation ---
        await page.click("a[data-tab='customers']")
        await page.wait_for_selector("#customers.tab-content.active", state="visible")
        initial_customer_count = await page.locator("#customers-table-body tr").count()

        await page.click("#add-customer-btn")
        await page.wait_for_selector("#customer-modal", state="visible")
        await page.fill("#customer-name", "Test Customer")
        await page.fill("#customer-phone", "1234567890")
        await page.click("#customer-form button[type='submit']")

        await page.wait_for_timeout(1000)
        new_customer_count = await page.locator("#customers-table-body tr").count()

        print(f"Initial customer count: {initial_customer_count}")
        print(f"New customer count: {new_customer_count}")
        assert new_customer_count == initial_customer_count + 1, "Customer was created multiple times!"
        await page.screenshot(path="verification/02_customer_creation.png")

        # --- 3. Verify Order Creation ---
        await page.click("a[data-tab='orders']")
        await page.wait_for_selector("#orders.tab-content.active", state="visible")
        initial_order_count = await page.locator("#orders-table-body tr").count()

        await page.click("#add-order-btn")
        await page.wait_for_selector("#order-modal", state="visible")
        await page.fill("#order-customer-autocomplete", "Test Customer")
        await page.wait_for_selector("#autocomplete-results div", state="visible") # Wait for results to appear
        await page.click("#autocomplete-results div:visible") # Click the visible result

        await page.select_option(".order-item-product", index=1)
        await page.fill(".order-item-quantity", "2")
        await page.click("#order-form button[type='submit']")

        await page.wait_for_timeout(1000)
        new_order_count = await page.locator("#orders-table-body tr").count()

        print(f"Initial order count: {initial_order_count}")
        print(f"New order count: {new_order_count}")
        assert new_order_count == initial_order_count + 1, "Order was created multiple times!"
        await page.screenshot(path="verification/03_order_creation.png")

        # --- 4. Verify Payment Creation ---
        await page.click("a[data-tab='payments']")
        await page.wait_for_selector("#payments.tab-content.active", state="visible")
        initial_payment_count = await page.locator("#payments-table-body tr").count()

        await page.click("#add-payment-btn")
        await page.wait_for_selector("#payment-modal", state="visible")
        await page.select_option("#payment-order", index=1)
        await page.fill("#payment-amount", "10")
        await page.click("#payment-form button[type='submit']")

        await page.wait_for_timeout(1000)
        new_payment_count = await page.locator("#payments-table-body tr").count()

        print(f"Initial payment count: {initial_payment_count}")
        print(f"New payment count: {new_payment_count}")
        assert new_payment_count == initial_payment_count + 1, "Payment was created multiple times!"
        await page.screenshot(path="verification/04_payment_creation.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
