import mysql, { Pool } from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * READ-ONLY connection to the OpenMRS MySQL database, used only to VERIFY what the UI created.
 * Credentials: DB_* variables in process.env / Playwright-tests/.env win; otherwise they are read from the
 * single env-registry (../env-registry/.env, BAHMNI_OPENMRS_DB_*) so no password is copied into this project.
 */
const REGISTRY = path.resolve(__dirname, '..', '..', '..', 'env-registry', '.env');

function registryValues(): Record<string, string> {
  try { return dotenv.parse(fs.readFileSync(REGISTRY)); } catch { return {}; }
}

export function dbConfig() {
  const reg = registryValues();
  const pick = (own: string, regKey: string, fallback = '') => process.env[own] ?? reg[regKey] ?? fallback;
  return {
    host: pick('DB_HOST', 'OPENMRS_MYSQL_HOST', '127.0.0.1'),
    port: Number(pick('DB_PORT', 'OPENMRS_MYSQL_PORT', '3306')),
    user: pick('DB_USER', 'BAHMNI_OPENMRS_DB_USER'),
    password: pick('DB_PASSWORD', 'BAHMNI_OPENMRS_DB_PASSWORD'),
    database: pick('DB_NAME', 'BAHMNI_OPENMRS_DB_NAME', 'openmrs'),
  };
}

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const c = dbConfig();
    if (!c.user || !c.password) throw new Error('DB credentials missing: set DB_USER/DB_PASSWORD or provide env-registry/.env');
    pool = mysql.createPool({ ...c, connectionLimit: 2, dateStrings: true, timezone: 'Z' });
    // every connection is read-only: the DB layer can never create or change a record
    pool.on('connection', (conn: any) => { conn.query('SET SESSION TRANSACTION READ ONLY'); });
  }
  return pool;
}

/** Run a SELECT. Anything else is rejected before it reaches the database. */
export async function select<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (!/^\s*select\b/i.test(sql)) throw new Error('db-connection: only SELECT statements are allowed');
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

export async function closePool() {
  if (pool) { await pool.end(); pool = null; }
}
