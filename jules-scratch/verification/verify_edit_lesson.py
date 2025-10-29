from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # 1. Login
    page.goto("http://localhost:5173/login")
    page.fill('input[name="email"]', "admin@igreja.com")
    page.fill('input[name="senha"]', "admin123")
    page.click('button[type="submit"]')
    page.wait_for_url("http://localhost:5173/admin/dashboard")

    # 2. Navigate to course details page
    page.goto("http://localhost:5173/admin/courses")
    page.click('[data-testid="button-manage-course-1"]')
    page.wait_for_url("http://localhost:5173/admin/course-details/1")

    # 3. Open the lesson form
    page.click('text="Adicionar Aula"')

    # 4. Wait for the form to be visible and take screenshot
    page.wait_for_selector('text="Preencha as informações da aula e as perguntas do quiz."')
    page.screenshot(path="jules-scratch/verification/admin-edit-lesson.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
