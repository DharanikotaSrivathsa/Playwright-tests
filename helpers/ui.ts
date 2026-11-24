import { Page, Locator, expect } from '@playwright/test';
import path from 'path';
import { ROOT } from './run-context';

/**
 * Reusable UI actions. Fields are found by their visible LABEL (taken from the real portal).
 * If a label differs on your screen, fix it here or in the flow - only one place.
 */

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Matches a label's text, ignoring the "*" on required fields and any hint text after it. */
function labelRe(label: string) { return new RegExp(`^\\s*${escapeRe(label)}\\s*\\*?`, 'i'); }

/**
 * Finds the control for a label. The portal's labels are not always linked to their control
 * (dropdowns, some text inputs), so fall back to "the control next to the <label>".
 */
export function field(page: Page, label: string): Locator {
  const re = labelRe(label);
  const byLabel = page.getByLabel(re);
  const nextToLabel = page.locator('label').filter({ hasText: re })
    .locator(`xpath=../*[self::input or self::textarea or self::select or self::button[@role='combobox' or @role='switch']][1] | ../div/input[1]`);
  return byLabel.or(nextToLabel).first();
}

export async function fillText(page: Page, label: string, value?: string | number | null) {
  if (value === undefined || value === null || value === '') return;
  await field(page, label).fill(String(value));
}

/** Clicks an option of an open dropdown: exact text first, then "contains". */
export async function pickOption(page: Page, text: string) {
  await page.getByRole('option').first().waitFor();
  const exact = page.getByRole('option', { name: text, exact: true });
  const opt = (await exact.count()) ? exact.first() : page.getByRole('option', { name: new RegExp(escapeRe(text), 'i') }).first();
  await opt.click();
}

/** Works for a native <select> and for the portal's custom dropdowns (click, then pick the option). */
export async function selectOption(page: Page, label: string, optionText: string) {
  const f = field(page, label);
  const tag = await f.evaluate(el => el.tagName.toLowerCase());
  if (tag === 'select') {
    await f.selectOption({ label: optionText });
    return;
  }
  await f.click();
  if (tag === 'input') await f.fill(optionText);
  await pickOption(page, optionText);
}

export async function setCheckbox(page: Page, label: string, on: boolean) {
  const box = page.getByLabel(new RegExp(`^\\s*${escapeRe(label)}\\s*$`, 'i')).first();
  await box.setChecked(on);
  await expect(box).toBeChecked({ checked: on });
}

/** Upload into the file input that sits next to the label (falls back to the page's first file input). */
export async function uploadFile(page: Page, label: string, relPath?: string) {
  if (!relPath) return;
  const near = page.locator('label').filter({ hasText: labelRe(label) }).locator(`xpath=..//input[@type='file']`).first();
  const input = (await near.count()) ? near : page.locator('input[type=file]').first();
  await input.setInputFiles(path.resolve(ROOT, relPath));
}

export function clickButton(page: Page, name: RegExp | string) {
  return page.getByRole('button', { name }).first().click();
}

/**
 * Click the submit button and, best effort, read the new record's ID from the create request's
 * response. The portal's lists have no ID in their links, so this is the only place an ID can come from.
 * Returns null when the response has no recognisable ID (that is fine - it is informational).
 */
export async function submitAndGetId(page: Page, button: RegExp, urlHint: RegExp): Promise<string | null> {
  const pending = page
    .waitForResponse(r => r.request().method() === 'POST' && urlHint.test(r.url()) && r.ok(), { timeout: 20_000 })
    .catch(() => null);
  await clickButton(page, button);
  const resp = await pending;
  if (!resp) return null;
  try {
    const j = await resp.json();
    const id = j?.id ?? j?.data?.id ?? j?.data?.[0]?.id;
    return id !== undefined && id !== null ? String(id) : null;
  } catch {
    return null;
  }
}

/** After saving: a success message appears OR the portal leaves the "create" page. */
export async function expectSuccessToast(page: Page) {
  const toast = page.getByText(/success|created|saved|added/i).first();
  await expect(async () => {
    const left = !/\/create/i.test(page.url());
    const seen = await toast.isVisible().catch(() => false);
    expect(left || seen, 'expected a success message, or the portal to leave the create page').toBeTruthy();
  }).toPass({ timeout: 20_000 });
}

/**
 * The top bar has an organization switcher. Facility and doctor lists/dropdowns only show the
 * selected organization, so switch it to the one this run created. Call on a facility/doctor page.
 */
export async function switchOrganization(page: Page, orgName: string) {
  const sw = page.getByRole('combobox').first();
  await sw.waitFor();
  if ((await sw.innerText()).trim() === orgName) return;
  await sw.click();
  await pickOption(page, orgName);
  await page.waitForLoadState('networkidle');
  await expect(sw).toContainText(orgName);
}

/** Search the listing and return the matching row (throws if missing). rowText defaults to the search text. */
export async function findRowInList(page: Page, text: string, rowText: string | RegExp = text): Promise<Locator> {
  const search = page.getByPlaceholder(/search/i).first();
  if (await search.count()) await search.fill(text);
  const row = page.getByRole('row').filter({ hasText: rowText }).first();
  await expect(row, `"${rowText}" should appear in the listing`).toBeVisible();
  return row;
}
