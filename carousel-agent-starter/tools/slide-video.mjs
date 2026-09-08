#!/usr/bin/env node
// Mette un VIDEO dentro una slide del carosello.
//
// Instagram accetta i video dentro un carosello: una slide che si muove, in mezzo a slide ferme,
// e' la cosa che trattiene di piu'. Il renderer da solo fa immagini, non sa inglobare un mp4.
// Questo strumento chiude il buco, in tre passi.
//
// COME SI USA, dall'inizio alla fine:
//
//   1) Crei il segnaposto, cioe' un rettangolo magenta delle dimensioni del video che vuoi mettere:
//      node tools/slide-video.mjs --segnaposto=output/segnaposto.png --w=1000 --h=562
//
//   2) Nel JSON del carosello, la slide che deve contenere il video la scrivi come uno screenshot
//      normale, mettendo il segnaposto al posto dell'immagine:
//      { "type": "screenshot", "heading": "Guardalo muoversi", "imagePath": "output/segnaposto.png",
//        "chrome": false, "imgHeight": 562, "caption": "La clip originale" }
//      Poi renderizzi il carosello come sempre. Esce una slide col rettangolo magenta al posto giusto,
//      titolo e didascalia gia' impaginati.
//
//   3) Incastri il video dentro quel rettangolo:
//      node tools/slide-video.mjs output/mio/slide-04.png video.mp4 output/mio/slide-04.mp4
//
//   4) CANCELLA il PNG della slide (slide-04.png), altrimenti nell'album ti ritrovi sia il rettangolo
//      magenta sia il video. Se ri-renderizzi il carosello il PNG torna: ri-fai il passo 3 e ricancella.
//
// SERVE: ffmpeg installato sul computer (ffmpeg.org, gratis) e la libreria sharp: npm install sharp
//
// Opzioni: --secondi=30 (taglia la clip)  --raggio=26 (angoli arrotondati)
// Una nota sulla durata: se il valore del video e' far vedere che una cosa dura, NON tagliarlo.
// Un mp4 da 30 secondi a 1080x1350 pesa circa 4 MB e Instagram lo regge senza problemi.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('Manca la libreria sharp. Installala con:  npm install sharp');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// colore del bordo preso dal brand kit, cosi' la cornice del video e' del tuo colore
let BORDO = '#22D3EE';
try {
  const brand = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'brand-kit', 'brand.json'), 'utf8'));
  BORDO = (brand.colors && (brand.colors.accent || brand.colors.primary)) || BORDO;
} catch { /* nessun brand kit: resto sul colore di default */ }

const opzioni = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
  const m = a.match(/^--([^=]+)=?(.*)$/);
  return [m[1], m[2] === '' ? true : m[2]];
}));
const posizionali = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// passo 1: genera il rettangolo magenta da dare in pasto al renderer
if (opzioni.segnaposto) {
  const w = Number(opzioni.w || 1000), h = Number(opzioni.h || 562);
  await sharp({ create: { width: w, height: h, channels: 3, background: { r: 255, g: 0, b: 255 } } })
    .png().toFile(String(opzioni.segnaposto));
  console.log(`segnaposto ${w}x${h} -> ${opzioni.segnaposto}`);
  console.log('mettilo come "imagePath" nella slide, con "chrome": false e "imgHeight": ' + h);
  process.exit(0);
}

const [slide, video, destinazione] = posizionali;
if (!slide || !video || !destinazione) {
  console.error('Uso: node tools/slide-video.mjs <slide.png> <video.mp4> <destinazione.mp4> [--secondi=30] [--raggio=26]');
  console.error('Oppure, per creare il segnaposto: node tools/slide-video.mjs --segnaposto=output/segnaposto.png --w=1000 --h=562');
  process.exit(1);
}
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); }
catch { console.error('Manca ffmpeg. Scaricalo da ffmpeg.org e assicurati che si lanci scrivendo "ffmpeg" nel terminale.'); process.exit(1); }

// passo 2: trova il rettangolo magenta dentro la slide renderizzata
const immagine = sharp(slide);
const { data, info } = await immagine.raw().toBuffer({ resolveWithObject: true });
let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels;
    if (data[i] > 230 && data[i + 1] < 60 && data[i + 2] > 230) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
}
if (maxX < 0) {
  console.error('Nessun rettangolo magenta trovato in', slide);
  console.error('Controlla di aver messo il segnaposto come imagePath e di aver ri-renderizzato il carosello.');
  process.exit(1);
}

// la slide esce a doppia risoluzione (2160x2700), il video finale lo vogliamo 1080x1350
const k = 1080 / info.width;
let X = Math.round(minX * k), Y = Math.round(minY * k);
let W = Math.round((maxX - minX + 1) * k), H = Math.round((maxY - minY + 1) * k);
if (W % 2) W--; if (H % 2) H--; if (X % 2) X--; if (Y % 2) Y--; // ffmpeg vuole misure pari
console.log(`riquadro video: ${W}x${H} in posizione ${X},${Y}`);

const tmp = path.join(path.dirname(destinazione), '_tmp_slide_video');
fs.mkdirSync(tmp, { recursive: true });

// passo 3: il fondo, cioe' la slide col magenta coperto di scuro (se il video ha proporzioni diverse non si vede il rosa)
const fondo = path.join(tmp, 'fondo.png');
await sharp(slide).resize(1080, 1350).composite([{
  input: await sharp({ create: { width: W, height: H, channels: 4, background: { r: 11, g: 11, b: 20, alpha: 1 } } }).png().toBuffer(),
  left: X, top: Y,
}]).png().toFile(fondo);

// passo 4: angoli arrotondati e cornice del colore del brand
const R = Number(opzioni.raggio || 26);
const maschera = path.join(tmp, 'maschera.png');
await sharp(Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/><rect x="0" y="0" width="${W}" height="${H}" rx="${R}" ry="${R}" fill="#fff"/></svg>`)).png().toFile(maschera);
const cornice = path.join(tmp, 'cornice.png');
await sharp(Buffer.from(`<svg width="${W}" height="${H}"><rect x="1.75" y="1.75" width="${W - 3.5}" height="${H - 3.5}" rx="${R}" ry="${R}" fill="none" stroke="${BORDO}" stroke-opacity="0.55" stroke-width="3.5"/></svg>`)).png().toFile(cornice);

// passo 5: il video dentro il riquadro, sopra il fondo
const filtro = `[1:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:0x0B0B14,setsar=1[v];` +
  `[v][2:v]alphamerge[vr];` +
  `[0:v]scale=1080:1350,setsar=1[bgv];` +
  `[bgv][vr]overlay=${X}:${Y}:shortest=1[o1];` +
  `[o1][3:v]overlay=${X}:${Y}[out]`;

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', fondo, '-i', video, '-i', maschera, '-loop', '1', '-i', cornice,
  '-filter_complex', filtro, '-map', '[out]', '-map', '1:a?',
  ...(opzioni.secondi ? ['-t', String(opzioni.secondi)] : ['-shortest']),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k',
  '-movflags', '+faststart', destinazione], { stdio: 'inherit' });

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`fatto: ${destinazione} (${Math.round(fs.statSync(destinazione).size / 1024)} KB)`);
console.log(`ora cancella il PNG della slide: ${slide}`);
