# Hospital Playwright Suite

Creates **Organization → Facility → Doctor** through the real portal UI (headed browser),
driven by one JSON file. No AI is needed to run it.

## 1. One-time setup
```bash
npm install
npx playwright install chromium
cp .env.example .env        # then fill BASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD
```

## 2. Run
```bash
npm run check:data          # validates Admin_hub/test-data.json (no browser)
npm test                    # full suite: org -> facility -> doctor
npm run test:org            # only organization
npm run test:facility       # only facility (uses the latest successful organization)
npm run test:doctor         # only doctors  (uses the latest successful facility)
npm run report              # open the HTML report
```
Another input file:  `TEST_DATA=Admin_hub/my-data.json npm test`
Slow it down to watch:  `SLOWMO=300 npm test`

## 3. Editing Admin_hub/test-data.json
| You write | Meaning |
|---|---|
| `"AUTO"` | Playwright generates a unique synthetic value |
| any other value | used exactly as typed |
| `""` | field left empty (optional fields only) |
| `"enabled": false` | skip that facility/doctor block |
| `"count": 5` (doctors) | create 5 doctors from that block (email etc. must be AUTO) |

`AUTO` works for: organization name/registration number/PAN/TAN/GSTIN/phone/email,
facility name/email/phone/registration number/PAN/TAN/GSTIN/default visit location,
doctor first/last/display name, DOB, email, phone, description, registration number.
Everything else (address, pincode, fees, council, qualification,
Application Access, file paths) is your business choice - type it.

**Several organizations:** `organizations` is a list. Add another block (with its own unique `key`, e.g. `"ORG2"`) to create
another organization in the same run. A facility says which one it belongs to with `"organizationKey": "ORG2"` (empty = the
first organization). A doctor goes to the organization of its facilities, so all of one doctor's facilities must be in the same
organization. (An old single `"organization": {...}` object still works.)

Doctors refer to facilities by `facilityKey` (e.g. `"A"`), which must match a facility `key`.
Exactly one facility assignment per doctor must have `"primary": true`.
Council must already exist in the portal.

**Specialities and consultation modes are numbers.** The two lists are separate files with the number written next to each name:
`helpers/specialities.ts` and `helpers/consultation-modes.ts` (`npm run list:catalog` prints both). In the JSON:
`"specialities": [2, 12]` on a facility, `"speciality": 2` and `"consultationMode": 1` on a doctor.
The loader swaps the number for the portal name, like AUTO. Empty/`AUTO`: facility = General practice (2),
doctor speciality = first speciality of its primary facility, consultation mode = General Medicine (1).
Exact names still work. New portal options: add it to the end of the right list file with the next number.
Files (logo, signature, registration document) go in `test-files/`.

## 4. Output
```
output/RUN_<date-time>/
   resolved-data.json         the exact values used (AUTO filled in)
   organization-output.json   status, IDs, saved Application Access, test results
   facility-output.json
   doctor-output.json
   final-output.json          combined result of this run
output/latest-run.json        points to the newest fully successful run
master-data/master-data.json  records verified in the portal (never failed ones)
reports/html/                 Playwright HTML report (screenshots + traces on failure)
```
Every run gets its own folder; nothing is overwritten.

## 5. IMPORTANT - first run
Field lookups use the visible LABELS from your form description (e.g. "Organization Name",
"Address Line 1") and generic roles for buttons, toasts, search boxes and table rows. The portal
was not available when this was written, so on the first headed run some selectors may need a
small fix:
- Routes (login, list, create, edit pages): `Admin_hub/environment.json`
- Field/dropdown/checkbox/upload behaviour: `helpers/ui.ts`
- Login: `helpers/login.ts`
- Per-form steps: `flows/organization.ts`, `flows/facility.ts`, `flows/doctor.ts`

Run `npm run test:org` first and fix module by module.

## 6. Adding a new module later (nurse, staff, beds...)
1. Add a section to `Admin_hub/test-data.json`
2. Add its rules to `helpers/validator.ts`
3. Add `AUTO` handling in `helpers/data-loader.ts`
4. Add `flows/<module>.ts`
5. Add `tests/0N-<module>.spec.ts` (copy `03-doctor.spec.ts`)

Existing modules are untouched.

## Not included
Bed Management, IPD Settings, Anesthetist, Nurse, Staff, Pharmacy Store, and the Doctor-Portal
fixture writer from your old project (`fixture-writer.ts`) - add them later if still needed.
