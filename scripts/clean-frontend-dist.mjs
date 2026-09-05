import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { manualSync as rimrafSync } from 'rimraf';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(scriptDir, '..');
const output = path.join(project, 'web', 'dist');

if (!output.startsWith(`${project}${path.sep}`)) {
  throw new Error('refusing to clean a path outside this project');
}

try {
  // Force rimraf's platform-specific implementation. Its Windows strategy
  // retries transient locks and falls back to move-then-remove when needed;
  // rimraf's default implementation would delegate back to fs.rmSync.
  rimrafSync(output, {
    maxRetries: 12,
    maxBackoff: 3_000,
  });
} catch (error) {
  throw new Error(`failed to clean ${output} after retries`, { cause: error });
}

// Never let Vite build on top of stale output. If removal was incomplete for
// any reason, fail the build instead of silently shipping the old files.
if (fs.existsSync(output)) {
  throw new Error(`failed to clean ${output}: directory still exists`);
}
