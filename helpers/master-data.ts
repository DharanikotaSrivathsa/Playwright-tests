import fs from 'fs';
import path from 'path';
import { ROOT } from './run-context';

const FILE = path.join(ROOT, 'master-data', 'master-data.json');
type Master = { organizations: any[]; facilities: any[]; doctors: any[] };

export function loadMaster(): Master {
  try {
    const m = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
    return { organizations: m.organizations ?? [], facilities: m.facilities ?? [], doctors: m.doctors ?? [] };
  } catch {
    return { organizations: [], facilities: [], doctors: [] };
  }
}

/** Call ONLY after the portal has confirmed the record exists. */
export function addVerified(kind: keyof Master, record: any): void {
  const m = loadMaster();
  m[kind].push({ ...record, verifiedAt: new Date().toISOString() });
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(m, null, 2));
}
