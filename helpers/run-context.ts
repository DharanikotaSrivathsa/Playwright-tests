import fs from 'fs';
import path from 'path';

export const ROOT = path.resolve(__dirname, '..');
export const OUTPUT_ROOT = path.join(ROOT, 'output');

export function newRunId(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Set by global-setup so every spec file of one execution shares the same run. */
export function currentRunId(): string {
  const id = process.env.RUN_ID;
  if (!id) throw new Error('RUN_ID is not set. Run the suite through "npx playwright test" so global-setup can create it.');
  return id;
}

export function runDir(runId = currentRunId()): string {
  const dir = path.join(OUTPUT_ROOT, `RUN_${runId}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
