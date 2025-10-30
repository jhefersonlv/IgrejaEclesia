
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Admin verification
        await page.goto("http://localhost:3000/login")
        await page.get_by_label("Email").fill("admin@igreja.com")
        await page.get_by_label("Senha").fill("admin123")
        await page.get_by_role("button", name="Entrar").click()
        await page.wait_for_url("http://localhost:3000/admin/dashboard")
        await page.goto("http://localhost:3000/admin/members")
        await expect(page.get_by_text("Gerenciar Membros")).to_be_visible()
        await page.screenshot(path="jules-scratch/verification/admin-members.png")

        # Member verification
        await page.goto("http://localhost:3000/login")
        await page.get_by_label("Email").fill("joao@email.com")
        await page.get_by_label("Senha").fill("membro123")
        await page.get_by_role("button", name="Entrar").click()
        await page.wait_for_url("http://localhost:3000/membro/dashboard")
        await page.goto("http://localhost:3000/membro/perfil")
        await expect(page.get_by_text("Meu Perfil")).to_be_visible()
        await page.screenshot(path="jules-scratch/verification/member-profile.png")

        await browser.close()

async def run_with_retry():
    for i in range(3):
        try:
            await main()
            return
        except Exception as e:
            print(f"Attempt {i+1} failed with error: {e}")
            await asyncio.sleep(10)

asyncio.run(run_with_retry())
