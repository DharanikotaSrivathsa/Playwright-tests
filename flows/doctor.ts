import { Page, expect } from '@playwright/test';
import { fillText, selectOption, uploadFile, clickButton, expectSuccessToast, findRowInList, submitAndGetId, switchOrganization, pickOption, field } from '../helpers/ui';
import { route } from '../helpers/routes';

/** 1980-05-14 -> 14/05/1980 (the portal's date format) */
function toPortalDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Fill the create-doctor form (does not submit).
 * facilityNames: facilityKey -> real facility name created earlier in this/previous run.
 * Facility dropdown and lists show only the organization selected in the top bar, so switch to orgName first.
 */
export async function fillDoctor(page: Page, d: any, facilityNames: Record<string, string>, orgName: string) {
  await page.goto(route('doctorList'));
  await switchOrganization(page, orgName);
  await page.goto(route('doctorCreate'));
  await expect(field(page, 'First Name')).toBeVisible();

  // Card 1: Basic Details
  await fillText(page, 'First Name', d.firstName);
  await fillText(page, 'Last Name', d.lastName);
  await selectOption(page, 'Gender', d.gender);

  const dob = field(page, 'Date of Birth');          // masked input DD/MM/YYYY
  const want = toPortalDate(d.dateOfBirth);
  await dob.fill(want);
  if ((await dob.inputValue()) !== want) {
    await dob.fill('');
    await dob.pressSequentially(want.replace(/\D/g, ''));
  }
  await expect(dob).toHaveValue(want);

  await selectOption(page, 'Speciality', d.speciality);
  await selectOption(page, 'Consultation Mode', d.consultationMode);
  await fillText(page, 'Display Name', d.displayName);
  await fillText(page, 'Email', d.email);
  await fillText(page, 'Phone Number', d.phone);
  await fillText(page, 'Description', d.description);
  if (d.anaesthesiaEnabled) await field(page, 'Anaesthesia').click();

  // Card 2: Registration Details
  await fillText(page, 'Registration Number', d.registrationNumber);
  await selectOption(page, 'Registration Council', d.registrationCouncil);
  await fillText(page, 'Registration Year', d.registrationYear);
  await uploadFile(page, 'Doctor Signature', d.signature);
  await uploadFile(page, 'Registration Documents', d.registrationDocument);

  // Portal Login: username is the email (filled by the portal); a password is required
  await fillText(page, 'Password', d.portalPassword);

  // Card 3: Qualifications - the first row only appears after "Add Qualification"
  await clickButton(page, /add qualification/i);
  await fillText(page, 'Degree Name', d.qualification.degree);
  await fillText(page, 'Institution', d.qualification.institution);
  await fillText(page, 'Year of Passing', d.qualification.yearOfPassing);
  await fillText(page, 'Certificate URL', d.qualification.certificateUrl);

  // Card 4: Facility Assignment - pick a facility, then its row in the table gets OPD / IPD / Tele fees.
  // The first facility added is automatically the Primary one.
  for (const a of d.facilityAssignments) {
    const name = facilityNames[a.facilityKey];
    if (!name) throw new Error(`No created facility found for key "${a.facilityKey}"`);
    await page.getByRole('combobox').last().click();
    await pickOption(page, name);
    const done = page.getByRole('button', { name: /^done$/i });   // the facility picker is a multi-select
    if (await done.isVisible().catch(() => false)) await done.click(); else await page.keyboard.press('Escape');
    const row = page.getByRole('row').filter({ hasText: name }).first();
    await expect(row, `facility "${name}" should appear in the assignment table`).toBeVisible();
    const fees = row.locator('input[type=number]');
    await fees.nth(0).fill(String(a.opdFee));
    await fees.nth(1).fill(String(a.ipdFee));
    await fees.nth(2).fill(String(a.teleFee));
  }
}

export async function createDoctor(page: Page, d: any, facilityNames: Record<string, string>, orgName: string) {
  await fillDoctor(page, d, facilityNames, orgName);
  const id = await submitAndGetId(page, /create doctor/i, /doctor/i);
  await expectSuccessToast(page);

  // the list's search box and rows use names (not emails): search by last name, match the row on first + last name
  await page.goto(route('doctorList'));
  await switchOrganization(page, orgName);
  await findRowInList(page, d.lastName, new RegExp(`${d.firstName}.*${d.lastName}`, 'i'));
  return { id, email: d.email, name: `${d.firstName} ${d.lastName}` };
}
