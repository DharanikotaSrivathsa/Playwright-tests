import fs from 'fs';
import path from 'path';
import { Generator } from './random-generator';
import { TestData } from './types';
import { ROOT, runDir } from './run-context';
import { validateTestData, adviseTestData } from './validator';
import { fromCatalog, DEFAULT_SPECIALITY, suggestedModeName } from './catalog';

const A = 'AUTO';


export function loadRawData(): TestData {
  const file = path.resolve(ROOT, process.env.TEST_DATA ?? 'Admin_hub/test-data.json');
  if (!fs.existsSync(file)) throw new Error(`Test data file not found: ${file}`);
  try {
    const d = JSON.parse(fs.readFileSync(file, 'utf-8'));
    // backwards compatible: a single "organization" object becomes a one-item "organizations" list
    if (!d.organizations && d.organization) { d.organizations = [{ key: 'ORG1', ...d.organization }]; delete d.organization; }
    return d;
  } catch (err: any) {
    throw new Error(`Test data is not valid JSON (${file}): ${err.message}`);
  }
}

/** Replace every "AUTO" with a generated value. Doctors with count > 1 are expanded. */
export function resolveData(raw: TestData, runId: string): TestData {
  const g = new Generator(runId);
  const d: TestData = JSON.parse(JSON.stringify(raw));
  const orgs = (d.organizations ?? []).filter((x: any) => x.enabled !== false);
  for (const o of d.organizations ?? []) {
    if (o.enabled === false) continue;
    if (o.name === A) o.name = g.orgName(orgs.length > 1 ? o.key : undefined);
    if (o.identity.registrationNumber === A) o.identity.registrationNumber = g.registrationNumber('ORG');
    if (o.identity.pan === A) o.identity.pan = g.pan();
    if (o.identity.tan === A) o.identity.tan = g.tan();
    if (o.identity.gstin === A) o.identity.gstin = g.gstin();
    if (o.contact.phone === A) o.contact.phone = g.phone();
    if (o.contact.email === A) o.contact.email = g.email(`org${o.key}`);
    if (o.contact.website === A) o.contact.website = g.link(o.name, 'website');
    for (const site of ['facebook', 'instagram', 'linkedin', 'youtube'])
      if (o.socialLinks?.[site] === A) o.socialLinks[site] = g.link(o.name, site);
  }

  for (const f of d.facilities ?? []) {
    if (f.enabled === false) continue;
    if (!f.organizationKey) f.organizationKey = orgs[0]?.key;   // default: the first organization
    if (f.name === A) f.name = g.facilityName(f.key);
    if (f.email === A) f.email = g.email(`fac${f.key}`);
    if (f.phone === A) f.phone = g.phone();
    if (f.registrationNumber === A) f.registrationNumber = g.registrationNumber('FAC');
    if (f.pan === A) f.pan = g.pan();
    if (f.tan === A) f.tan = g.tan();
    if (f.gstin === A) f.gstin = g.gstin();
    if (f.defaultVisitLocation === A) f.defaultVisitLocation = 'Main OPD';
    // Facility specialities: numbers from helpers/catalog.ts (or exact names). Empty / "AUTO" = the default speciality.
    const listed = (Array.isArray(f.specialities) ? f.specialities : []).map((x: unknown) => String(x).trim()).filter((x: string) => x && x !== A);
    f.specialities = [...new Set((listed.length ? listed : [String(DEFAULT_SPECIALITY)]).map((x: string) => fromCatalog('speciality', x)))];
  }

  const doctors: any[] = [];
  for (const tpl of d.doctors ?? []) {
    if (tpl.enabled === false) continue;
    const n = tpl.count ?? 1;
    for (let i = 0; i < n; i++) {
      const doc = JSON.parse(JSON.stringify(tpl));
      delete doc.count;
      if (doc.firstName === A) doc.firstName = g.firstName();
      if (doc.lastName === A) doc.lastName = g.lastName();
      if (doc.displayName === A) doc.displayName = `Dr. ${doc.firstName} ${doc.lastName}`;
      if (doc.dateOfBirth === A) doc.dateOfBirth = g.dateOfBirth();
      if (doc.email === A) doc.email = g.email('doc');
      if (doc.phone === A) doc.phone = g.phone();
      // Speciality / consultation mode: number from helpers/catalog.ts or exact name.
      // Empty / "AUTO" speciality = first speciality of the doctor's primary facility.
      const sp = String(doc.speciality ?? '').trim();
      if (!sp || sp === A) {
        const primary = (doc.facilityAssignments ?? []).find((x: any) => x.primary);
        const fac = (d.facilities ?? []).find((x: any) => x.key === primary?.facilityKey);
        doc.speciality = fac?.specialities?.[0] ?? fromCatalog('speciality', DEFAULT_SPECIALITY);
      } else doc.speciality = fromCatalog('speciality', sp);
      const cm = String(doc.consultationMode ?? '').trim();
      // empty / AUTO = the mode that fits the speciality (Pediatric* -> Pediatrics, ..., else the speciality's own mode)
      doc.consultationMode = !cm || cm === A ? suggestedModeName(doc.speciality) : fromCatalog('consultationMode', cm);
      if (doc.description === A) doc.description = g.description(doc.speciality);
      if (doc.registrationNumber === A) doc.registrationNumber = g.doctorRegNumber();
      doctors.push(doc);
    }
  }
  d.doctors = doctors;

  // anything still "AUTO" means the field has no generator: fail loudly
  const leftovers: string[] = [];
  const walk = (v: any, p: string) => {
    if (v === A) leftovers.push(p);
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], `${p}.${k}`);
  };
  walk(d, 'data');
  if (leftovers.length) throw new Error(`"AUTO" is not supported for: ${leftovers.join(', ')}. Type a value instead.`);

  return d;
}

/** Validate the raw JSON, resolve AUTO, and persist the result for this run. */
export function prepareRun(runId: string): TestData {
  const raw = loadRawData();
  const problems = validateTestData(raw, ROOT);
  if (problems.length) {
    throw new Error('test-data.json has problems:\n - ' + problems.join('\n - '));
  }
  for (const w of adviseTestData(raw)) console.warn('⚠️  ' + w);
  const resolved = resolveData(raw, runId);
  fs.writeFileSync(path.join(runDir(runId), 'resolved-data.json'), JSON.stringify(resolved, null, 2));
  return resolved;
}

/** Specs call this: every spec of the same run sees the same generated values. */
export function loadResolved(): TestData {
  const p = path.join(runDir(), 'resolved-data.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}
