import { Page } from '@playwright/test';
import { route } from './routes';

/**
 * Credentials come ONLY from .env - no defaults in code.
 * The portal redirects to a separate sign-in page (Keycloak) and back, so wait for the return.
 */
export async function login(page: Page) {
  const user = process.env.ADMIN_USERNAME!;
  const pass = process.env.ADMIN_PASSWORD!;
  const portal = new URL(process.env.BASE_URL!).origin;
  await page.goto(route('login'));
  await page.getByLabel(/email|username|user name/i).first().fill(user);
  await page.getByLabel(/password/i).first().fill(pass);
  await page.getByRole('button', { name: /log ?in|sign ?in/i }).first().click();
  // done only when we are back on the portal itself (not on the sign-in page, not mid-redirect)
  await page.waitForURL(u => u.origin === portal && !/\/(login|sso-callback)/i.test(u.pathname), { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
}
