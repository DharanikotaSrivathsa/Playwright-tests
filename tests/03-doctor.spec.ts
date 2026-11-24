import { test, expect } from '@playwright/test';
import { login } from '../helpers/login';
import { loadResolved } from '../helpers/data-loader';
import { writeOutput, readPrerequisite } from '../helpers/output';
import { addVerified } from '../helpers/master-data';
import { createDoctor } from '../flows/doctor';
import { verifyDoctorInDb } from '../helpers/database/modules/doctor.db';
import { closePool } from '../helpers/database/db-connection';
import { route } from '../helpers/routes';
import { findRowInList, switchOrganization } from '../helpers/ui';

const data = loadResolved();
const doctors = data.doctors ?? [];

test.describe.configure({ mode: 'serial' });
test.skip(doctors.length === 0, 'no doctors enabled in test-data.json');
test.afterAll(async () => { await closePool(); });

test('TC004 - Create doctors and map them to facilities', async ({ page }) => {
  const facOut = readPrerequisite('facility-output.json', 'successfully created facilities');
  const facilityNames: Record<string, string> = {};
  const facilityOrg: Record<string, string> = {};
  for (const f of facOut.facilities) { facilityNames[f.key] = f.name; facilityOrg[f.key] = f.organizationName ?? facOut.organizationName; }

  const base = { executionId: process.env.RUN_ID, timestamp: new Date().toISOString() };
  const created: any[] = [];
  const dbRecords: any[] = [];
  try {
    await login(page);
    for (const d of doctors) {
      const primary = d.facilityAssignments.find((a: any) => a.primary) ?? d.facilityAssignments[0];
      const orgName = facilityOrg[primary.facilityKey];
      const r = await createDoctor(page, d, facilityNames, orgName);
      // database verification (read-only) right after the successful UI creation; throws on any mismatch
      const db = await verifyDoctorInDb(d, facilityNames, dbRecords);
      created.push({ organizationName: orgName, id: r.id, dbProviderId: db.id, name: r.name, email: r.email, speciality: d.speciality,
        registrationNumber: d.registrationNumber, facilities: d.facilityAssignments.map((a: any) => facilityNames[a.facilityKey]) });
      addVerified('doctors', { id: r.id, email: r.email, name: r.name });
    }
    writeOutput('doctor-output.json', { ...base, status: 'SUCCESS', doctors: created });
  } catch (err: any) {
    writeOutput('doctor-output.json', { ...base, status: 'FAILED', created, error: String(err.message ?? err) });
    throw err;
  }
});

test('TC005 - Doctors are listed under their facility', async ({ page }) => {
  const facOut = readPrerequisite('facility-output.json', 'successfully created facilities');
  const docOut = readPrerequisite('doctor-output.json', 'successfully created doctors');
  await login(page);
  await page.goto(route('doctorList'));
  for (const d of docOut.doctors) {
    await switchOrganization(page, d.organizationName ?? facOut.organizationName);
    // the list's search box and rows use names (not emails)
    const [first, last] = String(d.name).split(' ');
    await findRowInList(page, last, new RegExp(`${first}.*${last}`, 'i'));
  }
});
