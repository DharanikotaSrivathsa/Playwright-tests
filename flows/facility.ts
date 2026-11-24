import { Page, expect } from '@playwright/test';
import { fillText, selectOption, expectSuccessToast, findRowInList, submitAndGetId, switchOrganization, field } from '../helpers/ui';
import { route } from '../helpers/routes';

/** Fill the create-facility form (does not submit). */
export async function fillFacility(page: Page, f: any, orgName: string) {
  await page.goto(route('facilityCreate'));
  await expect(field(page, 'Facility Name')).toBeVisible();

  await selectOption(page, 'Organization', orgName);
  await fillText(page, 'Facility Name', f.name);
  await selectOption(page, 'Facility Type', f.type);
  await fillText(page, 'Contact Email', f.email);
  await fillText(page, 'Contact Phone', f.phone);
  await fillText(page, 'Registration Fee', f.registrationFee);
  await fillText(page, 'Facility Head User ID', f.facilityHeadUserId);
  await fillText(page, 'Address Line 1', f.addressLine1);
  await fillText(page, 'Address Line 2', f.addressLine2);
  await fillText(page, 'GSTIN', f.gstin);
  await fillText(page, 'PAN', f.pan);
  await fillText(page, 'TAN', f.tan);
  await fillText(page, 'Registration Number', f.registrationNumber);
  await fillText(page, 'Default Visit Location', f.defaultVisitLocation);

  // Speciality Mapping is a multi-select dropdown under its own heading (no <label>).
  const card = page.locator('h3').filter({ hasText: /Speciality Mapping/i }).locator('xpath=../..');
  const dropdown = card.getByRole('combobox');
  for (const s of f.specialities) {
    const opt = page.getByRole('option', { name: s, exact: true }).first();
    if (!(await opt.isVisible().catch(() => false))) await dropdown.click();
    await expect(opt, `Speciality "${s}" must exist in the portal`).toBeVisible();
    await opt.click();
  }
  await page.keyboard.press('Escape');
}

export async function createFacility(page: Page, f: any, orgName: string) {
  await fillFacility(page, f, orgName);
  const id = await submitAndGetId(page, /create facility/i, /facilit/i);
  await expectSuccessToast(page);

  // the list only shows the organization selected in the top bar
  await page.goto(route('facilityList'));
  await switchOrganization(page, orgName);
  await findRowInList(page, f.name);
  return { id, name: f.name };
}
