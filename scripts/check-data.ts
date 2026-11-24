/** npm run check:data  -> validates test-data.json without opening a browser */
import { loadRawData } from '../helpers/data-loader';
import { validateTestData, adviseTestData } from '../helpers/validator';
import { ROOT } from '../helpers/run-context';

const problems = validateTestData(loadRawData(), ROOT);
if (problems.length) {
  console.error('❌ test-data.json has problems:\n - ' + problems.join('\n - '));
  process.exit(1);
}
for (const w of adviseTestData(loadRawData())) console.warn('⚠️  ' + w);
console.log('✅ test-data.json is valid');
