/** Number -> name lookup for the two lists (helpers/specialities.ts, helpers/consultation-modes.ts). */
import { SPECIALITIES } from './specialities';
import { CONSULTATION_MODES } from './consultation-modes';

export { SPECIALITIES, CONSULTATION_MODES };
export const DEFAULT_SPECIALITY = 2;        // "General practice"
export const DEFAULT_CONSULTATION_MODE = 1; // "General Medicine"

export type CatalogKind = 'speciality' | 'consultationMode';
const LISTS: Record<CatalogKind, Record<number, string>> = { speciality: SPECIALITIES, consultationMode: CONSULTATION_MODES };
const max = (k: CatalogKind) => Math.max(...Object.keys(LISTS[k]).map(Number));

/** Number (or numeric text) -> name. Any other text is returned as typed. Throws on an unknown number. */
export function fromCatalog(kind: CatalogKind, v: unknown): string {
  const s = String(v ?? '').trim();
  if (/^\d+$/.test(s)) {
    const name = LISTS[kind][Number(s)];
    if (!name) throw new Error(`${kind} number ${s} is not in the list (1 to ${max(kind)}). Run: npm run list:catalog`);
    return name;
  }
  return s;
}

/** Problem text for the validator, or '' if fine (known number, or any non-empty name). */
export function catalogProblem(kind: CatalogKind, v: unknown): string {
  const s = String(v ?? '').trim();
  if (!s) return 'is empty';
  if (/^\d+$/.test(s) && !LISTS[kind][Number(s)]) return `number ${s} is not in the list (1 to ${max(kind)})`;
  return '';
}

const num = (list: Record<number, string>, name: string) => Number(Object.keys(list).find((k) => list[Number(k)] === name)) || undefined;

/**
 * Same rule the Admin Hub uses (consultationMode.ts, matchCoreModeByKeyword): pediatric -> Pediatrics, obstetric -> Obstetrics,
 * gynec -> Gynecology; any other speciality has an extra mode with its own name (fallback: General Medicine).
 */
export function suggestedModeName(specialityName: string): string {
  const l = specialityName.toLowerCase();
  if (/paediatric|pediatric/.test(l)) return 'Pediatrics';
  if (/obstetric/.test(l)) return 'Obstetrics';
  if (/gynaec|gynec/.test(l)) return 'Gynecology';
  return num(CONSULTATION_MODES, specialityName) ? specialityName : 'General Medicine';
}
export const suggestedModeNumber = (specialityName: string) => num(CONSULTATION_MODES, suggestedModeName(specialityName))!;
