
import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.set_viewport_size({"width": 1280, "height": 800})
        await page.goto("http://localhost:8000")

        # --- 1. Verify Login ---
        await page.wait_for_selector("#login-form", state="visible")
        await page.fill("#login-email", "test@example.com")
        await page.fill("#login-password", "password123")
        await page.click("button[type='submit']")

        try:
            await page.wait_for_selector("body[data-ready='true']", state="attached", timeout=5000)
            print("Login successful!")
        except:
            print("Login failed!")
            os.makedirs("verification", exist_ok=True)
            await page.screenshot(path="verification/login_failed.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
