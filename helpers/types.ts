export interface TestData {
  execution?: { mode?: 'CREATE' | 'REUSE_LATEST' };
  /** One or more organizations. (A legacy single "organization" object is wrapped into this list on load.) */
  organizations: any[];
  facilities: any[];
  doctors: any[];
}
