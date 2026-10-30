import { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"], #email, input[name="email"]');
    this.passwordInput = page.locator('input[type="password"], #password, input[name="password"]');
    this.loginButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
  }

  /**
   * Navigates to the login page
   */
  async navigate() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Performs login operation with email and password
   */
  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.loginButton.click();
    await this.page.waitForURL('**/owner/**', { timeout: 20000 }).catch(() => {});
    await this.page.waitForTimeout(2500);
  }
}
