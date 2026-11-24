import fs from 'fs';
import path from 'path';
import { writeOutput, readCurrentOutput } from '../output';

export interface DbCheck { field: string; expected: unknown; actual: unknown; match: boolean }

const norm = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

/** Compare one field. Case-insensitive when `ci` is set (e.g. facility type HOSPITAL vs Hospital). */
export function check(field: string, expected: unknown, actual: unknown, ci = false): DbCheck {
  const a = ci ? norm(actual).toLowerCase() : norm(actual);
  const e = ci ? norm(expected).toLowerCase() : norm(expected);
  return { field, expected, actual, match: a === e };
}

export const checkBool = (field: string, expected: boolean, actual: unknown): DbCheck =>
  ({ field, expected, actual, match: !!Number(actual) === !!expected });

/** Compare as sets (ignores order/duplicates). */
export function checkSet(field: string, expected: string[], actual: string[]): DbCheck {
  const e = [...new Set(expected.map(s => s.trim().toLowerCase()))].sort();
  const a = [...new Set(actual.map(s => s.trim().toLowerCase()))].sort();
  const missing = e.filter(x => !a.includes(x));
  const extra = a.filter(x => !e.includes(x));
  return { field, expected, actual: { saved: actual, missing, extra }, match: !missing.length && !extra.length };
}

/** Save the detailed result to output/RUN_<id>/<file> (merging per-record results) and throw if any check failed. */
export function reportDb(file: string, header: Record<string, unknown>, records: { label: string; found: boolean; row?: unknown; checks: DbCheck[] }[]) {
  const failures = records.flatMap(r =>
    !r.found ? [`${r.label}: record NOT FOUND in database`]
      : r.checks.filter(c => !c.match).map(c => `${r.label}: ${c.field} expected=${JSON.stringify(c.expected)} actual=${JSON.stringify(c.actual)}`));
  const payload = {
    ...header, executionId: process.env.RUN_ID, timestamp: new Date().toISOString(),
    status: failures.length ? 'FAILED' : 'VERIFIED', failures, records,
  };
  const saved = writeOutput(file, payload);
  if (failures.length) throw new Error(`Database verification failed (details: ${saved})\n - ${failures.join('\n - ')}`);
  return payload;
}
