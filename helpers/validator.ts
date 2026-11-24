import fs from 'fs';
import path from 'path';
import { TestData } from './types';
import { catalogProblem, fromCatalog, suggestedModeName } from './catalog';

const isAuto = (v: unknown) => v === 'AUTO';
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const TAN = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const PHONE = /^[6-9][0-9]{9}$/;
const FACILITY_TYPES = ['Hospital', 'Clinic', 'Diagnostic Center', 'Laboratory'];

/** Returns a list of human-readable problems. Empty list = data is OK. */
export function validateTestData(d: TestData, root = process.cwd()): string[] {
  const e: string[] = [];
  const need = (cond: boolean, msg: string) => { if (!cond) e.push(msg); };
  const optFormat = (v: any, re: RegExp, label: string) => {
    if (v && !isAuto(v)) need(re.test(String(v)), `${label}: "${v}" has wrong format`);
  };
  const fileOk = (p: string, label: string) => {
    if (p) need(fs.existsSync(path.resolve(root, p)), `${label}: file not found "${p}"`);
  };

  // ---------- organizations ----------
  const orgKeys = new Set<string>();
  const orgList = d.organizations ?? [];
  if (!orgList.length) e.push('organizations: at least one organization is required');
  orgList.forEach((o: any, i: number) => {
    if (o.enabled === false) return;
    const q = `organizations[${i}]`;
    need(!!o.key, `${q}.key: required (facilities refer to the organization by this key)`);
    need(!orgKeys.has(o.key), `${q}.key: "${o.key}" is duplicated`);
    orgKeys.add(o.key);
    need(!!o.name, `${q}.name: required (use "AUTO" or a value)`);
    need(!!o.address?.line1, `${q}.address.line1: required`);
    need(/^\d{6}$/.test(o.address?.pincode ?? ''), `${q}.address.pincode: must be 6 digits`);
    need(!!o.address?.city, `${q}.address.city: required`);
    const ph = o.contact?.phone;
    need(isAuto(ph) || PHONE.test(String(ph ?? '')), `${q}.contact.phone: must be 10 digits starting 6-9, or AUTO`);
    need(!!o.billing?.currencyCode && !/\d/.test(o.billing.currencyCode), `${q}.billing.currencyCode: required, no digits`);
    for (const k of ['admin', 'opdBilling', 'pharmacy', 'ipd'])
      need(typeof o.applicationAccess?.[k] === 'boolean', `${q}.applicationAccess.${k}: must be true or false`);
    optFormat(o.identity?.pan, PAN, `${q}.identity.pan`);
    optFormat(o.identity?.tan, TAN, `${q}.identity.tan`);
    optFormat(o.identity?.gstin, GSTIN, `${q}.identity.gstin`);
    fileOk(o.identity?.logo, `${q}.identity.logo`);
  });
  const firstOrgKey = orgList.find((o: any) => o.enabled !== false)?.key;

  // ---------- facilities ----------
  const keys = new Set<string>();
  (d.facilities ?? []).forEach((f, i) => {
    if (f.enabled === false) return;
    const p = `facilities[${i}]`;
    need(!!f.key, `${p}.key: required (used by doctors to refer to this facility)`);
    need(!keys.has(f.key), `${p}.key: "${f.key}" is duplicated`);
    keys.add(f.key);
    need(!!f.name, `${p}.name: required`);
    need(orgKeys.has(f.organizationKey ?? firstOrgKey), `${p}.organizationKey: "${f.organizationKey}" is not an organization key (${[...orgKeys].join(', ')}); leave empty for the first organization`);
    need(FACILITY_TYPES.includes(f.type), `${p}.type: must be one of ${FACILITY_TYPES.join(', ')}`);
    need(isAuto(f.phone) || PHONE.test(String(f.phone ?? '')), `${p}.phone: must be 10 digits starting 6-9, or AUTO`);
    need(typeof f.registrationFee === 'number' && f.registrationFee >= 0 && f.registrationFee < 10_000_000,
      `${p}.registrationFee: number, 0 to 9999999.99`);
    need(/^[A-Za-z0-9 ,./#-]+$/.test(f.addressLine1 ?? ''), `${p}.addressLine1: letters, numbers and , . / # - only`);
    need(/^[A-Za-z0-9 ]{1,200}$/.test(f.defaultVisitLocation ?? ''), `${p}.defaultVisitLocation: letters, numbers, spaces, max 200`);
    need(f.specialities === undefined || Array.isArray(f.specialities), `${p}.specialities: must be a list of numbers, e.g. [2, 12] (see npm run list:catalog); empty = default`);
    (Array.isArray(f.specialities) ? f.specialities : []).forEach((x: unknown, j: number) => {
      const m = isAuto(x) ? '' : catalogProblem('speciality', x);
      need(!m, `${p}.specialities[${j}]: ${m}`);
    });
    optFormat(f.pan, PAN, `${p}.pan`);
    optFormat(f.tan, TAN, `${p}.tan`);
    optFormat(f.gstin, GSTIN, `${p}.gstin`);
  });

  // ---------- doctors ----------
  const year = new Date().getFullYear();
  (d.doctors ?? []).forEach((doc, i) => {
    if (doc.enabled === false) return;
    const p = `doctors[${i}]`;
    need(['Male', 'Female'].includes(doc.gender), `${p}.gender: Male or Female`);
    if (doc.speciality !== undefined && doc.speciality !== '' && !isAuto(doc.speciality)) {
      const m = catalogProblem('speciality', doc.speciality);
      need(!m, `${p}.speciality: ${m} (number from npm run list:catalog, or AUTO)`);
    }
    if (doc.consultationMode !== undefined && !isAuto(doc.consultationMode)) {
      const m = catalogProblem('consultationMode', doc.consultationMode);
      need(!m, `${p}.consultationMode: ${m} (number from npm run list:catalog, or AUTO)`);
    }
    need(!!doc.registrationCouncil, `${p}.registrationCouncil: required`);
    need(Number.isInteger(doc.registrationYear), `${p}.registrationYear: whole number`);
    need(typeof doc.portalPassword === 'string' && doc.portalPassword.length >= 8, `${p}.portalPassword: required, at least 8 characters (the doctor's portal login password)`);
    need(!!doc.registrationDocument, `${p}.registrationDocument: required (pdf/png/jpg, max 2 MB)`);
    fileOk(doc.registrationDocument, `${p}.registrationDocument`);
    fileOk(doc.signature, `${p}.signature`);
    const q = doc.qualification ?? {};
    need(!!q.degree && !!q.institution, `${p}.qualification: degree and institution required`);
    need(q.yearOfPassing >= 1950 && q.yearOfPassing <= year, `${p}.qualification.yearOfPassing: 1950 to ${year}`);
    if (doc.count !== undefined) need(Number.isInteger(doc.count) && doc.count >= 1, `${p}.count: whole number >= 1`);
    if (doc.count > 1) need(isAuto(doc.email) || doc.email === undefined, `${p}.email: with count > 1 email must be AUTO`);
    const fa = doc.facilityAssignments ?? [];
    need(fa.length > 0, `${p}.facilityAssignments: at least one`);
    need(fa.filter((x: any) => x.primary).length === 1, `${p}.facilityAssignments: exactly one must be primary`);
    const orgOf = (k: string) => (d.facilities ?? []).find((f: any) => f.key === k)?.organizationKey ?? firstOrgKey;
    need(new Set(fa.map((x: any) => orgOf(x.facilityKey))).size <= 1, `${p}.facilityAssignments: all facilities of one doctor must belong to the same organization`);
    fa.forEach((x: any, j: number) => {
      need(keys.has(x.facilityKey), `${p}.facilityAssignments[${j}].facilityKey: "${x.facilityKey}" is not a facility key`);
      for (const k of ['opdFee', 'ipdFee', 'teleFee'])
        need(typeof x[k] === 'number' && x[k] >= 0, `${p}.facilityAssignments[${j}].${k}: number >= 0`);
    });
  });

  return e;
}

/** Non-blocking hints: things that are allowed but probably not what the tester meant. */
export function adviseTestData(d: TestData): string[] {
  const w: string[] = [];
  (d.doctors ?? []).forEach((doc: any, i: number) => {
    if (doc.enabled === false) return;
    try {
      const sp = String(doc.speciality ?? '').trim();
      const cm = String(doc.consultationMode ?? '').trim();
      if (!sp || isAuto(sp)) return;
      const spName = fromCatalog('speciality', sp);
      if (cm && !isAuto(cm)) {
        const cmName = fromCatalog('consultationMode', cm), want = suggestedModeName(spName);
        if (cmName !== want && cmName !== 'General Medicine')
          w.push(`doctors[${i}]: speciality "${spName}" usually goes with consultation mode "${want}", but you chose "${cmName}" (use AUTO to get the matching one)`);
      }
      const fac = (d.facilities ?? []).find((f: any) => f.key === (doc.facilityAssignments ?? []).find((x: any) => x.primary)?.facilityKey);
      const mapped = (fac?.specialities ?? []).map((x: unknown) => String(x).trim()).filter((x: string) => x && !isAuto(x)).map((x: string) => fromCatalog('speciality', x));
      if (mapped.length && !mapped.includes(spName))
        w.push(`doctors[${i}]: speciality "${spName}" is not in facility "${fac.key}" specialities - the portal will not offer it for this doctor`);
    } catch { /* range errors are reported by validateTestData */ }
  });
  return w;
}
