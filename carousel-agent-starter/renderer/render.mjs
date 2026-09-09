#!/usr/bin/env node
// Carousel Renderer — da JSON a slide PNG 1080x1350. Tema DARK + filigrana tech.
// Colori, font e handle si personalizzano in brand-kit/brand.json (vedi brand-kit/README.md).
// Uso: node render.mjs <carosello.json> [--out=cartella]
// JSON: { name, handle?, slides:[ {type, ...props} ] }
// Tipi: cover | content | checklist | stat | quote | cta
// Brand mark = logo opzionale (brand-kit/logo.png) oppure orb gradiente + username. Dipendenze: playwright.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const W = 1080, H = 1350;

// ---- BRAND KIT: handle, colori e font letti da brand-kit/brand.json (fallback: palette demo) ----
const BRAND_PATH = path.join(__dirname, '..', 'brand-kit', 'brand.json');
let BRAND = {};
try { BRAND = JSON.parse(fs.readFileSync(BRAND_PATH, 'utf8')); } catch { console.warn('⚠️  brand-kit/brand.json non trovato o non valido: uso la palette demo.'); }
const BC = BRAND.colors || {};
const C1 = BC.primary || '#FF3DBE';        // inizio gradiente brand
const C2 = BC.secondary || '#FF7A3D';      // centro gradiente brand
const C3 = BC.accent || '#FFD23D';         // fine gradiente + accenti (frecce, callout, occhielli)
const HL = BC.highlight || '#D6FF3D';      // evidenziatore ==testo==
const NOTE = BC.note || '#3DFFB5';         // box informativo "note"
const BG = BC.background || '#0F0F1A';     // fondo slide
const BGD = BC.backgroundDark || '#070710';// fondo extra-scuro (slide dark-bg)
const BT = BRAND.typography || {};
const F1 = BT.display || 'Plus Jakarta Sans';   // titoli / numeri / bottoni
const F2 = BT.body || 'Space Grotesk';          // testo corrente
const F3 = BT.handwritten || 'Caveat';          // firme / note a mano
const F4 = BT.cta || F1;                        // testo/bottoni della call-to-action (fallback: display)
// hex → rgba con alpha (per glow e ombre derivate dai colori brand)
const A = (hex, a) => { const h = String(hex).replace('#', ''); const x = h.length === 3 ? h.split('').map((c) => c + c).join('') : h; const n = parseInt(x, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

const args = process.argv.slice(2);
const jsonPath = args.find((a) => !a.startsWith('--'));
const outFlag = args.find((a) => a.startsWith('--out='));
if (!jsonPath) { console.error('Uso: node render.mjs <carosello.json> [--out=cartella]'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const slides = data.slides || [];
const jsonDir = path.dirname(path.resolve(jsonPath));

// Immagini locali → data URI base64 (così caricano sempre, anche con setContent senza base URL).
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
function imgURI(p) {
  if (!p) return '';
  if (/^(data:|https?:)/.test(p)) return p;                 // già URI/URL → lascia com'è
  const abs = path.isAbsolute(p) ? p : path.join(jsonDir, p); // relativo = rispetto al JSON
  const mime = MIME[path.extname(abs).toLowerCase()] || 'image/png';
  return `data:${mime};base64,` + fs.readFileSync(abs).toString('base64');
}
const HANDLE = (data.handle || BRAND.handle || '@iltuohandle').replace(/^@/, '');
// hideCounter: true (in cima al JSON) -> niente contatore "01 / 01" in alto a destra: serve alle creativita' singole (una sola immagine)
const HIDE_COUNTER = data.hideCounter === true;
// logo opzionale: brand-kit/logo.png (se c'è); altrimenti orb gradiente coi colori brand
const LOGO_PATH = path.join(__dirname, '..', 'brand-kit', 'logo.png');
const MARK = fs.existsSync(LOGO_PATH) ? 'data:image/png;base64,' + fs.readFileSync(LOGO_PATH).toString('base64') : '';
// @font-face base64, no rete. Font custom: metti un fonts.css in brand-kit/ e vince lui
const BRAND_FONTS = path.join(__dirname, '..', 'brand-kit', 'fonts.css');
const FONTS = fs.readFileSync(fs.existsSync(BRAND_FONTS) ? BRAND_FONTS : path.join(__dirname, 'assets', 'fonts.css'), 'utf8');
// font handwritten (Caveat) per firme a mano — embeddato base64, no rete
const CAVEAT = 'data:font/ttf;base64,' + fs.readFileSync(path.join(__dirname, 'assets', 'caveat.ttf')).toString('base64');
const outDir = outFlag ? outFlag.split('=')[1] : path.join(__dirname, '..', 'output', data.name || 'carosello');
// texture di fondo opzionale (generata, GPT Image 2 / WaveSpeed) — arricchisce le slide scure
const TEX = data.texture ? imgURI(data.texture) : '';
fs.mkdirSync(outDir, { recursive: true });
// pulisci slide vecchie: se il carosello passa da N a meno slide, gli avanzi non restano (no duplicati nell'album)
for (const f of fs.readdirSync(outDir)) { if (/^slide-\d+\.(png|mp4)$/i.test(f)) fs.rmSync(path.join(outDir, f), { force: true }); }

const hl = (s = '') => String(s)
  .replace(/__(.+?)__/g, '<span class="bw">$1</span>')      // __testo__ -> grassetto bianco (leggibilita')
  .replace(/==(.+?)==/g, '<span class="mhl">$1</span>')   // ==testo== → evidenziatore giallo
  .replace(/\*\*(.+?)\*\*/g, '<span class="grad">$1</span>') // **testo** → parola accento (gradiente)
  .replace(/\n/g, '<br>');
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hlEsc = (s = '') => hl(esc(s));

const CSS = `
@font-face{font-family:'${F3}';src:url('${CAVEAT}') format('truetype');font-weight:400 700;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
.canvas{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:${BG};
  font-family:'${F2}',system-ui,sans-serif;color:#FAFAFA}
/* fondo più scuro per slide con contenuto chiaro (es. screenshot bianchi) — risaltano di più */
.canvas.dark-bg{background:${BGD}}
.canvas.transp{background:transparent}
.dark-bg::before{opacity:.4}
/* texture di fondo (GPT Image 2) — arricchisce il nero senza gradienti, sottile */
.bgtex{position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover;opacity:.5;mix-blend-mode:screen}
.canvas::before{content:'';position:absolute;inset:0;z-index:0;background:
  radial-gradient(900px 620px at 88% -10%, ${A(C2,.22)}, transparent 62%),
  radial-gradient(820px 600px at -8% 108%, ${A(C3,.15)}, transparent 60%)}
.canvas::after{content:'';position:absolute;inset:0;z-index:0;opacity:.45;
  background-image:radial-gradient(rgba(255,255,255,.05) 1.4px, transparent 1.4px);background-size:34px 34px;
  -webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,.65),transparent 72%)}
.hud{position:absolute;inset:0;z-index:1;pointer-events:none}
.pad{position:absolute;inset:0;padding:96px;display:flex;flex-direction:column;z-index:2}
.top{display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;align-items:center;gap:14px}
.mark{height:44px;width:auto;filter:drop-shadow(0 6px 18px ${A(C2,.45)})}
.orb{width:44px;height:44px;border-radius:50%;flex:0 0 auto;background:linear-gradient(135deg,${C1},${C3});box-shadow:0 6px 18px ${A(C2,.45)}}
.uname{font-family:'${F1}';font-weight:800;font-size:32px;letter-spacing:-.5px;color:#FAFAFA}
.num{font-weight:500;color:#7B7790;font-size:28px;letter-spacing:3px}
.top-r{display:flex;align-items:center;gap:22px}
.blogo{height:30px;width:auto;opacity:.82}
.spacer{flex:1}
.grad{background:linear-gradient(105deg,${C1} 0%,${C2} 45%,${C3} 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.topic{text-transform:uppercase;letter-spacing:5px;font-weight:600;color:#8B86A0;font-size:30px;margin-bottom:30px}
.hook{font-family:'${F1}';font-size:106px;font-weight:800;line-height:1.05;letter-spacing:0px;color:#fff}
.heading{font-family:'${F1}';font-size:68px;font-weight:800;line-height:1.1;letter-spacing:0px;margin-bottom:38px;color:#fff}
.body{font-size:42px;font-weight:400;line-height:1.4;color:#B9B6C9}
.list{display:flex;flex-direction:column;gap:36px;margin-top:8px}
.item{display:flex;gap:30px;align-items:flex-start;font-size:44px;font-weight:500;line-height:1.25;color:#EDECF4}
.dot{width:62px;height:62px;border-radius:18px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;
  color:#fff;font-weight:700;font-size:32px;background:linear-gradient(135deg,${C1},${C3});box-shadow:0 8px 30px ${A(C1,.4)}}
.dot.x{background:linear-gradient(135deg,#3a3950,#26263a);color:#9a96b0;box-shadow:none}
.dot.num{font-family:'${F1}';font-weight:800;font-size:34px}
.list.steps{gap:30px}
.list.steps .item{font-size:39px}
.statv{font-family:'${F1}';font-size:220px;font-weight:800;letter-spacing:-2px;line-height:.92}
.statl{font-size:48px;font-weight:500;color:#B9B6C9;margin-top:24px;line-height:1.25}
.quote{font-family:'${F1}';font-size:64px;font-weight:700;line-height:1.2;letter-spacing:0px;color:#fff}
.quote .mark{font-size:150px;line-height:0;font-weight:800}
.attr{font-size:38px;font-weight:600;color:#8B86A0;margin-top:50px}
.cta{font-family:'${F4}';font-size:62px;font-weight:800;line-height:1.12;letter-spacing:-.5px;margin-bottom:48px;color:#fff}
.btn{display:inline-block;background:linear-gradient(105deg,${C1},${C2},${C3});color:#fff;border-radius:999px;
  padding:24px 42px;font-size:32px;font-weight:700;font-family:'${F4}';box-shadow:0 10px 34px ${A(C2,.38)}}
.cta-handle{font-size:36px;font-weight:600;color:#8B86A0;margin-top:48px}
.full{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
/* ---- cover con SFONDO immagine (AI o foto) + overlay testo/brand controllato ---- */
.cover-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
@keyframes vortspin{from{transform:scale(1.32) rotate(0deg)}to{transform:scale(1.32) rotate(360deg)}}
.cover-bg.spin{transform:scale(1.32);transform-origin:50% 50%;animation:vortspin 26s linear infinite}
/* Ken Burns delicato: lo sfondo della cover si avvicina lentamente quando è animata (video). Frame 0 = scale(1), neutro. */
@keyframes kenburns{from{transform:scale(1)}to{transform:scale(1.12)}}
.anim.is-cover .cover-bg:not(.spin){transform-origin:50% 42%;animation:kenburns 16s ease-out forwards}
.cover-scrim{position:absolute;inset:0;z-index:1;pointer-events:none;background:
  linear-gradient(180deg, rgba(7,7,13,.50) 0%, rgba(7,7,13,.12) 28%, rgba(7,7,13,.58) 68%, rgba(7,7,13,.90) 100%),
  radial-gradient(130% 78% at 50% 122%, ${A(C1,.30)}, transparent 60%)}
/* velo scuro sfumato in BASSO dietro il titolo (opt-in textFade) — stacca la scritta dallo sfondo pixel */
.cover-fade-bottom{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent 42%,rgba(7,7,13,.42) 66%,rgba(7,7,13,.60) 100%)}
/* cover-immagine con titolo IN ALTO (personaggio sotto, cielo sopra): scrim scuro in cima per leggibilità */
.cover-scrim.top{background:
  linear-gradient(180deg, rgba(7,7,13,.80) 0%, rgba(7,7,13,.46) 26%, rgba(7,7,13,.08) 52%, transparent 86%)}
.has-bg .uname,.has-bg .num,.has-bg .topic{text-shadow:0 2px 18px rgba(0,0,0,.55)}
.has-bg .hook{text-shadow:0 6px 40px rgba(0,0,0,.55)}
/* su cover-foto il testo gradiente (es. **parola**) non stacca dallo sfondo.
   DEFAULT = GLOW BIANCO (per sfondi scuri). Su sfondi CHIARI usa titleFx:"shadow" → ombra scura. */
.has-bg .hook .grad{filter:drop-shadow(0 0 16px rgba(255,255,255,.95)) drop-shadow(0 0 6px rgba(255,255,255,.85))}
.has-bg .hook.tfx-shadow .grad{filter:drop-shadow(0 2px 4px rgba(0,0,0,.6)) drop-shadow(0 1px 2px rgba(0,0,0,.7))}
/* ---- slide FULL-BLEED: immagine a tutto schermo + testo bold sovrapposto (stile news, mattfarmerai) ---- */
.cover-scrim.strong{background:
  linear-gradient(180deg, rgba(6,6,12,.46) 0%, rgba(6,6,12,.04) 30%, rgba(6,6,12,.50) 58%, rgba(6,6,12,.97) 100%),
  radial-gradient(120% 70% at 50% 120%, ${A(C1,.30)}, transparent 62%)}
.img-dim{position:absolute;inset:0;z-index:1;pointer-events:none}
.bg-pad{justify-content:flex-end}
/* full-bleed con testo in ALTO (stile yellowtech): scrim scuro in alto, immagine domina sotto */
.is-bg.bg-top .cover-scrim.strong{background:
  linear-gradient(180deg, rgba(6,6,12,.96) 0%, rgba(6,6,12,.58) 26%, rgba(6,6,12,.08) 52%, transparent 100%),
  radial-gradient(120% 72% at 50% -18%, ${A(C1,.30)}, transparent 62%)}
.bg-top .bg-pad{justify-content:flex-start}
.bg-topic{font-family:'${F1}';font-weight:800;font-size:27px;letter-spacing:3px;text-transform:uppercase;color:${C3};margin-bottom:20px;text-shadow:0 2px 16px rgba(0,0,0,.6)}
.bgh{font-family:'${F1}';font-weight:800;font-size:76px;line-height:1.08;letter-spacing:0px;color:#fff;margin-bottom:26px;text-shadow:0 6px 40px rgba(0,0,0,.65)}
.bgb{font-size:40px;line-height:1.34;font-weight:600;color:#F2F1F8;text-shadow:0 3px 24px rgba(0,0,0,.8)}
.bgli{font-size:39px;line-height:1.3;font-weight:600;color:#F2F1F8;text-shadow:0 3px 24px rgba(0,0,0,.8);display:flex;gap:18px;margin-bottom:18px;align-items:flex-start}
.bgli .bgdot{flex:0 0 auto;width:18px;height:18px;border-radius:50%;margin-top:14px;background:linear-gradient(135deg,${C1},${C3});box-shadow:0 0 16px ${A(C3,.7)}}
.is-bg .grad{-webkit-text-fill-color:#fff;color:#fff;background:none}
/* ---- evidenziatore giallo (parole/date chiave, stile yellowtech) ---- */
.mhl{background:${HL};color:#15160A;font-weight:800;white-space:nowrap;padding:1px 13px;border-radius:8px;box-shadow:0 4px 22px ${A(HL,.30)}}
/* ---- slide STORY: racconto + immagine reale SCONTORNATA + callout con freccia a mano ---- */
.story-gap{height:118px}
/* byline autore (slide-opinione): miniatura foto circolare + nome + ruolo */
.story-author{position:relative;z-index:3;display:flex;align-items:center;gap:20px;margin-bottom:30px}
.story-author img{width:84px;height:84px;border-radius:50%;object-fit:cover;border:3px solid ${A(C3,.55)};box-shadow:0 8px 26px ${A(C1,.4)}}
.sa-name{font-family:'${F1}';font-weight:800;font-size:36px;color:#fff;line-height:1.12}
.sa-role{font-family:'${F1}';font-weight:700;font-size:24px;letter-spacing:2px;text-transform:uppercase;color:${C3};margin-top:3px}
.story .bg-topic{position:relative;z-index:3;margin-bottom:18px}
.story .heading{position:relative;z-index:3;font-size:66px;line-height:1.08;letter-spacing:0px;max-width:88%;text-wrap:balance}
.story .body{position:relative;z-index:3;max-width:76%;margin-top:24px;font-size:37px;line-height:1.46;color:#E9E8F2}
.story.has-side .body{max-width:50%}
/* immagine reale SCONTORNATA: bleed dal bordo, ancorata in basso, con velo sfumato che la fonde nel fondo scuro */
.cutout{position:absolute;bottom:0;z-index:2;height:780px;object-fit:contain;object-position:bottom;filter:drop-shadow(0 30px 70px rgba(0,0,0,.75)) drop-shadow(0 0 60px ${A(C1,.18)})}
.cut-right{right:-100px}
.cut-left{left:-70px}
.story::after{content:'';position:absolute;left:0;right:0;bottom:0;height:300px;z-index:3;pointer-events:none;background:linear-gradient(180deg,transparent,${A(BG,.92)})}
/* elemento/sticker (comic ecc.) su fondo nero → blend screen lo "scontorna", glow */
.story-obj{position:absolute;z-index:2;mix-blend-mode:screen;filter:drop-shadow(0 0 44px ${A(C3,.22)});
  -webkit-mask-image:radial-gradient(closest-side at 50% 50%, #000 62%, transparent 96%);mask-image:radial-gradient(closest-side at 50% 50%, #000 62%, transparent 96%)}
.obj-right{right:30px;bottom:300px;width:430px}
.obj-left{left:30px;bottom:300px;width:430px}
/* callout = annotazione deliberata con freccia a mano verso un dato */
.story-callout{position:absolute;left:96px;bottom:130px;right:auto;z-index:5;display:flex;flex-direction:column;align-items:flex-start;gap:4px;max-width:380px}
.sc-arrow{width:110px;height:80px;margin-left:38px}
.sc-box{background:rgba(18,20,34,.72);border:1.5px solid ${A(C3,.5)};border-radius:22px;padding:18px 30px;backdrop-filter:blur(8px);
  font-family:'${F1}';font-weight:800;font-size:40px;line-height:1.08;color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.45), 0 0 40px ${A(C3,.16)}}
.sc-box .grad{font-size:1.18em}
/* cover mockup: hook in alto, immagine nitida incorniciata sotto */
.cover-mock .topic{margin-bottom:22px}
.cover-mock .hook{font-size:90px;line-height:1.06;letter-spacing:0px;margin-bottom:22px}
.cover-sub{font-size:35px;line-height:1.32;font-weight:500;color:#BDBAD0;max-width:84%;margin-top:22px;margin-bottom:40px}
.cover-mock .window{margin-top:4px}
/* ---- slide screenshot (immagine documentale incorniciata in una finestra brand) ---- */
.shot-h{font-family:'${F1}';font-size:58px;font-weight:800;line-height:1.1;letter-spacing:0px;margin-bottom:36px;color:#fff}
.window{border-radius:28px;overflow:hidden;border:1px solid rgba(255,255,255,.14);background:#0E0E18;
  box-shadow:0 34px 90px rgba(0,0,0,.55), 0 0 0 1px ${A(C2,.10)}, 0 20px 70px ${A(C1,.24)}}
.wbar{height:66px;display:flex;align-items:center;gap:18px;padding:0 28px;background:linear-gradient(180deg,#16161F,#0E0E18);border-bottom:1px solid rgba(255,255,255,.08)}
.wdots{display:flex;gap:12px}
.wdot{width:17px;height:17px;border-radius:50%}
.wpill{flex:1;height:40px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
  display:flex;align-items:center;gap:13px;padding:0 24px;font-family:'${F2}';font-size:25px;font-weight:500;color:#9a96b0}
.wpill svg{width:23px;height:23px;flex:0 0 auto;opacity:.7}
.wimg{display:block;width:100%;height:600px;object-fit:cover;object-position:top center;background:#fff}
.photo-card{border-radius:32px;border:1px solid rgba(255,255,255,.10)}
.photo-card .wimg{background:#0E0E18}
.inset{margin-top:46px}
.inset .window{box-shadow:0 24px 60px rgba(0,0,0,.5)}
.window{position:relative}
/* riflesso speculare sotto il box immagine (opt-in reflect:true) — effetto card che galleggia su una superficie lucida */
.window.reflect{-webkit-box-reflect:below 10px linear-gradient(to bottom, rgba(255,255,255,.42), rgba(255,255,255,0) 52%)}
/* chip "app" con logo reale (es. Slack) appoggiato sull'immagine */
.app-chip{position:absolute;top:26px;left:26px;z-index:4;display:flex;align-items:center;gap:15px;
  background:rgba(13,13,20,.52);border:1px solid rgba(255,255,255,.20);border-radius:20px;padding:14px 24px 14px 16px;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 12px 34px rgba(0,0,0,.45)}
.app-chip img{width:48px;height:48px;display:block}
.app-chip span{font-family:'${F1}';font-weight:800;font-size:36px;letter-spacing:-.5px;color:#fff}
/* box informativo VERDE (colore "note" del brand kit) — sfumatura extra, solo dove serve (campo "note") */
.note{position:absolute;left:96px;right:96px;bottom:92px;z-index:3;display:flex;align-items:flex-start;gap:22px;
  background:linear-gradient(180deg,${A(NOTE,.11)},${A(NOTE,.04)});border:1px solid ${A(NOTE,.40)};border-left:6px solid ${NOTE};
  border-radius:20px;padding:28px 32px;box-shadow:0 0 46px ${A(NOTE,.12)}}
.note-k{font-family:'${F1}';font-weight:800;font-size:25px;letter-spacing:1.5px;text-transform:uppercase;color:${NOTE};white-space:nowrap;padding-top:5px}
.note-t{font-size:33px;line-height:1.32;color:#E7F8F0;font-weight:500}
.note-t .grad{-webkit-text-fill-color:${NOTE};background:none;color:${NOTE}}
/* ---- slide FONTI / link risorse citate ---- */
.srcs{display:flex;flex-direction:column;gap:32px;margin-top:6px}
.src-row{display:flex;gap:24px;align-items:flex-start}
.src-ic{flex:0 0 auto;width:56px;height:56px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,${C1},${C3});box-shadow:0 8px 24px ${A(C1,.35)}}
.src-ic svg{width:30px;height:30px}
.src-tx{display:flex;flex-direction:column;gap:5px;padding-top:1px}
.src-name{font-family:'${F1}';font-weight:800;font-size:39px;color:#EDECF4;line-height:1.1}
.src-url{font-size:31px;font-weight:500;color:${C3};line-height:1.2}
/* ---- CTA lead-magnet: keyword in grande evidenza ---- */
.cta-lead .cta{font-size:66px;margin-bottom:40px}
.kw-cta{display:inline-flex;align-items:center;gap:26px;border-radius:32px;padding:34px 46px;
  background:linear-gradient(105deg,${C1},${C2},${C3});box-shadow:0 24px 70px ${A(C2,.55)}, inset 0 1px 0 rgba(255,255,255,.25)}
.kw-cta .kc-ic{display:flex;align-items:center;justify-content:center}
.kw-cta .kc-ic svg{width:56px;height:56px}
.kw-cta .kc-lbl{font-family:'${F4}';font-weight:700;font-size:40px;color:rgba(255,255,255,.92)}
.kw-cta .kc-kw{font-family:'${F4}';font-weight:800;font-size:64px;letter-spacing:1.5px;color:#fff;line-height:1;text-shadow:0 2px 14px rgba(0,0,0,.25)}
.kw-sub{font-size:39px;color:#C8C6D6;font-weight:500;margin-top:30px}
.cta-srcs-line{font-size:27px;color:#7B7790;font-weight:500;letter-spacing:.3px;margin-top:46px}
/* firma CTA: avatar circolare + nome handwritten */
.cta-sign{display:flex;align-items:center;gap:24px;margin-top:44px}
.cta-sign img{width:92px;height:92px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.22);box-shadow:0 10px 28px ${A(C1,.35)}}
.cta-sign .sig{font-family:'${F3}','${F1}',cursive;font-weight:700;font-size:72px;line-height:.9;color:#fff}
/* fonti compatte dentro la CTA (ultima slide condensata) */
.cta-srcs{margin-top:42px}
.cta-srcs-k{font-family:'${F1}';font-weight:800;font-size:23px;letter-spacing:2.5px;text-transform:uppercase;color:#8B86A0;margin-bottom:20px}
.src-row.mini{gap:16px;margin-bottom:18px}
.src-row.mini:last-child{margin-bottom:0}
.src-row.mini .src-ic{width:42px;height:42px;border-radius:12px}
.src-row.mini .src-ic svg{width:23px;height:23px}
.src-row.mini .src-tx{gap:3px}
.src-row.mini .src-name{font-size:30px}
.src-row.mini .src-url{font-size:25px}
.shot-cap{font-size:33px;line-height:1.36;color:#8B86A0;margin-top:32px;font-weight:500}
.shot-cap .src{color:#CFCDDE;font-weight:700}
/* screenshot GRANDE che SCORRE (slide video): finestra browser ampia + articolo che scrolla */
.shot-win{position:relative;width:772px;margin:6px auto 0;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,.16);box-shadow:0 34px 90px rgba(0,0,0,.55)}
.shot-vp{position:relative;height:812px;overflow:hidden;background:#fff}
.shot-vp img{width:100%;display:block;transform:translateY(0);will-change:transform}
.canvas.go .shot-vp img{animation:scrollshot var(--sdur,5.4s) cubic-bezier(.45,0,.2,1) forwards}
@keyframes scrollshot{0%,11%{transform:translateY(0)}92%,100%{transform:translateY(calc(-100% + 812px))}}
/* ---- infografica TIMELINE ---- */
.tl{position:relative;margin-top:10px}
.tl::before{content:'';position:absolute;left:33px;top:22px;bottom:26px;width:4px;border-radius:3px;background:linear-gradient(180deg,${C1},${C2},${C3})}
.tl-row{position:relative;display:flex;gap:34px;align-items:flex-start;padding:0 0 50px 0}
.tl-row:last-child{padding-bottom:0}
.tl-dot{position:relative;z-index:1;flex:0 0 auto;width:68px;display:flex;justify-content:center;padding-top:4px}
.tl-dot i{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${C1},${C3});box-shadow:0 0 0 8px ${A(C1,.13)},0 8px 24px ${A(C1,.5)}}
.tl-row.hot .tl-dot i{width:40px;height:40px;background:linear-gradient(135deg,${C2},${C3});box-shadow:0 0 0 9px ${A(C2,.20)},0 10px 30px ${A(C2,.6)}}
.tl-date{font-family:'${F1}';font-weight:800;font-size:42px;letter-spacing:-.5px;line-height:1.05;margin-bottom:8px;color:#fff}
.tl-row.hot .tl-date{background:linear-gradient(105deg,${C2},${C3});-webkit-background-clip:text;background-clip:text;color:transparent}
.tl-label{font-size:35px;line-height:1.28;color:#B9B6C9;font-weight:500}
/* ---- infografica CONFRONTO ---- */
.cmp{display:flex;gap:26px;margin-top:8px}
.cmp-col{flex:1;border-radius:26px;border:1px solid rgba(255,255,255,.10);padding:36px 32px;background:rgba(255,255,255,.025)}
.cmp-col.hot{border-color:${A(C2,.42)};background:linear-gradient(180deg,${A(C1,.15)},${A(C3,.05)});box-shadow:0 22px 64px ${A(C1,.20)}}
.cmp-h{font-family:'${F1}';font-weight:800;font-size:40px;letter-spacing:-.5px;margin-bottom:28px;color:#EDECF4}
.cmp-col.hot .cmp-h{background:linear-gradient(105deg,${C2},${C3});-webkit-background-clip:text;background-clip:text;color:transparent}
.cmp-li{display:flex;gap:15px;font-size:33px;line-height:1.26;color:#D7D5E4;margin-bottom:22px;align-items:flex-start;font-weight:500}
.cmp-li:last-child{margin-bottom:0}
.cmp-li svg{width:30px;height:30px;flex:0 0 auto;margin-top:3px}
/* ---- animazioni (slide video, classe .anim) ---- */
@keyframes up{from{opacity:0;transform:translateY(46px)}to{opacity:1;transform:translateY(0)}}
@keyframes upL{from{opacity:0;transform:translateX(-46px)}to{opacity:1;transform:translateX(0)}}
@keyframes upR{from{opacity:0;transform:translateX(46px)}to{opacity:1;transform:translateX(0)}}
@keyframes pop{from{opacity:0;transform:scale(.66)}to{opacity:1;transform:scale(1)}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes drift{0%{transform:translate(0,0)}50%{transform:translate(-26px,20px)}100%{transform:translate(0,0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.85}50%{opacity:1}}
@keyframes nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(12px)}}
@keyframes kenburns{from{transform:scale(1.04)}to{transform:scale(1.14)}}
/* ambient CONTINUI — partono da posizione neutra (frame 0 resta completo, ok anche sulla cover) */
@keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-13px)}}
@keyframes breathe{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25) saturate(1.12)}}
@keyframes glowpulse{0%,100%{opacity:.72}50%{opacity:1}}
/* freccia "scorri" sulla cover */
.swipe{position:absolute;left:50%;bottom:50px;transform:translateX(-50%);z-index:3;display:flex;align-items:center;gap:14px;
  font-family:'${F1}';font-weight:700;font-size:29px;letter-spacing:.3px;color:#E7E6F0;
  background:rgba(18,18,28,.55);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:14px 28px;box-shadow:0 12px 40px rgba(0,0,0,.45)}
.swipe .chev{display:flex;animation:nudge 1.05s ease-in-out infinite}
.swipe .chev svg{width:30px;height:30px;display:block}
/* brand (mark + username) e numero: SEMPRE presenti dal primo frame, NON animati */
/* elementi che ENTRANO (nascosti al frame 0 → poi animati con .go) */
.anim .topic,.anim .hook,.anim .heading,.anim .body,.anim .item,.anim .statv,.anim .statl,.anim .cta,.anim .btn,.anim .window,
.anim .shot-h,.anim .shot-cap,.anim .tl-row,.anim .cmp-col,.anim .src-row,.anim .quote,.anim .attr,.anim .kw-cta,.anim .kw-sub,.anim .cta-sign,.anim .note{opacity:0}
/* --- ENTRATA (una volta, .go) --- */
.anim.go .topic{animation:up .4s both .1s}
.anim.go .hook{animation:up .5s both .2s}
.anim.go .heading{animation:up .45s both .12s}
.anim.go .shot-h{animation:up .45s both .12s}
.anim.go .body{animation:up .45s both .28s}
.anim.go .item{animation:up .42s both calc(.2s + var(--i,0) * .1s)}
.anim.go .tl-row{animation:upL .5s both calc(.18s + var(--i,0) * .12s)}
.anim.go .cmp-col{animation:up .5s both .22s}
.anim.go .cmp-col.hot{animation:upR .55s both .34s, floaty 7s ease-in-out 1.1s infinite}
.anim.go .src-row{animation:upL .45s both calc(.2s + var(--i,0) * .1s)}
.anim.go .shot-cap{animation:up .45s both .42s}
.anim.go .quote{animation:up .5s both .16s}
.anim.go .attr{animation:up .45s both .36s}
.anim.go .statl{animation:up .45s both .44s}
.anim.go .cta{animation:up .45s both .15s}
.anim.go .btn{animation:up .4s both .34s}
.anim.go .kw-sub{animation:up .45s both .5s}
.anim.go .cta-sign{animation:up .5s both .6s}
.anim.go .note{animation:up .5s both .5s}
/* entrata "pop" più dinamica per i fulcri (numero stat + chip keyword) */
.anim.go .statv{animation:pop .55s both .15s}
.anim.go .kw-cta{animation:pop .58s both .3s, breathe 2.6s ease-in-out 1.1s infinite}
/* --- AMBIENT (continui, dopo l'entrata) — danno vita anche dopo che gli elementi sono entrati --- */
.anim.go .window{animation:up .5s both .3s, floaty 6.5s ease-in-out 1s infinite}
.anim.go .wimg{animation:kenburns 8s ease-out both}
.anim.go .app-chip{animation:breathe 3.4s ease-in-out infinite}
.anim.go .tl-dot i{animation:breathe 2.9s ease-in-out infinite}
.anim.go .tl-row.hot .tl-dot i{animation:breathe 2.1s ease-in-out infinite}
.anim.go .src-ic{animation:breathe 3s ease-in-out infinite}
.anim.go .dot{animation:glowpulse 3.2s ease-in-out infinite}
/* COVER: primo frame GIÀ COMPLETO — niente entrata in dissolvenza; resta viva con zoom (kenburns) + float immagine + badge che pulsa + freccia + ambient */
.anim.is-cover .topic,.anim.is-cover .hook,.anim.is-cover .heading,.anim.is-cover .window{opacity:1}
.anim.is-cover.go .topic,.anim.is-cover.go .hook,.anim.is-cover.go .heading{animation:none}
.anim.is-cover.go .window{animation:floaty 5.6s ease-in-out infinite}
/* riflesso di luce che attraversa la cover (parte fuori campo a sx → frame 0 pulito) */
.anim.is-cover .window::after{content:'';position:absolute;inset:0;z-index:5;pointer-events:none;
  background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.16) 50%,transparent 62%);transform:translateX(-130%)}
.anim.is-cover.go .window::after{animation:shine 4.6s ease-in-out 1.1s infinite}
@keyframes shine{0%{transform:translateX(-130%)}55%,100%{transform:translateX(130%)}}
/* fiori eterei 3D (opt-in cover.flowers) — POCHI, fermi, che galleggiano dolcemente sul posto, a corredo; colori brand con glow */
.blooms{position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden;perspective:1000px}
.bloom{position:absolute;will-change:transform;transform-style:preserve-3d;opacity:.9;
  filter:drop-shadow(0 8px 20px ${A(C3,.30)}) drop-shadow(0 0 26px ${A(C2,.55)})}
.bloom svg{display:block;width:100%;height:100%}
.anim.go .bloom{animation:bloomfloat var(--d,7.5s) ease-in-out var(--dl,0s) infinite}
@keyframes bloomfloat{
  0%,100%{transform:translateY(0) rotateX(16deg) rotateY(-18deg) rotate(-3deg)}
  50%{transform:translateY(-15px) rotateX(8deg) rotateY(18deg) rotate(3deg)}}
.anim.canvas::before{animation:drift 9s ease-in-out infinite}
.anim .rings{transform-box:fill-box;transform-origin:center;animation:spin 40s linear infinite,pulse 5s ease-in-out infinite}
/* --- componenti stile "MASCOTTE" (pixel-art + sistema testo, batch 14/07): occhiello numerato, card immagine, righe icona+testo, pill-takeaway, tocchi handwritten --- */
.kick{display:inline-flex;align-items:center;gap:16px;align-self:flex-start;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.10);border-radius:999px;padding:12px 26px 12px 12px;margin-bottom:30px}
.kn{font-family:'${F1}';font-weight:800;font-size:30px;color:#fff;background:linear-gradient(135deg,${C1},${C3});border-radius:999px;min-width:52px;height:52px;padding:0 8px;display:flex;align-items:center;justify-content:center}
.kl{font-family:'${F1}';font-weight:700;font-size:30px;letter-spacing:.5px;color:#CBC8DA}
.mh{font-family:'${F1}';font-weight:800;font-size:72px;line-height:1.1;letter-spacing:0px;color:#fff}
.mbody{font-size:40px;font-weight:400;line-height:1.5;color:#B9B6C9}
.bw{color:#EFEDF7;font-weight:600}
.mcard{position:relative;border-radius:34px;overflow:hidden;box-shadow:0 22px 60px rgba(0,0,0,.5),0 0 46px ${A(C2,.16)};border:1.5px solid rgba(255,255,255,.09);flex:1 1 auto;min-height:0}
.mcard.fixed{flex:0 0 auto}
.mcard img{width:100%;height:100%;object-fit:cover;display:block}
.mrows{display:flex;flex-direction:column;gap:22px}
.mrow{display:flex;align-items:center;gap:22px}
.mric{flex:0 0 auto;width:64px;height:64px;border-radius:18px;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;font-size:34px}
.mrt{font-size:38px;font-weight:500;line-height:1.22;color:#EDECF4}
.mtk{display:flex;align-items:flex-start;gap:18px;background:linear-gradient(105deg,${A(C1,.18)},${A(C3,.12)});border:1.5px solid ${A(C2,.32)};border-radius:22px;padding:24px 32px;font-size:36px;font-weight:600;line-height:1.2;color:#fff}
.mtkic{font-size:34px;line-height:1.2;flex:0 0 auto}
.hw{font-family:'${F3}';font-weight:700;font-size:54px;color:${C3}}
.uline{display:block;height:16px;margin-top:14px}
.hand{display:flex;align-items:flex-end;gap:10px;margin-bottom:14px}
`;

// filigrana tech: brackets HUD, anelli punteggiati, crosshair, tick
function hud() {
  const cross = (x, y) => `<path d="M${x} ${y} h26 M${x + 13} ${y - 13} v26"/>`;
  const ticks = Array.from({ length: 14 }, (_, i) => `<path d="M40 ${150 + i * 70} h${i % 5 === 0 ? 26 : 14}"/>`).join('');
  return `<svg class="hud" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g stroke="rgba(255,255,255,0.14)" stroke-width="2">
      <path d="M58 116 V58 H116"/><path d="M1022 116 V58 H964"/>
      <path d="M58 1234 V1292 H116"/><path d="M1022 1234 V1292 H964"/>
    </g>
    <g class="rings" stroke="${A(C2,0.20)}" stroke-width="2" stroke-dasharray="2 13" stroke-linecap="round">
      <circle cx="1085" cy="1110" r="320"/><circle cx="1085" cy="1110" r="234"/><circle cx="1085" cy="1110" r="150"/>
    </g>
    <g stroke="${A(C3,0.20)}" stroke-width="2">${cross(150, 360)}${cross(905, 250)}${cross(120, 980)}</g>
    <g stroke="rgba(255,255,255,0.07)" stroke-width="2">${ticks}</g>
  </svg>`;
}

function brand() {
  const mark = MARK ? `<img class="mark" src="${MARK}">` : '<span class="orb"></span>';
  return `<div class="brand">${mark}<div class="uname">${esc(HANDLE)}</div></div>`;
}
const top = (n, t, logo) => `<div class="top">${brand()}<div class="top-r">${logo ? `<img class="blogo" src="${imgURI(logo)}">` : ''}${HIDE_COUNTER ? '' : `<div class="num">${String(n).padStart(2, '0')} / ${String(t).padStart(2, '0')}</div>`}</div></div>`;

// finestra brandizzata (barra dots + dominio) che incornicia un'immagine nitida — usata da screenshot e cover-mockup
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
// freccia "scorri" (invito a sfogliare) — doppio chevron animato, di default sulla cover
const SWIPE = '<div class="swipe">Scorri<span class="chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5l7 7-7 7"/><path d="M13 5l7 7-7 7"/></svg></span></div>';
// fiori eterei 3D per la cover (opt-in: cover.flowers) — POCHI e fermi, a corredo. Fiore = SVG con gradiente brand, petali sfalsati per profondità.
const BLOOM_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><radialGradient id="esp" cx="50%" cy="38%" r="66%"><stop offset="0%" stop-color="#CFF6FF"/><stop offset="40%" stop-color="${C2}"/><stop offset="100%" stop-color="${C1}"/></radialGradient><radialGradient id="esc" cx="44%" cy="40%" r="62%"><stop offset="0%" stop-color="#F2FDFF"/><stop offset="100%" stop-color="${C3}"/></radialGradient></defs></svg>`;
const BLOOM_SVG = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">`
  + [0, 72, 144, 216, 288].map((a, i) => `<g transform="rotate(${a} 50 50)"><ellipse cx="50" cy="31" rx="15.5" ry="25" fill="url(#esp)" opacity="${(0.74 + (i % 2) * 0.16).toFixed(2)}"/><ellipse cx="47" cy="22" rx="5" ry="9" fill="#EAFBFF" opacity=".5"/></g>`).join('')
  + `<circle cx="50" cy="50" r="12.5" fill="url(#esc)"/><circle cx="46" cy="46" r="4.5" fill="#F4FEFF" opacity=".95"/></svg>`;
const BLOOMS = (() => {
  // pochi (4), in punti a corredo lontani dal testo (bordo destro + basso), tempi diversi
  const conf = [{ l: 82, t: 33, s: 36, d: 7.6, dl: 0 }, { l: 8, t: 68, s: 46, d: 8.8, dl: -2.4 }, { l: 89, t: 72, s: 30, d: 6.9, dl: -1.2 }, { l: 35, t: 88, s: 25, d: 9.4, dl: -3.5 }];
  return BLOOM_DEFS + '<div class="blooms">' + conf.map((c) => `<span class="bloom" style="left:${c.l}%;top:${c.t}%;width:${c.s}px;height:${c.s}px;--d:${c.d}s;--dl:${c.dl}s">${BLOOM_SVG}</span>`).join('') + '</div>';
})();
// icona link (per slide/blocco fonti)
const LINKIC = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
const srcRows = (items = [], mini = false) => items.map((it) => `<div class="src-row${mini ? ' mini' : ''}"><div class="src-ic">${LINKIC}</div><div class="src-tx"><div class="src-name">${esc(it.name)}</div><div class="src-url">${esc(it.url)}</div></div></div>`).join('');
function windowEl(imagePath, { source, imgHeight, objectPosition, chrome = true, badge, reflect } = {}) {
  const style = `${imgHeight ? `height:${imgHeight}px;` : ''}${objectPosition ? `object-position:${esc(objectPosition)};` : ''}`;
  // chrome=false → card pulita (foto editoriale): solo immagine arrotondata, niente barra browser
  const bar = chrome
    ? `<div class="wbar"><div class="wdots"><span class="wdot" style="background:${C1}"></span><span class="wdot" style="background:${C2}"></span><span class="wdot" style="background:${C3}"></span></div>${source ? `<div class="wpill">${LOCK}${esc(source)}</div>` : '<div class="wpill"></div>'}</div>`
    : '';
  // badge = chip di vetro con logo reale (es. Slack) appoggiato sull'immagine — sempre nitido/controllato
  const chip = badge && badge.logoPath
    ? `<div class="app-chip"><img src="${imgURI(badge.logoPath)}">${badge.label ? `<span>${esc(badge.label)}</span>` : ''}</div>`
    : '';
  return `<div class="window${chrome ? '' : ' photo-card'}${reflect ? ' reflect' : ''}">${bar}<img class="wimg" src="${imgURI(imagePath)}" style="${style}">${chip}</div>`;
}

// freccia disegnata a mano (curva, accento ciano) che punta a un callout — stile yellowtech
const SC_ARROW = `<svg class="sc-arrow" viewBox="0 0 120 88" fill="none" stroke="${C3}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14 C 64 6, 104 26, 98 66"/><path d="M80 54 L99 70 L110 48"/></svg>`;
// variante "check": scende da sinistra, tocca il fondo e RISALE a destra dentro il box (testa in su) — stile disegno a mano
const SC_ARROW_CHECK = `<svg class="sc-arrow sc-arrow-check" viewBox="0 0 150 128" fill="none" stroke="${C3}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 12 C 30 60, 48 108, 70 110 C 96 112, 122 76, 140 44"/><path d="M118 46 L142 42 L134 68"/></svg>`;
function inner(s, i, total) {
  const t = top(i + 1, total, s.brandLogo);
  // foto piccola incorniciata (card editoriale, NON full-bleed) sotto il contenuto — riempie il vuoto senza invadere
  const inset = s.photoPath ? `<div class="inset">${windowEl(s.photoPath, { chrome: false, imgHeight: s.photoH || 400, objectPosition: s.objectPosition })}</div>` : '';
  switch (s.type) {
    case 'cover': {
      if (s.hookImagePath) return { full: true, html: `<img class="full" src="${imgURI(s.hookImagePath)}">` };
      const swipe = s.swipe === false ? '' : SWIPE;
      const topic = s.topicLabel ? `<div class="topic">${esc(s.topicLabel)}</div>` : '';
      const hook = `<div class="hook${s.titleFx === 'shadow' ? ' tfx-shadow' : ''}"${s.hookStyle ? ` style="${esc(s.hookStyle)}"` : ''}>${hlEsc(s.hookText)}</div>`;
      const subhead = s.subhead ? `<div class="cover-sub"${s.subheadStyle ? ` style="${esc(s.subheadStyle)}"` : ''}>${hlEsc(s.subhead)}</div>` : '';
      // OVERLAY trasparente: solo scrim + chrome + titolo (per montaggio su un video di sfondo, es. cover animata Kling) — nessuna immagine
      if (s.bgOverlay) {
        return { html: `<div class="cover-scrim top"></div><div class="pad has-bg bg-top">${t}<div class="story-gap"></div>${topic}${hook}${subhead}<div class="spacer"></div></div>${swipe}` };
      }
      // cover MOCKUP: hook in alto + immagine NITIDA incorniciata in una finestra (non oscurata)
      if (s.frameImagePath) {
        const win = windowEl(s.frameImagePath, { source: s.source, imgHeight: s.imgHeight || 624, objectPosition: s.objectPosition || 'top center', chrome: s.chrome !== false, badge: s.appBadge, reflect: s.reflect });
        const petals = s.flowers ? BLOOMS : '';
        return { html: `<div class="pad cover-mock">${t}<div class="spacer"></div>${topic}${hook}${subhead}${win}<div class="spacer"></div></div>${petals}${swipe}` };
      }
      // cover SFONDO: immagine full-bleed + scrim + hook (in basso, o in ALTO con textPos:"top" — es. personaggio sotto, cielo sopra)
      if (s.bgImagePath) {
        const op = s.objectPosition ? ` style="object-position:${esc(s.objectPosition)}"` : '';
        const tp = s.textPos === 'top';
        const scrim = (tp ? '<div class="cover-scrim top"></div>' : '<div class="cover-scrim"></div>') + (s.textFade ? '<div class="cover-fade-bottom"></div>' : '');
        // opzionali stile "mascotte": sottolineatura acid sotto il titolo + nota handwritten "ecco come" con freccia
        const uline = s.underline ? `<svg class="uline" width="300" viewBox="0 0 300 16" fill="none"><path d="M6 10 C 90 3, 210 3, 294 8" stroke="${HL}" stroke-width="7" stroke-linecap="round"/></svg>` : '';
        const handEl = s.hand ? `<div class="hand"><span class="hw">${esc(s.hand)}</span><svg width="120" height="88" viewBox="0 0 120 88" fill="none" stroke="${C3}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(70deg) scaleY(-1)"><path d="M12 14 C 64 6, 104 26, 98 66"/><path d="M80 54 L99 70 L110 48"/></svg></div>` : '';
        const body = tp ? `${t}<div class="story-gap"></div>${topic}${hook}${uline}${subhead}<div class="spacer"></div>${handEl}` : `${t}<div class="spacer"></div>${topic}${hook}${uline}`;
        return { html: `<img class="cover-bg${s.spin ? ' spin' : ''}" src="${imgURI(s.bgImagePath)}"${op}>${scrim}<div class="pad has-bg${tp ? ' bg-top' : ''}">${body}</div>${swipe}` };
      }
      // cover TIPOGRAFICA: hook centrato
      return { html: `<div class="pad">${t}<div class="spacer"></div>${topic}${hook}${subhead}<div class="spacer"></div></div>${swipe}` };
    }
    case 'story': {
      // racconto: titolo+body (con highlight ** e ==) + immagine reale SCONTORNATA in un angolo + callout con freccia a mano
      const cut = s.cutoutPath ? `<img class="cutout cut-${s.cutoutPos || 'right'}" src="${imgURI(s.cutoutPath)}"${s.cutoutH ? ` style="height:${s.cutoutH}px"` : ''}>` : '';
      const scArrowBase = s.arrowVariant === 'check' ? SC_ARROW_CHECK : SC_ARROW;
      const scArrow = s.arrowStyle ? scArrowBase.replace('<svg ', `<svg style="${esc(s.arrowStyle)}" `) : scArrowBase;
      const callout = s.callout ? `<div class="story-callout"${s.calloutStyle ? ` style="${esc(s.calloutStyle)}"` : ''}>${scArrow}<div class="sc-box">${hlEsc(s.callout)}</div></div>` : '';
      // elemento/immagine (es. sticker comic) posizionato a lato — blend screen: fondo nero dell'immagine sparisce
      const obj = s.objectPath ? `<img class="story-obj obj-${s.objectPos || 'right'}" src="${imgURI(s.objectPath)}"${s.objectH ? ` style="height:${s.objectH}px"` : ''}>` : '';
      // byline autore (miniatura foto + nome) per le slide-OPINIONE → firma il punto di vista
      const author = s.authorAvatar ? `<div class="story-author"><img src="${imgURI(s.authorAvatar)}"><div class="sa-txt"><div class="sa-name">${esc(s.authorName || BRAND.authorName || HANDLE)}</div>${s.authorRole ? `<div class="sa-role">${esc(s.authorRole)}</div>` : ''}</div></div>` : '';
      const topic = (s.topicLabel && !s.authorAvatar) ? `<div class="bg-topic">${esc(s.topicLabel)}</div>` : '';
      const heading = s.heading ? `<div class="heading">${hlEsc(s.heading)}</div>` : '';
      const body = s.body ? `<div class="body">${hlEsc(s.body)}</div>` : '';
      // testo TOP-allineato (stile yellowtech): occhiello/byline + titolo + corpo ricco in alto, visual sotto/lato
      const sideCls = (s.cutoutPath || s.objectPath) ? ' has-side' : '';
      return { html: `<div class="pad story${sideCls}">${t}<div class="story-gap"></div>${author}${topic}${heading}${body}${inset}</div>${cut}${obj}${callout}` };
    }
    case 'screenshot':
    case 'media': {
      const cap = s.caption ? `<div class="shot-cap">${hlEsc(s.caption)}</div>` : '';
      const head = s.heading ? `<div class="shot-h">${hlEsc(s.heading)}</div>` : '';
      // scroll:true → screenshot GRANDE che scorre (richiede video:true e immagine ALTA)
      if (s.scroll) {
        const dur = ((s.videoMs || 5400) / 1000);
        const bar = `<div class="wbar"><div class="wdots"><span class="wdot" style="background:${C1}"></span><span class="wdot" style="background:${C2}"></span><span class="wdot" style="background:${C3}"></span></div>${s.source ? `<div class="wpill">${LOCK}${esc(s.source)}</div>` : '<div class="wpill"></div>'}</div>`;
        const win = `<div class="shot-win">${bar}<div class="shot-vp"><img src="${imgURI(s.imagePath)}" style="--sdur:${dur}s"></div></div>`;
        return { html: `<div class="pad">${t}<div class="story-gap" style="height:24px"></div>${head}${win}${cap}</div>` };
      }
      const win = windowEl(s.imagePath, { source: s.source, imgHeight: s.imgHeight, objectPosition: s.objectPosition, chrome: s.chrome !== false, badge: s.appBadge });
      // stacco minimo sotto la barra dell'handle: senza, con immagine e didascalia alte lo spacer si azzera e il titolo resta incollato
      return { html: `<div class="pad">${t}<div class="story-gap" style="height:44px"></div><div class="spacer"></div>${head}${win}${cap}<div class="spacer"></div></div>` };
    }
    case 'timeline': {
      const rows = (s.items || []).map((it) => `<div class="tl-row${it.highlight ? ' hot' : ''}"><div class="tl-dot"><i></i></div><div class="tl-txt"><div class="tl-date">${hlEsc(it.date)}</div><div class="tl-label">${hlEsc(it.label)}</div></div></div>`).join('');
      return { html: `<div class="pad">${t}<div class="spacer"></div>${s.heading ? `<div class="heading">${hlEsc(s.heading)}</div>` : ''}<div class="tl">${rows}</div><div class="spacer"></div></div>` };
    }
    case 'compare': {
      const CHK = `<svg viewBox="0 0 24 24" fill="none" stroke="${C3}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
      const DASH = '<svg viewBox="0 0 24 24" fill="none" stroke="#6b6880" stroke-width="3" stroke-linecap="round"><path d="M5 12h14"/></svg>';
      const col = (c, hot) => `<div class="cmp-col${hot ? ' hot' : ''}"><div class="cmp-h">${hlEsc(c.title || '')}</div>${(c.items || []).map((it) => `<div class="cmp-li">${hot ? CHK : DASH}<div>${hlEsc(it)}</div></div>`).join('')}</div>`;
      return { html: `<div class="pad">${t}<div class="spacer"></div>${s.heading ? `<div class="heading">${hlEsc(s.heading)}</div>` : ''}<div class="cmp">${col(s.left || {}, false)}${col(s.right || {}, true)}</div><div class="spacer"></div></div>` };
    }
    case 'sources':
      return { html: `<div class="pad">${t}<div class="spacer"></div>${s.heading ? `<div class="heading">${hlEsc(s.heading)}</div>` : ''}<div class="srcs">${srcRows(s.items)}</div><div class="spacer"></div></div>` };
    case 'content': {
      const cItems = (s.items || []).map((it, k) => `<div class="item" style="--i:${k}"><div class="dot">✓</div><div>${hlEsc(it)}</div></div>`).join('');
      return { html: `<div class="pad">${t}<div class="spacer"></div>${s.heading ? `<div class="heading">${hlEsc(s.heading)}</div>` : ''}${s.body ? `<div class="body">${hlEsc(s.body)}</div>` : ''}${cItems ? `<div class="list">${cItems}</div>` : ''}<div class="spacer"></div></div>` };
    }
    case 'checklist': {
      const items = (s.items || []).map((it, k) => `<div class="item" style="--i:${k}"><div class="dot ${s.variant === 'x' ? 'x' : ''}">${s.variant === 'x' ? '✕' : '✓'}</div><div>${hlEsc(it)}</div></div>`).join('');
      return { html: `<div class="pad">${t}<div class="spacer"></div>${s.heading ? `<div class="heading">${hlEsc(s.heading)}</div>` : ''}<div class="list">${items}</div>${inset}<div class="spacer"></div></div>` };
    }
    case 'steps': {
      // come 'checklist' ma il pallino contiene il NUMERO del passo (how-to passo-passo)
      const items = (s.items || []).map((it, k) => `<div class="item" style="--i:${k}"><div class="dot num">${k + 1}</div><div>${hlEsc(it)}</div></div>`).join('');
      return { html: `<div class="pad">${t}<div class="spacer"></div>${s.heading ? `<div class="heading">${hlEsc(s.heading)}</div>` : ''}<div class="list steps">${items}</div><div class="spacer"></div></div>` };
    }
    case 'stat':
      return { html: `<div class="pad">${t}<div class="spacer"></div><div class="statv grad">${esc(s.value)}</div><div class="statl">${hlEsc(s.label || '')}</div><div class="spacer"></div></div>` };
    case 'quote':
      return { html: `<div class="pad">${t}<div class="spacer"></div><div class="quote"><span class="mark grad">"</span>${hlEsc(s.quoteText)}</div>${s.attribution ? `<div class="attr">${esc(s.attribution)}</div>` : ''}<div class="spacer"></div></div>` };
    case 'cta': {
      // CTA lead-magnet: keyword in grande evidenza (chip a gradiente luminoso)
      if (s.ctaKeyword) {
        const ic = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
        const sub = s.ctaReward ? `<div class="kw-sub">${hlEsc(s.ctaReward)}</div>` : '';
        const fonti = (s.sources && s.sources.length) ? `<div class="cta-srcs-line">Fonti: ${s.sources.map((x) => esc(String(x.url).split('/')[0])).join('   ·   ')}</div>` : '';
        const chip = `<div class="kw-cta"><span class="kc-ic">${ic}</span><span class="kc-lbl">${esc(s.ctaAction || 'Commenta')}</span><span class="kc-kw">${esc(s.ctaKeyword)}</span></div>`;
        // firma: avatar circolare + nome handwritten (se forniti), altrimenti @handle
        const sign = (s.avatarPath || s.signName)
          ? `<div class="cta-sign">${s.avatarPath ? `<img src="${imgURI(s.avatarPath)}">` : ''}<span class="sig">${esc(s.signName || HANDLE)}</span></div>`
          : `<div class="cta-handle">@${esc(HANDLE)}</div>`;
        return { html: `<div class="pad cta-lead">${t}<div class="spacer"></div><div class="cta">${hlEsc(s.ctaText)}</div>${chip}${sub}${fonti}${sign}<div class="spacer"></div></div>` };
      }
      const srcs = (s.sources && s.sources.length) ? `<div class="cta-srcs"><div class="cta-srcs-k">Fonti</div>${srcRows(s.sources, true)}</div>` : '';
      return { html: `<div class="pad">${t}<div class="spacer"></div><div class="cta">${hlEsc(s.ctaText)}</div><div><span class="btn">${esc(s.ctaSubtext || 'Salva il post')}</span></div>${srcs}<div class="cta-handle">@${esc(HANDLE)}</div><div class="spacer"></div></div>` };
    }
    case 'mascot': {
      // slide stile "mascotte" (pixel-art + sistema testo): occhiello numerato + titolo accento + card immagine che riempie + righe icona+testo + pill-takeaway
      const knChip = (s.kickN != null && s.kickN !== '') ? `<span class="kn">${esc(String(s.kickN))}</span>` : '';
      const kick = (s.kickLabel || knChip) ? `<div class="kick"${knChip ? '' : ' style="padding-left:28px"'}>${knChip}<span class="kl">${esc(s.kickLabel || '')}</span></div>` : '';
      const heading = s.heading ? `<div class="mh" style="margin-bottom:${s.body ? (s.headingGap || 26) : (s.headingGap || 44)}px${s.headingStyle ? ';' + esc(s.headingStyle) : ''}">${hlEsc(s.heading)}</div>` : '';
      const mbody = s.body ? `<div class="mbody" style="margin-bottom:34px">${hlEsc(s.body)}</div>` : '';
      const card = s.imagePath ? `<div class="mcard${s.imgH ? ' fixed' : ''}"${s.imgH ? ` style="height:${s.imgH}px"` : ''}><img src="${imgURI(s.imagePath)}"${s.imgObjPos ? ` style="object-position:${esc(s.imgObjPos)}"` : ''}></div>` : '';
      const rows = (s.rows && s.rows.length) ? `<div class="mrows" style="margin-top:30px">${s.rows.map((r) => `<div class="mrow"><span class="mric">${esc(r.icon || '•')}</span><span class="mrt">${hlEsc(r.text || '')}</span></div>`).join('')}</div>` : '';
      const tk = s.takeaway ? `<div style="margin-top:${(s.rows && s.rows.length) ? 24 : 28}px"><div class="mtk"><span class="mtkic">${esc(s.takeawayIcon || '💡')}</span><span>${hlEsc(s.takeaway)}</span></div></div>` : '';
      return { html: `<div class="pad">${t}<div style="height:40px"></div>${kick}${heading}${mbody}${card}${rows}${tk}</div>` };
    }
    default:
      return { html: `<div class="pad">${t}<div class="body">Tipo sconosciuto: ${esc(s.type)}</div></div>` };
  }
}
function slideHTML(s, i, total, anim) {
  // FULL-BLEED: immagine a tutto schermo + testo bold sovrapposto in basso (stile news). Vale per qualsiasi slide non-cover con bgImagePath.
  if (s.bgImagePath && s.type !== 'cover') {
    const topic = s.topicLabel ? `<div class="bg-topic">${esc(s.topicLabel)}</div>` : '';
    const heading = s.heading ? `<div class="bgh">${hlEsc(s.heading)}</div>` : '';
    const body = s.body ? `<div class="bgb">${hlEsc(s.body)}</div>` : '';
    const items = (s.items && s.items.length) ? `<div class="bglist">${s.items.map((it) => `<div class="bgli"><span class="bgdot"></span><div>${hlEsc(it)}</div></div>`).join('')}</div>` : '';
    const op = s.objectPosition ? ` style="object-position:${esc(s.objectPosition)}"` : '';
    const tp = s.textPos === 'top';   // testo in ALTO (stile yellowtech) invece che in basso
    const content = `${topic}${heading}${body}${items}`;
    const padInner = tp ? `${top(i + 1, total, s.brandLogo)}<div class="story-gap"></div>${content}` : `${top(i + 1, total, s.brandLogo)}<div class="spacer"></div>${content}`;
    const dim = s.imgDim ? `<div class="img-dim" style="background:rgba(6,6,12,${s.imgDim})"></div>` : '';
    return `<div class="canvas${anim ? ' anim' : ''} is-bg${tp ? ' bg-top' : ''}"><img class="cover-bg" src="${imgURI(s.bgImagePath)}"${op}>${dim}<div class="cover-scrim strong"></div><div class="pad has-bg bg-pad">${padInner}</div></div>`;
  }
  const { html, full } = inner(s, i, total);
  // box verde informativo opzionale (campo "note"), ancorato in basso — non sulle cover full-bleed
  const note = (!full && s.note) ? `<div class="note"><span class="note-k">${esc(s.noteLabel || 'Dettaglio')}</span><div class="note-t">${hlEsc(s.note)}</div></div>` : '';
  const coverCls = s.type === 'cover' ? ' is-cover' : '';
  // texture opzionale PER SLIDE (s.tex:true) → non su tutte, così le slide variano
  const texSrc = s.texture ? imgURI(s.texture) : (s.tex ? TEX : '');
  const tex = (texSrc && !full && s.type !== 'cover') ? `<img class="bgtex" src="${texSrc}">` : '';
  // elemento comic/sticker su QUALSIASI slide (story lo gestisce già nel suo case)
  const objSt = `${s.objectH ? `height:${s.objectH}px;` : ''}${s.objectStyle || ''}`;
  const obj = (s.objectPath && !full && s.type !== 'cover' && s.type !== 'story') ? `<img class="story-obj obj-${s.objectPos || 'right'}" src="${imgURI(s.objectPath)}"${objSt ? ` style="${objSt}"` : ''}>` : '';
  const darkCls = s.darkBg ? ' dark-bg' : '';
  const transpCls = s.overlay ? ' transp' : '';
  return `<div class="canvas${anim ? ' anim' : ''}${coverCls}${darkCls}${transpCls}">${tex}${full ? '' : hud()}${html}${note}${obj}</div>`;
}
const pageDoc = (body) => `<!doctype html><html style="background:${BG}"><head><meta charset="utf-8"><style>${FONTS}</style><style>html,body{background:${BG}}${CSS}</style></head><body style="margin:0;background:${BG}">${body}</body></html>`;
// pageDoc TRASPARENTE: per renderizzare solo il chrome/titolo della cover come PNG con alpha (overlay su video Kling)
const pageDocT = (body) => `<!doctype html><html style="background:transparent"><head><meta charset="utf-8"><style>${FONTS}</style><style>html,body{background:transparent}${CSS}</style></head><body style="margin:0;background:transparent">${body}</body></html>`;

const browser = await chromium.launch();
const total = slides.length;
const tmp = path.join(outDir, '_tmp');
let nImg = 0, nVid = 0;
for (let i = 0; i < total; i++) {
  const s = slides[i];
  const base = `slide-${String(i + 1).padStart(2, '0')}`;
  // OVERLAY: PNG trasparente del solo chrome/titolo (da montare su un video di sfondo, es. cover animata Kling)
  if (s.overlay) {
    const octx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    const opg = await octx.newPage();
    await opg.setContent(pageDocT(slideHTML(s, i, total, false)), { waitUntil: 'networkidle' });
    await opg.evaluate(() => document.fonts.ready);
    await opg.screenshot({ path: path.join(outDir, `${base}.png`), omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
    await octx.close();
    nImg++;
    console.log('🔲', `${base}.png (overlay)`);
    continue;
  }
  // animateAll (top-level) → ogni slide è un video animato; il singolo `video:true` resta valido
  if (s.video || data.animateAll) {
    // SLIDE VIDEO: registra l'animazione e converte in MP4
    fs.mkdirSync(tmp, { recursive: true });
    const vctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: tmp, size: { width: W, height: H } } });
    const vp = await vctx.newPage();
    await vp.setContent(pageDoc(slideHTML(s, i, total, true)), { waitUntil: 'networkidle' });
    await vp.evaluate(() => document.fonts.ready);
    await vp.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); // 2 frame dipinti
    const HOLD = 0.8;                                              // s di frame scuro statico prima dell'animazione
    await vp.waitForTimeout(HOLD * 1000);                         // assesta frame scuro (no bianco)
    await vp.evaluate(() => document.querySelector('.canvas').classList.add('go')); // via l'animazione
    const dur = (s.videoMs || (s.type === 'cover' ? 7000 : 4500));
    await vp.waitForTimeout(dur + 500);
    const webm = await vp.video().path();
    await vp.close();
    await vctx.close();
    const mp4 = path.join(outDir, `${base}.mp4`);
    // -ss DOPO -i = seek PRECISO (decodifica e scarta i frame bianchi di about:blank, non salta al keyframe);
    // parte esattamente all'inizio dell'animazione (HOLD); -t cappa la durata netta
    // minterpolate=60fps (motion-compensated) → animazione FLUIDA: interpola dai frame reali del webm (Playwright cattura <30fps distinti → senza interpolazione il movimento è scattoso)
    // minterpolate=60fps (fluido) + trim dei primi 2 frame (l'interpolazione crea un frame di CONFINE bianco al seek → via, così il frame 0/copertina-feed è scuro e completo)
    execFileSync('ffmpeg', ['-y', '-i', webm, '-ss', String(HOLD), '-t', String(dur / 1000 + 0.1), '-vf', 'scale=1080:1350:flags=lanczos,minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,trim=start_frame=2,setpts=PTS-STARTPTS,format=yuv420p', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart', mp4], { stdio: 'ignore' });
    nVid++;
    console.log('🎬', `${base}.mp4`);
  } else {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    const pg = await ctx.newPage();
    await pg.setContent(pageDoc(slideHTML(s, i, total, false)), { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(outDir, `${base}.png`), clip: { x: 0, y: 0, width: W, height: H } });
    await ctx.close();
    nImg++;
    console.log('✓', `${base}.png`);
  }
}
if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
await browser.close();
console.log(`\nFatto: ${nImg} PNG + ${nVid} MP4 in ${outDir}`);
