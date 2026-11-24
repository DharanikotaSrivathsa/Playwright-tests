import { findOrganizationByName, findFacilitiesByName, facilitySpecialities } from '../db-queries';
import { check, checkSet, reportDb, DbCheck } from '../db-assertions';

/**
 * Verify, straight from the database, one facility the UI just created.
 * Called once per facility; each call adds its record to output/RUN_<id>/db-facility.json (see `accumulated`).
 */
export async function verifyFacilityInDb(f: any, orgName: string, accumulated: any[]) {
  const label = `facility "${f.name}"`;
  const orgs: any[] = await findOrganizationByName(orgName);
  const rows: any[] = await findFacilitiesByName(f.name);
  const row = rows[0];
  const checks: DbCheck[] = [];
  if (rows.length !== 1) checks.push({ field: 'unique row', expected: 1, actual: rows.length, match: false });
  if (row) {
    const saved = (await facilitySpecialities(row.FacilityID)).map((r: any) => r.SpecialityName as string);
    checks.push(
      check('FacilityName', f.name, row.FacilityName),
      check('OrganizationID (parent org openMRSLocID)', orgs[0]?.openMRSLocID ?? 'org not found', row.OrganizationID),
      check('FacilityType', f.type, row.FacilityType, true),
      check('ContactEmail', f.email, row.ContactEmail, true),
      check('ContactPhone', f.phone, row.ContactPhone),
      check('RegistrationFee', Number(f.registrationFee ?? 0).toFixed(2), row.RegistrationFee),
      check('address_line1', f.addressLine1, row.address_line1),
      check('address_line2', f.addressLine2, row.address_line2),
      check('gstin', f.gstin, row.gstin),
      check('pan', f.pan, row.pan),
      check('tan', f.tan, row.tan),
      check('registration_number', f.registrationNumber, row.registration_number),
      check('IsActive', 'A', row.IsActive),
      checkSet('specialities', f.specialities, saved),
    );
  }
  accumulated.push({ label, found: !!row, row: row ? { ...row } : undefined, checks });
  // rewritten after every facility so a failure still leaves the details on disk
  reportDb('db-facility.json', { module: 'facility', tables: ['facilitymaster', 'facility_speciality_mapping', 'specialitymaster'], organizationName: orgName }, accumulated);
  return { id: row?.FacilityID as number | null };
}
