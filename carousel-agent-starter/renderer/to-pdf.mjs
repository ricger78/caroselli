#!/usr/bin/env node
// Impacchetta le slide PNG di un carosello in un PDF unico (per LinkedIn document post).
// 1 slide = 1 pagina 1080x1350 (4:5). Se ffmpeg è installato comprime in JPEG (PDF leggero <10MB),
// altrimenti incorpora i PNG originali (più pesante, ma funziona lo stesso).
// Uso: node to-pdf.mjs <cartella-slide> [--out=file.pdf]
//   <cartella-slide> = cartella con slide-01.png, slide-02.png, ... (no MP4: su LinkedIn sono statici)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const outFlag = args.find((a) => a.startsWith('--out='));
if (!dir) { console.error('Uso: node to-pdf.mjs <cartella-slide> [--out=file.pdf]'); process.exit(1); }
const slides = fs.readdirSync(dir).filter((f) => /^slide-\d+\.png$/i.test(f)).sort();
if (!slides.length) { console.error('Nessuna slide-*.png in', dir); process.exit(1); }
const out = outFlag ? outFlag.split('=')[1] : path.join(dir, path.basename(path.resolve(dir)) + '.pdf');
const W = 1080, H = 1350;

// ffmpeg c'è? → downscala PNG→JPEG q85 (le slide sono renderizzate a 2x). Non c'è? → PNG diretti.
let hasFfmpeg = true;
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { hasFfmpeg = false; }
const tmp = hasFfmpeg ? fs.mkdtempSync(path.join(os.tmpdir(), 'caropdf-')) : null;
if (!hasFfmpeg) console.warn('⚠️  ffmpeg non trovato: incorporo i PNG originali (PDF più pesante).');

const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false });
doc.pipe(fs.createWriteStream(out));
for (const f of slides) {
  let img = path.join(dir, f);
  if (hasFfmpeg) {
    const jpg = path.join(tmp, f.replace('.png', '.jpg'));
    execFileSync('ffmpeg', ['-y', '-i', img, '-vf', `scale=${W}:${H}:flags=lanczos`, '-q:v', '4', jpg], { stdio: 'ignore' });
    img = jpg;
  }
  doc.addPage({ size: [W, H], margin: 0 });
  doc.image(img, 0, 0, { width: W, height: H });
}
doc.end();
console.log('PDF:', out, '(' + slides.length + ' pagine)');
