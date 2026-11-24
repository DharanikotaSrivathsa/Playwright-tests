import { test, expect } from '@playwright/test';
import { login } from '../helpers/login';
import { loadResolved } from '../helpers/data-loader';
import { writeOutput, readPrerequisite, orgsFromOutput } from '../helpers/output';
import { addVerified } from '../helpers/master-data';
import { createFacility } from '../flows/facility';
import { verifyFacilityInDb } from '../helpers/database/modules/facility.db';
import { closePool } from '../helpers/database/db-connection';

const data = loadResolved();
const facilities = (data.facilities ?? []).filter((f: any) => f.enabled !== false);

test.describe.configure({ mode: 'serial' });
test.skip(facilities.length === 0, 'no facilities enabled in test-data.json');
test.afterAll(async () => { await closePool(); });

test('TC003 - Create facilities under the organization', async ({ page }) => {
  const orgOut = readPrerequisite('organization-output.json', 'a successfully created organization');
  const orgByKey: Record<string, { id: string | null; name: string }> = {};
  for (const o of orgsFromOutput(orgOut)) orgByKey[o.key] = o;
  const firstOrg = orgsFromOutput(orgOut)[0];
  const base = { executionId: process.env.RUN_ID, timestamp: new Date().toISOString(), organizationId: firstOrg.id, organizationName: firstOrg.name };
  const created: any[] = [];
  const dbRecords: any[] = [];
  try {
    await login(page);
    for (const f of facilities) {
      const org = orgByKey[f.organizationKey] ?? firstOrg;
      const orgName = org.name;
      const r = await createFacility(page, f, orgName);
      // database verification (read-only) right after the successful UI creation; throws on any mismatch
      const db = await verifyFacilityInDb(f, orgName, dbRecords);
      created.push({ key: f.key, organizationKey: f.organizationKey, organizationName: orgName, id: r.id, dbFacilityId: db.id, name: r.name, type: f.type, registrationNumber: f.registrationNumber, specialities: f.specialities });
      addVerified('facilities', { id: r.id, name: r.name, organizationId: org.id, key: f.key });
    }
    writeOutput('facility-output.json', { ...base, status: 'SUCCESS', facilities: created });
  } catch (err: any) {
    writeOutput('facility-output.json', { ...base, status: 'FAILED', created, error: String(err.message ?? err) });
    throw err;
  }
});
