import fs from 'fs';
import path from 'path';
import { OUTPUT_ROOT, runDir } from './helpers/run-context';

/** Builds final-output.json from the module outputs of this run. */
export default async function globalTeardown() {
  const dir = runDir();
  const read = (f: string) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')); } catch { return null; } };
  const org = read('organization-output.json');
  const fac = read('facility-output.json');
  const doc = read('doctor-output.json');
  const parts = [org, fac, doc].filter(Boolean);
  const final = {
    executionId: process.env.RUN_ID,
    finishedAt: new Date().toISOString(),
    overallStatus: parts.length > 0 && parts.every(p => p.status === 'SUCCESS') ? 'SUCCESS' : 'INCOMPLETE_OR_FAILED',
    organization: org, facilities: fac, doctors: doc,
  };
  fs.writeFileSync(path.join(dir, 'final-output.json'), JSON.stringify(final, null, 2));
  if (final.overallStatus === 'SUCCESS') {
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'latest-run.json'),
      JSON.stringify({ runId: process.env.RUN_ID, folder: `RUN_${process.env.RUN_ID}` }, null, 2));
  }
}
