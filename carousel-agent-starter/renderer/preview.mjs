#!/usr/bin/env node
// Anteprima veloce: renderizza il carosello e apre la cartella con le slide.
// Uso: node preview.mjs <carosello.json>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = process.argv[2];
if (!jsonPath) { console.error('Uso: node preview.mjs <carosello.json>'); process.exit(1); }

// 1. renderizza (stesso identico render di render.mjs)
execFileSync(process.execPath, [path.join(__dirname, 'render.mjs'), jsonPath], { stdio: 'inherit' });

// 2. apri la cartella con le slide nel file manager (Windows / Mac / Linux)
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const outDir = path.join(__dirname, '..', 'output', data.name || 'carosello');
const opener = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open';
spawn(opener, [outDir], { detached: true, stdio: 'ignore' }).unref();
console.log('\nAnteprima aperta:', outDir);
