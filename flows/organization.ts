import { Page, expect } from '@playwright/test';
import { fillText, setCheckbox, uploadFile, clickButton, expectSuccessToast, findRowInList, submitAndGetId, field } from '../helpers/ui';
import { route } from '../helpers/routes';

const ACCESS: Record<string, string> = { admin: 'Admin', opdBilling: 'OPD Billing', pharmacy: 'Pharmacy', ipd: 'IPD' };

export async function openOrgForm(page: Page) {
  await page.goto(route('orgCreate'));
  await expect(field(page, 'Organization Name')).toBeVisible();
}

export async function fillOrganization(page: Page, o: any) {
  await fillText(page, 'Organization Name', o.name);
  await fillText(page, 'GSTIN', o.identity.gstin);
  await fillText(page, 'PAN', o.identity.pan);
  await fillText(page, 'TAN', o.identity.tan);
  await fillText(page, 'Registration Number', o.identity.registrationNumber);
  await uploadFile(page, 'Organization Logo', o.identity.logo);

  await fillText(page, 'Address Line 1', o.address.line1);
  await fillText(page, 'Address Line 2', o.address.line2);
  await fillText(page, 'Pincode', o.address.pincode);
  // pincode lookup fills State (disabled field) - wait for it, then verify
  if (o.address.expectedState) {
    await expect(field(page, 'State')).toHaveValue(new RegExp(o.address.expectedState, 'i'));
  }
  if (o.address.expectedCountry) {
    await expect(field(page, 'Country')).toHaveValue(new RegExp(o.address.expectedCountry, 'i'));
  }
  await fillText(page, 'City', o.address.city);

  await fillText(page, 'Phone', o.contact.phone);
  await fillText(page, 'Email', o.contact.email);
  await fillText(page, 'Website', o.contact.website);
  for (const [k, label] of [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube']])
    await fillText(page, label, o.socialLinks[k]);

  const cur = field(page, 'Currency Code');
  await cur.fill(o.billing.currencyCode);

  for (const [key, label] of Object.entries(ACCESS)) await setCheckbox(page, label, !!o.applicationAccess[key]);
}

/** Create, then confirm in the listing. The ID comes from the create response when the portal returns one. */
export async function createOrganization(page: Page, o: any) {
  await openOrgForm(page);
  await fillOrganization(page, o);
  const id = await submitAndGetId(page, /create organization/i, /organi[sz]ation/i);
  await expectSuccessToast(page);

  await page.goto(route('orgList'));
  await findRowInList(page, o.name);
  return { id, name: o.name };
}

/**
 * Re-open the saved organization (list -> edit icon) and confirm Application Access was stored exactly.
 * The portal's edit page has no ID in its URL, so the organization is found by name.
 */
export async function verifyApplicationAccess(page: Page, orgName: string, expected: Record<string, boolean>) {
  await page.goto(route('orgList'));
  const row = await findRowInList(page, orgName);
  await row.getByRole('button').nth(1).click();           // icons: 1st = view, 2nd = edit
  await expect(page).toHaveURL(/organizations\/edit/i);
  await expect(field(page, 'Organization Name')).toHaveValue(orgName);
  const actual: Record<string, boolean> = {};
  for (const [key, label] of Object.entries(ACCESS)) {
    const box = page.getByLabel(new RegExp(`^\\s*${label}\\s*$`, 'i')).first();
    await expect(box).toBeVisible();
    actual[key] = await box.isChecked();
    expect(actual[key], `Application Access "${label}" saved value`).toBe(!!expected[key]);
  }
  return actual;
}

/** Negative case: submit with one required field empty. Returns after confirming a validation message. */
export async function submitWithMissing(page: Page, o: any, missingLabel: string) {
  await openOrgForm(page);
  await fillOrganization(page, o);
  const f = field(page, missingLabel);
  await f.fill('');
  await clickButton(page, /create organization/i);
  await expect(page.getByText(/required|cannot be empty|must not be empty|please enter/i).first()).toBeVisible();
}
