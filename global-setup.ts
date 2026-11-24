import dotenv from 'dotenv';
import path from 'path';
import { newRunId, runDir } from './helpers/run-context';
import { prepareRun } from './helpers/data-loader';

export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, '.env') });
  for (const k of ['BASE_URL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD']) {
    if (!process.env[k]) throw new Error(`Missing ${k}. Copy .env.example to .env and fill it in.`);
  }
  const runId = newRunId();
  process.env.RUN_ID = runId;       // inherited by the test workers
  runDir(runId);
  prepareRun(runId);                // validates JSON + resolves AUTO, fails fast
  console.log(`\n▶ Run ${runId}  (output/RUN_${runId})\n`);
}
