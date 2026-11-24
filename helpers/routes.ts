import fs from 'fs';
import path from 'path';
import { ROOT } from './run-context';

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'Admin_hub', 'environment.json'), 'utf-8'));
export const routes: Record<string, string> = cfg.routes;
export const route = (name: string, id?: string) => routes[name].replace('{id}', id ?? '');
