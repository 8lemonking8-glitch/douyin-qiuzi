import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('web/dist');
const assetDir = path.join(distDir, 'assets');
const html = fs.readFileSync(path.join(distDir, 'admin.html'), 'utf8');
const adminBundle = html.match(/assets\/(admin-[^"']+\.js)/)?.[1];

assert.ok(adminBundle, 'admin.html does not reference a built admin JavaScript bundle');
const content = fs.readFileSync(path.join(assetDir, adminBundle), 'utf8');
assert.match(content, /abandon/, 'question bank was not embedded in the desktop frontend bundle');
assert.doesNotMatch(content, /questions\.json/, 'desktop frontend must not fetch a separate questions.json file at runtime');

console.log('PASS: packaged frontend embeds the question bank');
