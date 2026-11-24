/**
 * npm run list:catalog              -> every speciality with the consultation mode that fits it, then all modes
 * npm run list:catalog -- cardio    -> only rows containing "cardio" (search)
 */
import { SPECIALITIES, CONSULTATION_MODES, suggestedModeNumber, suggestedModeName } from '../helpers/catalog';
const q = process.argv.slice(2).join(' ').toLowerCase();
const hit = (s: string) => !q || s.toLowerCase().includes(q);

console.log('\nSPECIALITIES   "speciality": N   (facility: "specialities": [N, N])');
console.log('  No.  Speciality                                   -> suggested "consultationMode"');
for (const [n, name] of Object.entries(SPECIALITIES)) {
  if (!hit(name)) continue;
  console.log(`  ${n.padStart(3)}  ${name.padEnd(44)} -> ${suggestedModeNumber(name)} (${suggestedModeName(name)})`);
}
console.log('\nCONSULTATION MODES   "consultationMode": N   (or AUTO = the suggested one for the doctor\'s speciality)');
for (const [n, name] of Object.entries(CONSULTATION_MODES)) if (hit(name)) console.log(`  ${n.padStart(3)}  ${name}`);
console.log('\nRule of thumb: Pediatric* -> 2, Gynec* -> 3, Obstetric* -> 4, everything else -> the mode with the same name. Or just write "AUTO".\n');
