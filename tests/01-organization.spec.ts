import { test, expect } from '@playwright/test';
import { login } from '../helpers/login';
import { loadResolved } from '../helpers/data-loader';
import { writeOutput, readCurrentOutput } from '../helpers/output';
import { addVerified, loadMaster } from '../helpers/master-data';
import { createOrganization, verifyApplicationAccess, submitWithMissing } from '../flows/organization';
import { field, findRowInList } from '../helpers/ui';
import { route } from '../helpers/routes';
import { verifyOrganizationInDb } from '../helpers/database/modules/organization.db';
import { closePool } from '../helpers/database/db-connection';

const data = loadResolved();
const orgs = (data.organizations ?? []).filter((o: any) => o.enabled !== false);
const org = orgs[0];   // TC002 uses the first organization
const results: Record<string, string> = {};

test.describe.configure({ mode: 'serial' });
test.skip(orgs.length === 0, 'no organization enabled in test-data.json');

test.beforeEach(async ({ page }) => { await login(page); });
test.afterAll(async () => { await closePool(); });

test('TC001 - Create organization(s) and verify Application Access', async ({ page }) => {
  const base = {
    executionId: process.env.RUN_ID, timestamp: new Date().toISOString(),
    submitted: orgs.map((o: any) => ({ ...o, identity: { ...o.identity } })), testCases: results,
  };
  const done: any[] = [];
  const dbRecords: any[] = [];
  try {
    for (const o of orgs) {
      // REUSE_LATEST (single organization only): use the newest verified organization from master data if it still exists
      let created: { id: string | null; name: string } | null = null;
      let reused = false;
      if (orgs.length === 1 && (data.execution?.mode === 'REUSE_LATEST' || process.env.MODE === 'REUSE_LATEST')) {
        const last = loadMaster().organizations.at(-1);
        if (last) {
          await page.goto(route('orgList'));
          try { await findRowInList(page, last.name); created = { id: last.id ?? null, name: last.name }; reused = true; } catch { /* gone: create new */ }
        }
      }
      if (!created) created = await createOrganization(page, o);

      const access = await verifyApplicationAccess(page, created.name, o.applicationAccess);

      // database verification (read-only) right after the successful UI creation; throws on any mismatch
      const db = await verifyOrganizationInDb(o, dbRecords);

      done.push({ key: o.key, id: created.id, dbOrganizationId: db.id, name: created.name, registrationNumber: o.identity.registrationNumber,
        reused, applicationAccess: { expected: o.applicationAccess, saved: access, verified: access !== null } });
      if (!reused) addVerified('organizations', { id: created.id, name: created.name, registrationNumber: o.identity.registrationNumber });
    }
    results.TC001 = 'PASSED';
    writeOutput('organization-output.json', { ...base, status: 'SUCCESS', organizations: done, organization: done[0] });
  } catch (err: any) {
    results.TC001 = 'FAILED';
    writeOutput('organization-output.json', { ...base, status: 'FAILED', created: done, error: String(err.message ?? err) });
    throw err;
  }
});

test('TC002 - Mandatory field validation (Organization Name empty)', async ({ page }) => {
  await submitWithMissing(page, org, 'Organization Name');
  // still on the create form = nothing was saved
  await expect(page).toHaveURL(/create/);
  await expect(field(page, 'Organization Name')).toBeVisible();
  results.TC002 = 'PASSED';
  const out = readCurrentOutput('organization-output.json');
  if (out) writeOutput('organization-output.json', { ...out, testCases: results });
});
