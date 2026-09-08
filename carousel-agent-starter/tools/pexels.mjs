#!/usr/bin/env node
// Foto reali da Pexels per le slide con immagine (bgImagePath / photoPath / frameImagePath).
//
// Uso:
//   node tools/pexels.mjs "<query>" <file-destinazione> [--orientation=portrait|landscape|square] [--index=1]
//
// Esempio:
//   node tools/pexels.mjs "professionista scrivania stanco" output/ca001-mindset-vs-metodo-assets/loop.jpg
//
// Serve PEXELS_API_KEY in .env (vedi .env.example). Chiave gratuita: https://www.pexels.com/api/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try { process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch { /* nessun .env: ok se la chiave arriva dall'ambiente */ }

const KEY = process.env.PEXELS_API_KEY;
if (!KEY) {
  console.error('Manca PEXELS_API_KEY. Copia .env.example in .env e mettici la tua chiave (https://www.pexels.com/api/).');
  process.exit(1);
}

const args = process.argv.slice(2);
const query = args.find((a) => !a.startsWith('--'));
const dest = args.filter((a) => !a.startsWith('--'))[1];
const orientation = (args.find((a) => a.startsWith('--orientation=')) || '--orientation=portrait').split('=')[1];
const index = Number((args.find((a) => a.startsWith('--index=')) || '--index=1').split('=')[1]) - 1;

if (!query || !dest) {
  console.error('Uso: node tools/pexels.mjs "<query>" <file-destinazione> [--orientation=portrait|landscape|square] [--index=1]');
  process.exit(1);
}

const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=${Math.max(index + 1, 10)}`;
const res = await fetch(url, { headers: { Authorization: KEY } });
if (!res.ok) {
  console.error(`Pexels ha risposto ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
const photo = data.photos?.[index];
if (!photo) {
  console.error(`Nessun risultato per "${query}" (orientation=${orientation}, index=${index + 1}). Foto trovate: ${data.photos?.length || 0}.`);
  process.exit(1);
}

const imgRes = await fetch(photo.src.large2x || photo.src.original);
const buf = Buffer.from(await imgRes.arrayBuffer());
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, buf);

console.log(`✓ ${dest}`);
console.log(`  Foto di ${photo.photographer} su Pexels — ${photo.url}`);
console.log('  (credito non obbligatorio per uso social, ma è buona pratica citarlo se il post lo prevede)');
