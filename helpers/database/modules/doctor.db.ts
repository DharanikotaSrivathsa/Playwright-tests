import { findDoctorsByUsername, doctorFacilityMappings, doctorAttributes, doctorQualifications, doctorPersonName, specialityNameById, findFacilitiesByName, doctorFees } from '../db-queries';
import { check, checkSet, reportDb, DbCheck } from '../db-assertions';

/**
 * Verify, straight from the database, one doctor the UI just created.
 * The doctor is found by login username (= the email); facility links come from provider_facility_mapping.
 */
export async function verifyDoctorInDb(d: any, facilityNames: Record<string, string>, accumulated: any[]) {
  const label = `doctor "${d.firstName} ${d.lastName}" <${d.email}>`;
  const rows: any[] = await findDoctorsByUsername(d.email);
  const row = rows[0];
  const checks: DbCheck[] = [];
  if (rows.length !== 1) checks.push({ field: 'unique row', expected: 1, actual: rows.length, match: false });
  if (row) {
    const pid = row.provider_id;
    const [spec] = row.bluad_speciality_id ? await specialityNameById(row.bluad_speciality_id) : [];
    const [person] = await doctorPersonName(d.email);
    const attrs = Object.fromEntries((await doctorAttributes(pid)).map((a: any) => [a.name, a.value_reference]));
    const quals = await doctorQualifications(pid);
    const maps = await doctorFacilityMappings(pid);

    checks.push(
      check('staff_type', 'DOCTOR', row.staff_type),
      check('retired', 0, row.retired),
      check('first name', d.firstName, person?.given_name),
      check('last name', d.lastName, person?.family_name),
      check('speciality', d.speciality, (spec as any)?.SpecialityName, true),
      check('registration_number', d.registrationNumber, attrs.registration_number),
      check('registration_council', d.registrationCouncil, attrs.registration_council),
      check('registration_year', d.registrationYear, attrs.registration_year),
      check('email attribute', d.email, attrs.email, true),
      check('phone attribute', d.phone, attrs.phone),
      check('description', d.description, attrs.description),
      check('qualification degree', d.qualification.degree, quals[0]?.degree_name),
      check('qualification institution', d.qualification.institution, quals[0]?.institution),
      check('qualification year', d.qualification.yearOfPassing, quals[0]?.year_of_passing),
    );

    const wanted = d.facilityAssignments.map((a: any) => ({ a, name: facilityNames[a.facilityKey] }));
    checks.push(checkSet('facilities linked', wanted.map((w: any) => w.name), maps.map((m: any) => m.FacilityName)));
    for (const { a, name } of wanted) {
      const m = maps.find((x: any) => x.FacilityName === name);
      if (!m) continue;      // already reported by the facilities check
      const f = `[${name}]`;
      checks.push(
        check(`${f} status`, 'A', m.status),
        check(`${f} is_base_facility`, a.primary ? 'Y' : 'N', m.is_base_facility),
      );
      const [fm]: any[] = await findFacilitiesByName(name);
      const [full]: any[] = await doctorFees(pid, fm.FacilityID);
      checks.push(
        check(`${f} OPD fee`, Number(a.opdFee).toFixed(2), full?.opd_consultationfee),
        check(`${f} IPD fee`, Number(a.ipdFee).toFixed(2), full?.ipd_consultationfee),
        check(`${f} Tele fee`, Number(a.teleFee).toFixed(2), full?.tele_consultationfee),
      );
    }
  }
  accumulated.push({ label, found: !!row, row: row ? { ...row } : undefined, checks });
  reportDb('db-doctor.json', { module: 'doctor', tables: ['users', 'provider', 'person_name', 'provider_attribute', 'provider_qualifications', 'provider_facility_mapping'] }, accumulated);
  return { id: row?.provider_id as number | null };
}
