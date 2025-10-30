import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Add a delay to wait for the server to start
    time.sleep(30)

    # Navigate to the login page
    page.goto("http://localhost:5173/login")

    # Fill in the login form
    page.fill("input[name='email']", "admin@igreja.com")
    page.fill("input[name='senha']", "admin123")

    # Click the login button
    page.click("button[type='submit']")

    # Wait for navigation to the dashboard
    page.wait_for_url("http://localhost:5173/admin/dashboard")

    # Navigate to the courses page
    page.goto("http://localhost:5173/admin/courses")

    # Click the "Edit" button on the first course
    page.click("button:has-text('Edit')")

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/edit-course-dialog.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
