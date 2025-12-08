import asyncio
from playwright.async_api import async_playwright, expect
import time

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto("http://localhost:3000")

            # Create a unique user for this test run
            email = f"testuser_{int(time.time())}@example.com"
            password = "password123"

            # Register
            await page.locator("#register-link").click()
            await page.locator("#register-email").fill(email)
            await page.locator("#register-password").fill(password)
            await page.locator("#register-form button[type='submit']").click()

            # Wait for app to load after registration/login
            await expect(page.locator("#app-container")).to_be_visible(timeout=10000)
            await expect(page.locator("body")).to_have_attribute("data-ready", "true", timeout=15000)

            # Create Products
            products_to_create = [
                {"name": "Laptop", "price": "1200.50", "cost": "800"},
                {"name": "Mouse", "price": "25.00", "cost": "10"},
                {"name": "Keyboard", "price": "75.75", "cost": "30"},
                {"name": "Monitor", "price": "300.00", "cost": "150"},
            ]

            await page.locator('a.nav-link[data-tab="products"]').click()
            await expect(page.locator("#products-section")).to_be_visible()

            for prod in products_to_create:
                await page.locator("#add-product-btn").click()
                await expect(page.locator("#product-modal")).to_be_visible()
                await page.locator("#product-description").fill(prod["name"])
                await page.locator("#product-cost").fill(prod["cost"])
                await page.locator("#product-price").fill(prod["price"])
                await page.locator("#product-wholesale-price").fill(prod["price"]) # same for simplicity
                await page.locator("#save-product-btn").click()
                await expect(page.locator("#product-modal")).to_be_hidden()

            # Create Customers
            customers_to_create = [
                {"name": "Alice Smith", "phone": "111222333"},
                {"name": "Bob Johnson", "phone": "444555666"},
            ]

            await page.locator('a.nav-link[data-tab="customers"]').click()
            await expect(page.locator("#customers-section")).to_be_visible()

            for cust in customers_to_create:
                await page.locator("#add-customer-btn").click()
                await expect(page.locator("#customer-modal")).to_be_visible()
                await page.locator("#customer-name").fill(cust["name"])
                await page.locator("#customer-phone").fill(cust["phone"])
                await page.locator("#save-customer-btn").click()
                await expect(page.locator("#customer-modal")).to_be_hidden()

            # Create Orders to populate charts
            await page.locator('a.nav-link[data-tab="orders"]').click()
            await expect(page.locator("#orders-section")).to_be_visible()

            # Order 1 (Large)
            await page.locator("#add-order-btn").click()
            await expect(page.locator("#order-modal")).to_be_visible()
            await page.get_by_label("Cliente").fill("Alice")
            await page.get_by_text("Alice Smith").click()
            await page.get_by_label("Producto").select_option(label="Laptop")
            await page.locator('select[name="priceType"]').select_option(label="Minorista")
            await page.locator('input[name="quantity"]').fill("2")
            await page.locator("#add-order-item-btn").click()
            await page.locator("#save-order-btn").click()
            await expect(page.locator("#order-modal")).to_be_hidden()

            # Order 2 (Small)
            await page.locator("#add-order-btn").click()
            await expect(page.locator("#order-modal")).to_be_visible()
            await page.get_by_label("Cliente").fill("Alice")
            await page.get_by_text("Alice Smith").click()
            await page.get_by_label("Producto").select_option(label="Mouse")
            await page.locator('select[name="priceType"]').select_option(label="Minorista")
            await page.locator('input[name="quantity"]').fill("1")
            await page.locator("#add-order-item-btn").click()
            await page.locator("#save-order-btn").click()
            await expect(page.locator("#order-modal")).to_be_hidden()

            # Order 3 (Medium)
            await page.locator("#add-order-btn").click()
            await expect(page.locator("#order-modal")).to_be_visible()
            await page.get_by_label("Cliente").fill("Bob")
            await page.get_by_text("Bob Johnson").click()
            await page.get_by_label("Producto").select_option(label="Monitor")
            await page.locator('select[name="priceType"]').select_option(label="Minorista")
            await page.locator('input[name="quantity"]').fill("3")
            await page.locator("#add-order-item-btn").click()
            await page.locator("#save-order-btn").click()
            await expect(page.locator("#order-modal")).to_be_hidden()

            # Navigate back to dashboard and take screenshot
            await page.locator('a.nav-link[data-tab="dashboard"]').click()
            await expect(page.locator("#dashboard-section")).to_be_visible()

            # Wait for charts to render
            await expect(page.locator("#product-sales-chart")).to_be_visible(timeout=10000)
            await expect(page.locator("#customer-ranking-chart")).to_be_visible(timeout=10000)

            # Give charts time to animate
            await page.wait_for_timeout(2000)

            await page.screenshot(path="verification/dashboard_changes.png")
            print("Screenshot saved to verification/dashboard_changes.png")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="verification/error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())