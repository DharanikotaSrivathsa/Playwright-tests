import { select } from './db-connection';

/**
 * All SQL lives here. Tables/columns were taken from the live `openmrs` schema (SHOW COLUMNS), not guessed.
 *   organizationmaster : the organization's id is openMRSLocID (facilitymaster.OrganizationID points at it)
 *   facilitymaster     : FacilityID, OrganizationID, FacilityName, ...
 *   facility_speciality_mapping + specialitymaster : facility specialities
 *   provider + provider_facility_mapping           : doctors and their facility links
 */

export const findOrganizationByName = (name: string) =>
  select(`SELECT * FROM organizationmaster WHERE OrganizationName = ?`, [name]);

// ---- facility (used from step 2) ----
export const findFacilitiesByName = (name: string) =>
  select(`SELECT * FROM facilitymaster WHERE FacilityName = ?`, [name]);

export const facilitySpecialities = (facilityId: number) =>
  select(
    `SELECT s.SpecialityName FROM facility_speciality_mapping m
       JOIN specialitymaster s ON s.SpecialityID = m.SpecialityID
      WHERE m.FacilityID = ? AND m.IsActive = 'A'`, [facilityId]);

// ---- doctor (used from step 3) ----
export const findDoctorsByUsername = (email: string) =>
  select(
    `SELECT p.provider_id, p.name, p.staff_type, p.retired, p.bluad_speciality_id, u.username
       FROM users u
       JOIN provider p ON p.person_id = u.person_id
      WHERE u.username = ?`, [email]);

export const doctorFacilityMappings = (providerId: number) =>
  select(
    `SELECT f.FacilityID, f.FacilityName, m.status, m.is_base_facility
       FROM provider_facility_mapping m
       JOIN facilitymaster f ON f.FacilityID = m.facilityid
      WHERE m.provider_id = ?`, [providerId]);

export const specialityNameById = (id: number) =>
  select(`SELECT SpecialityName FROM specialitymaster WHERE SpecialityID = ?`, [id]);

export const doctorAttributes = (providerId: number) =>
  select(
    `SELECT t.name, a.value_reference FROM provider_attribute a
       JOIN provider_attribute_type t ON t.provider_attribute_type_id = a.attribute_type_id
      WHERE a.provider_id = ? AND a.voided = 0`, [providerId]);

export const doctorQualifications = (providerId: number) =>
  select(`SELECT degree_name, institution, year_of_passing, certificate_url FROM provider_qualifications WHERE provider_id = ?`, [providerId]);

export const doctorPersonName = (email: string) =>
  select(
    `SELECT pn.given_name, pn.family_name FROM users u
       JOIN person_name pn ON pn.person_id = u.person_id AND pn.voided = 0
      WHERE u.username = ?`, [email]);

export const doctorFees = (providerId: number, facilityId: number) =>
  select(
    `SELECT opd_consultationfee, ipd_consultationfee, tele_consultationfee FROM provider_facility_mapping
      WHERE provider_id = ? AND facilityid = ?`, [providerId, facilityId]);
