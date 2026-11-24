/**
 * Generates unique, synthetic test values for every field set to "AUTO".
 * All values are fake test data - never real people or real registrations.
 */
const FIRST = ['Arjun', 'Priya', 'Rohan', 'Ananya', 'Kiran', 'Meera', 'Vikram', 'Sneha', 'Rahul', 'Divya'];
const LAST = ['Sharma', 'Reddy', 'Nair', 'Iyer', 'Patel', 'Rao', 'Menon', 'Gupta', 'Das', 'Verma'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class Generator {
  private counter = 0;
  private usedPhones = new Set<string>();

  /** runId looks like 20261121-160500 */
  constructor(private runId: string) {}

  private next(): number {
    return ++this.counter;
  }
  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  private digits(n: number): string {
    let s = '';
    for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
    return s;
  }
  private letters(n: number): string {
    let s = '';
    for (let i = 0; i < n; i++) s += LETTERS[Math.floor(Math.random() * 26)];
    return s;
  }
  private get day(): string {
    return this.runId.split('-')[0];
  }
  private get time(): string {
    return this.runId.split('-')[1] ?? '000000';
  }

  /** key is added only when several organizations are created in one run, so names stay unique */
  orgName(key?: string): string {
    return key ? `PW_ORG_${key}_${this.day}_${this.time}` : `PW_ORG_${this.day}_${this.time}`;
  }
  facilityName(key: string): string {
    return `PW_FAC_${key}_${this.day}_${this.time}`;
  }
  /** `<organizationname>@<site>` e.g. pw_org_20261123_173509@facebook.com (website: @website.com) */
  link(orgName: string, site: string): string {
    return `${orgName}@${site}.com`.toLowerCase();
  }
  email(tag: string): string {
    return `pw.${tag}.${this.runId}.${this.next()}@example.com`.toLowerCase();
  }
  /** 10 digits, first digit 6-9 (portal rule) */
  phone(): string {
    let p: string;
    do {
      p = this.pick(['6', '7', '8', '9']) + this.digits(9);
    } while (this.usedPhones.has(p));
    this.usedPhones.add(p);
    return p;
  }
  /** unique, <= 20 chars, letters/numbers only */
  registrationNumber(prefix: string): string {
    return `${prefix}${this.time}${this.next()}${this.digits(2)}`.slice(0, 20);
  }
  /** doctor registration: 5-20 chars, letters, numbers, / and - */
  doctorRegNumber(): string {
    return `PWR/${this.day.slice(2)}/${this.digits(5)}${this.next()}`.slice(0, 20);
  }
  /** ABCDE1234F */
  pan(): string {
    return this.letters(5) + this.digits(4) + this.letters(1);
  }
  /** ABCD12345E */
  tan(): string {
    return this.letters(4) + this.digits(5) + this.letters(1);
  }
  /** 15 chars: state code + PAN + entity + 'Z' + checksum */
  gstin(stateCode = '36'): string {
    const base = `${stateCode}${this.pan()}1Z`;
    return base + gstinChecksum(base);
  }
  firstName(): string {
    return this.pick(FIRST);
  }
  lastName(): string {
    return this.pick(LAST);
  }
  /** YYYY-MM-DD, age 30-60 */
  dateOfBirth(): string {
    const year = new Date().getFullYear() - (30 + Math.floor(Math.random() * 30));
    const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
    const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  description(speciality: string): string {
    return `Experienced ${speciality} specialist (synthetic test profile).`;
  }
}

export function gstinChecksum(first14: string): string {
  let sum = 0;
  for (let i = 0; i < first14.length; i++) {
    const v = GST_CHARS.indexOf(first14[i]);
    const prod = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(prod / 36) + (prod % 36);
  }
  return GST_CHARS[(36 - (sum % 36)) % 36];
}
