import fs from 'fs';
import path from 'path';
import { OUTPUT_ROOT, runDir, currentRunId } from './run-context';

export function writeOutput(file: string, data: unknown): string {
  const p = path.join(runDir(), file);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}

function readJson(p: string): any | null {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; }
}

/** Output of the current run, or null. */
export function readCurrentOutput(file: string): any | null {
  return readJson(path.join(runDir(), file));
}

/**
 * Prerequisite lookup. Order: current run -> newest earlier run whose file says SUCCESS.
 * This lets you run just facility or doctor on their own after a successful organization run.
 * Throws a clear message when nothing valid exists (never uses a failed record).
 */
export function readPrerequisite(file: string, needed: string): any {
  const cur = readCurrentOutput(file);
  if (cur?.status === 'SUCCESS') return cur;

  if (fs.existsSync(OUTPUT_ROOT)) {
    const runs = fs.readdirSync(OUTPUT_ROOT).filter(n => n.startsWith('RUN_')).sort().reverse();
    for (const r of runs) {
      if (r === `RUN_${currentRunId()}`) continue;
      const out = readJson(path.join(OUTPUT_ROOT, r, file));
      if (out?.status === 'SUCCESS') return out;
    }
  }
  throw new Error(`Missing prerequisite: ${needed}. No successful "${file}" found. Run the earlier module first.`);
}

/** Organizations of an organization-output.json (older runs only had a single "organization"). */
export function orgsFromOutput(out: any): { key: string; id: string | null; name: string }[] {
  return out.organizations ?? [{ key: 'ORG1', ...out.organization }];
}
