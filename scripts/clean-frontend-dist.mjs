import fs from 'node:fs';
import path from 'node:path';

const output = path.resolve('web/dist');
const project = path.resolve('.');
if (!output.startsWith(`${project}${path.sep}`)) throw new Error('refusing to clean a path outside this project');
fs.rmSync(output, { recursive: true, force: true });
