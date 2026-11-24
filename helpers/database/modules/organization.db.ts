import { findOrganizationByName } from '../db-queries';
import { check, checkBool, reportDb, DbCheck } from '../db-assertions';

/**
 * Verify, straight from the database, the organization the UI just created.
 * Looked up by unique name (the portal does not return an ID to the test).
 * Only fields the form submits are compared; empty form values are expected to be empty/NULL.
 */
export async function verifyOrganizationInDb(o: any, accumulated: any[] = []) {
  const rows = await findOrganizationByName(o.name);
  const row: any = rows[0];
  const checks: DbCheck[] = [];
  if (rows.length > 1) checks.push({ field: 'unique row', expected: 1, actual: rows.length, match: false });
  if (row) {
    checks.push(
      check('OrganizationName', o.name, row.OrganizationName),
      check('IsActive', 1, row.IsActive),
      check('address_line1', o.address.line1, row.address_line1),
      check('address_line2', o.address.line2, row.address_line2),
      check('city', o.address.city, row.City),
      check('pincode', o.address.pincode, row.pincode),
      check('state', o.address.expectedState ?? '', row.state, true),
      check('country', o.address.expectedCountry ?? '', row.country, true),
      check('registration_number', o.identity.registrationNumber, row.registration_number),
      check('gstin', o.identity.gstin, row.gstin),
      check('pan', o.identity.pan, row.pan),
      check('tan', o.identity.tan, row.tan),
      check('phone', o.contact.phone, row.phone),
      check('email', o.contact.email, row.email, true),
      check('website', o.contact.website, row.website),
      check('facebook_url', o.socialLinks.facebook, row.facebook_url),
      check('instagram_url', o.socialLinks.instagram, row.instagram_url),
      check('linkedin_url', o.socialLinks.linkedin, row.linkedin_url),
      check('youtube_url', o.socialLinks.youtube, row.youtube_url),
      check('currency_code', o.billing.currencyCode, row.currency_code),
      checkBool('enable_admin', !!o.applicationAccess.admin, row.enable_admin),
      checkBool('enable_opd_billing', !!o.applicationAccess.opdBilling, row.enable_opd_billing),
      checkBool('enable_pharmacy', !!o.applicationAccess.pharmacy, row.enable_pharmacy),
      checkBool('enable_ipd', !!o.applicationAccess.ipd, row.enable_ipd),
    );
  }
  const idInDb = row?.openMRSLocID ?? null;
  // rewritten after every organization so a failure still leaves the details on disk
  accumulated.push({ label: `organization "${o.name}"`, found: !!row, row, checks });
  reportDb('db-organization.json', { module: 'organization', table: 'organizationmaster' }, accumulated);
  return { id: idInDb as number | null };
}
