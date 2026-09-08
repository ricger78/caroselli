#!/usr/bin/env node
// Da un carosello Instagram alla sua versione LinkedIn, senza riscrivere niente.
//
// Su LinkedIn la slide finale con la chiamata all'azione ("commenta X e ti mando la guida")
// non ha senso: li' non c'e' l'automazione dei commenti. Quindi si toglie, e l'ultima slide
// rimasta chiude con la frase di opinione, con un'icona al posto dell'evidenziatore.
//
// Uso:
//   node tools/versione-linkedin.mjs <carosello.json>
//   node tools/versione-linkedin.mjs output/mio-carosello.json --icona=💬
//
// Scrive un file nuovo accanto all'originale, con il suffisso -linkedin.
// Poi lo renderizzi come qualsiasi altro: node renderer/render.mjs output/mio-carosello-linkedin.json

import fs from 'node:fs';
import path from 'node:path';

const argomenti = process.argv.slice(2);
const file = argomenti.find((a) => !a.startsWith('--'));
const icona = (argomenti.find((a) => a.startsWith('--icona=')) || '--icona=💬').split('=')[1];

if (!file) {
  console.error('Uso: node tools/versione-linkedin.mjs <carosello.json> [--icona=💬]');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error('File non trovato:', file);
  process.exit(1);
}

const dati = JSON.parse(fs.readFileSync(file, 'utf8'));
const slidePrima = (dati.slides || []).length;

// handle LinkedIn: se il carosello non ne specifica già uno suo, prendi quello brand-kit/brand.json -> handles.linkedin
if (!dati.handle) {
  const brandPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'brand-kit', 'brand.json');
  try {
    const brand = JSON.parse(fs.readFileSync(brandPath, 'utf8'));
    const handleLinkedIn = brand.handles?.linkedin;
    if (handleLinkedIn) dati.handle = handleLinkedIn;
  } catch { /* niente brand-kit: resta il default del renderer */ }
}

dati.name = (dati.name || path.basename(file, '.json')) + '-linkedin';
dati.slides = (dati.slides || []).filter((s) => s.type !== 'cta');

const ultima = dati.slides[dati.slides.length - 1];
if (ultima && ultima.takeaway) {
  ultima.takeaway = String(ultima.takeaway).replace(/==/g, '');
  ultima.takeawayIcon = icona;
}

const destinazione = path.join(path.dirname(file), path.basename(file, '.json') + '-linkedin.json');
fs.writeFileSync(destinazione, JSON.stringify(dati, null, 2) + '\n', 'utf8');

console.log(`scritto ${destinazione}`);
console.log(`slide: ${slidePrima} su Instagram, ${dati.slides.length} su LinkedIn`);
console.log(`ora renderizza: node renderer/render.mjs ${destinazione}`);
